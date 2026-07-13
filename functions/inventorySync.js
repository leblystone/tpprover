const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
require('dotenv').config();

const { getMarketplaceTokens, refreshTokenIfNeeded } = require('./marketplaceTokens');

async function etsyClientId() {
  const fromEnv = (process.env.ETSY_CLIENT_ID || '').trim();
  if (fromEnv) return fromEnv;
  // Fallback: read from Firestore (saved via Admin → Marketplaces → API Credentials)
  const snap = await admin.firestore().doc('_config/marketplaceAppCredentials').get();
  return (snap.exists && snap.data()?.etsy?.clientId) ? snap.data().etsy.clientId.trim() : '';
}

async function etsyApiGet(url, token) {
  const apiKey = await etsyClientId();
  const resp = await fetch(url, {
    headers: {
      'x-api-key': apiKey,
      Authorization: `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await resp.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!resp.ok) {
    const err = new Error(data.error || data.message || `Etsy API ${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  return data;
}

/** Etsy webhooks send resource_url; older payloads may include transactions inline. */
async function resolveEtsyOrderPayload(payload) {
  const inlineTx = payload.transactions || payload.Transactions || [];
  if (inlineTx.length) {
    return {
      receiptId: payload.receipt_id || payload.id,
      transactions: inlineTx,
      eventType: payload.event_type || 'legacy',
    };
  }

  if (!payload.resource_url) {
    return { receiptId: null, transactions: [], eventType: payload.event_type || null };
  }

  const tokens = await getMarketplaceTokens();
  const token = await refreshTokenIfNeeded('etsy') || tokens.etsy;
  if (!token?.accessToken) {
    throw new Error('Etsy shop not connected — connect in Admin → Marketplaces first');
  }

  const receiptUrl = String(payload.resource_url).trim();
  const receipt = await etsyApiGet(receiptUrl, token);
  const receiptId =
    receipt.receipt_id
    || (receiptUrl.match(/\/receipts\/(\d+)/)?.[1])
    || null;

  let transactions = receipt.transactions;
  if (!Array.isArray(transactions) || !transactions.length) {
    const txData = await etsyApiGet(`${receiptUrl.replace(/\/$/, '')}/transactions`, token);
    transactions = txData.results || txData.transactions || [];
  }

  return {
    receiptId: receiptId || receipt.receipt_id,
    transactions,
    eventType: payload.event_type || null,
  };
}
const {
  updateEtsyListingStock,
  updateTikTokProductStock,
} = require('./marketplaces');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function decrementStock(productId, qty = 1) {
  const db = admin.firestore();
  return db.runTransaction(async (t) => {
    const ref = db.collection('shopProducts').doc(productId);
    const doc = await t.get(ref);
    if (!doc.exists) throw new Error(`Product ${productId} not found`);
    const current = doc.data().stock || 0;
    const newStock = current - qty;
    if (newStock < 0) throw new Error(`Insufficient stock for ${productId}: have ${current}, need ${qty}`);
    t.update(ref, { stock: newStock, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return newStock;
  });
}

async function decrementStockByPriceId(priceId, qty = 1) {
  const db = admin.firestore();
  const snap = await db.collection('shopProducts').where('stripePriceId', '==', priceId).limit(1).get();
  if (snap.empty) {
    logger.warn(`No product found for priceId: ${priceId}`);
    return null;
  }
  const productDoc = snap.docs[0];
  return { productId: productDoc.id, newStock: await decrementStock(productDoc.id, qty) };
}

async function syncStockToAllPlatforms(productId) {
  const db = admin.firestore();
  const doc = await db.collection('shopProducts').doc(productId).get();
  if (!doc.exists) return;
  const product = doc.data();
  const stock = product.stock || 0;
  const platformIds = product.platformIds || {};
  const tokens = await getMarketplaceTokens();

  if (platformIds.etsy && tokens.etsy?.accessToken) {
    try {
      const etsyToken = await refreshTokenIfNeeded('etsy');
      await updateEtsyListingStock(String(platformIds.etsy), stock, etsyToken || tokens.etsy);
      logger.info(`Synced stock to Etsy listing ${platformIds.etsy}: ${stock}`);
    } catch (err) {
      logger.error(`Failed to sync to Etsy for ${productId}:`, err);
    }
  } else if (platformIds.etsy) {
    logger.warn(`Skipping Etsy sync for ${productId}: listing ${platformIds.etsy} set but shop not connected`);
  }

  if (platformIds.tiktok && tokens.tiktok?.accessToken) {
    try {
      const tiktokToken = await refreshTokenIfNeeded('tiktok');
      await updateTikTokProductStock(String(platformIds.tiktok), stock, tiktokToken || tokens.tiktok);
      logger.info(`Synced stock to TikTok product ${platformIds.tiktok}: ${stock}`);
    } catch (err) {
      logger.error(`Failed to sync to TikTok:`, err);
    }
  }
}

// ---------------------------------------------------------------------------
// HTTP Endpoints — Marketplace Order Webhooks
// ---------------------------------------------------------------------------

exports.etsyOrderWebhook = onRequest({ cors: false }, async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // TODO: verify Etsy HMAC webhook signature (webhook-id, webhook-timestamp, webhook-signature)
    const payload = req.body || {};
    logger.info('Received Etsy order webhook', {
      event_type: payload.event_type,
      shop_id: payload.shop_id,
    });

    const eventType = payload.event_type || '';
    if (eventType === 'order.canceled') {
      logger.info('Etsy order.canceled received — stock restore not implemented yet');
      res.status(200).json({ ok: true, message: 'Cancel acknowledged' });
      return;
    }

    // Detect Etsy test payloads (shop_id: 42 is always used in webhook portal tests)
    const shopId = payload.shop_id;
    const resourceUrl = payload.resource_url || '';
    const isTestPayload =
      shopId === 42 ||
      resourceUrl.includes('/shops/12345/') ||
      resourceUrl.includes('/receipts/54321');
    if (isTestPayload) {
      logger.info('Etsy test webhook received — acknowledging without processing');
      res.status(200).json({ ok: true, message: 'Test webhook acknowledged' });
      return;
    }

    const { receiptId, transactions } = await resolveEtsyOrderPayload(payload);

    if (!transactions.length) {
      logger.warn('Etsy webhook had no transactions to process', { receiptId, eventType });
      res.status(200).json({ ok: true, message: 'No transactions' });
      return;
    }

    const db = admin.firestore();
    const results = [];

    for (const txn of transactions) {
      const etsyListingId = String(txn.listing_id);
      const qty = txn.quantity || 1;

      const snap = await db.collection('shopProducts')
        .where('platformIds.etsy', '==', etsyListingId)
        .limit(1)
        .get();

      if (snap.empty) {
        logger.warn(`No shopProduct found for Etsy listing ${etsyListingId}`);
        results.push({ etsyListingId, status: 'not_found' });
        continue;
      }

      const productDoc = snap.docs[0];
      try {
        const newStock = await decrementStock(productDoc.id, qty);
        await syncStockToAllPlatforms(productDoc.id);
        results.push({ etsyListingId, productId: productDoc.id, newStock, status: 'decremented' });
      } catch (err) {
        logger.error(`Failed to decrement stock for Etsy listing ${etsyListingId}:`, err);
        results.push({ etsyListingId, productId: productDoc.id, status: 'error', error: err.message });
      }
    }

    await db.collection('physicalOrders').add({
      source: 'etsy',
      externalOrderId: String(receiptId),
      payload,
      results,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Etsy order ${receiptId} processed`, { results });
    res.status(200).json({ ok: true, results });
  } catch (err) {
    logger.error('etsyOrderWebhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

exports.tiktokOrderWebhook = onRequest({ cors: false }, async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // TODO: verify TikTok webhook signature
    const payload = req.body;
    logger.info('Received TikTok order webhook', { payload });

    const orderId = payload.order_id || payload.data?.order_id;
    const items = payload.item_list || payload.data?.item_list || [];

    if (!items.length) {
      logger.warn('TikTok webhook had no items to process');
      res.status(200).json({ ok: true, message: 'No items' });
      return;
    }

    const db = admin.firestore();
    const results = [];

    for (const item of items) {
      const tiktokProductId = String(item.product_id || item.id);
      const qty = item.quantity || 1;

      const snap = await db.collection('shopProducts')
        .where('platformIds.tiktok', '==', tiktokProductId)
        .limit(1)
        .get();

      if (snap.empty) {
        logger.warn(`No shopProduct found for TikTok product ${tiktokProductId}`);
        results.push({ tiktokProductId, status: 'not_found' });
        continue;
      }

      const productDoc = snap.docs[0];
      try {
        const newStock = await decrementStock(productDoc.id, qty);
        await syncStockToAllPlatforms(productDoc.id);
        results.push({ tiktokProductId, productId: productDoc.id, newStock, status: 'decremented' });
      } catch (err) {
        logger.error(`Failed to decrement stock for TikTok product ${tiktokProductId}:`, err);
        results.push({ tiktokProductId, productId: productDoc.id, status: 'error', error: err.message });
      }
    }

    await db.collection('physicalOrders').add({
      source: 'tiktok',
      externalOrderId: String(orderId),
      payload,
      results,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`TikTok order ${orderId} processed`, { results });
    res.status(200).json({ ok: true, results });
  } catch (err) {
    logger.error('tiktokOrderWebhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Firestore Trigger — Stock Change Detection
// ---------------------------------------------------------------------------

exports.onStockUpdated = onDocumentUpdated('shopProducts/{productId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const productId = event.params.productId;

  const oldStock = before.stock ?? 0;
  const newStock = after.stock ?? 0;

  if (oldStock === newStock) return;

  logger.info(`Stock changed for ${productId}: ${oldStock} → ${newStock}`);

  try {
    await syncStockToAllPlatforms(productId);
  } catch (err) {
    logger.error(`Failed to sync platforms after stock change for ${productId}:`, err);
  }

  const restockThreshold = after.restockThreshold || 5;
  if (newStock <= restockThreshold) {
    const adminEmail = process.env.PLANNER_ORDER_NOTIFICATION_EMAIL || 'lebrockmaldonado@gmail.com';
    const emailService = require('./emailService');
    try {
      await emailService.sendEmailWithQueue(
        adminEmail,
        `⚠️ Low Stock Alert: ${after.name || productId}`,
        `<h2>Low Stock Alert</h2>
         <p>Product <strong>${after.name || productId}</strong> is running low.</p>
         <ul>
           <li>Current stock: <strong>${newStock}</strong></li>
           <li>Restock threshold: <strong>${restockThreshold}</strong></li>
         </ul>
         <p>Please reorder soon.</p>`,
        { priority: 'high', type: 'restockAlert' }
      );
      logger.info(`Restock alert sent for ${productId} (stock: ${newStock})`);
    } catch (err) {
      logger.error(`Failed to send restock alert for ${productId}:`, err);
    }
  }

  const notifyMeAdmin = require('./notifyMeAdmin');
  if (oldStock <= 0 && newStock > 0) {
    try {
      const db = admin.firestore();
      await notifyMeAdmin.sendNotifyMeAlertsForProduct(db, productId, { sentBy: 'auto-restock' });
    } catch (err) {
      logger.error(`Failed to process notify-me restock alerts for ${productId}:`, err);
    }
  }
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

exports.decrementStock = decrementStock;
exports.decrementStockByPriceId = decrementStockByPriceId;
exports.syncStockToAllPlatforms = syncStockToAllPlatforms;
