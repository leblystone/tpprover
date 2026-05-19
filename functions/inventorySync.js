const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
require('dotenv').config();

const { getMarketplaceTokens, refreshTokenIfNeeded } = require('./marketplaceTokens');
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
      logger.error(`Failed to sync to Etsy:`, err);
    }
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

    // TODO: verify Etsy HMAC webhook signature
    const payload = req.body;
    logger.info('Received Etsy order webhook', { payload });

    const receiptId = payload.receipt_id || payload.id;
    const transactions = payload.transactions || payload.Transactions || [];

    if (!transactions.length) {
      logger.warn('Etsy webhook had no transactions to process');
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

  if (newStock < oldStock) {
    try {
      await syncStockToAllPlatforms(productId);
    } catch (err) {
      logger.error(`Failed to sync platforms after stock decrease for ${productId}:`, err);
    }
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

  const notifyThreshold = 3;
  if (newStock <= notifyThreshold && newStock > 0) {
    const db = admin.firestore();
    try {
      const requests = await db.collection('notifyMeRequests')
        .where('productId', '==', productId)
        .get();

      if (!requests.empty) {
        const emailService = require('./emailService');
        const batch = db.batch();

        for (const reqDoc of requests.docs) {
          const reqData = reqDoc.data();
          if (reqData.email) {
            await emailService.sendEmailWithQueue(
              reqData.email,
              `🔔 "${after.name || productId}" is almost gone!`,
              `<h2>Heads Up!</h2>
               <p>The product <strong>${after.name || productId}</strong> you wanted to be notified about only has <strong>${newStock}</strong> left in stock.</p>
               <p>Grab yours before it's gone!</p>`,
              { priority: 'normal', type: 'notifyMeAlert' }
            );
          }
          batch.delete(reqDoc.ref);
        }

        await batch.commit();
        logger.info(`Sent ${requests.size} notify-me alerts and cleaned up requests for ${productId}`);
      }
    } catch (err) {
      logger.error(`Failed to process notify-me requests for ${productId}:`, err);
    }
  }
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

exports.decrementStock = decrementStock;
exports.decrementStockByPriceId = decrementStockByPriceId;
exports.syncStockToAllPlatforms = syncStockToAllPlatforms;
