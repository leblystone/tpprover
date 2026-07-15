const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
require('dotenv').config();

const { activityEntry, appendOrderActivity } = require('./orderActivity');

const ADMIN_EMAILS = [
  'lebrockmaldonado@gmail.com',
  'contact@thepepplanner.com',
  'thepepplanner@gmail.com',
];

function requireAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const email = (request.auth.token.email || '').toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) throw new HttpsError('permission-denied', 'Admin access required');
  return email;
}

const { getShopStripe } = require('./stripeShopKey');

function normalizePaymentIntentId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.id === 'string') return value.id;
  return null;
}

async function getOrder(orderId) {
  if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required');
  const db = admin.firestore();
  const ref = db.collection('physicalOrders').doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Order not found');
  return { ref, data: snap.data() };
}

async function incrementStock(productId, qty = 1) {
  const db = admin.firestore();
  await db.runTransaction(async (t) => {
    const ref = db.collection('shopProducts').doc(productId);
    const doc = await t.get(ref);
    if (!doc.exists) return;
    const current = doc.data().stock ?? 0;
    t.update(ref, {
      stock: current + qty,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

async function restoreOrderStock(order) {
  const db = admin.firestore();
  const items = Array.isArray(order.items) ? order.items : [];
  const restored = [];

  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    if (item.productId) {
      await incrementStock(item.productId, qty);
      restored.push(item.productId);
      continue;
    }
    if (item.priceId) {
      const snap = await db.collection('shopProducts').where('stripePriceId', '==', item.priceId).limit(1).get();
      if (!snap.empty) {
        await incrementStock(snap.docs[0].id, qty);
        restored.push(snap.docs[0].id);
      }
    }
  }

  if (restored.length) {
    try {
      const { syncStockToAllPlatforms } = require('./inventorySync');
      await Promise.all([...new Set(restored)].map((id) => syncStockToAllPlatforms(id)));
    } catch (err) {
      logger.warn('Marketplace sync after stock restore failed:', err);
    }
  }
}

async function safeAppendActivity(orderRef, entry) {
  try {
    await appendOrderActivity(orderRef, entry);
  } catch (err) {
    logger.warn('Failed to append order activity', err);
  }
}

const STRIPE_CANCELABLE = new Set([
  'requires_payment_method',
  'requires_capture',
  'requires_confirmation',
  'requires_action',
  'processing',
]);

/** Check Stripe PI and cancel if still open; return human-readable detail for activity. */
async function resolveStripeCancelDetail(paymentIntentId) {
  const piId = normalizePaymentIntentId(paymentIntentId);
  if (!piId) return 'No Stripe payment linked';

  const stripe = getShopStripe();
  if (!stripe) return 'Shop Stripe is not configured';

  try {
    const pi = await stripe.paymentIntents.retrieve(piId);
    if (STRIPE_CANCELABLE.has(pi.status)) {
      await stripe.paymentIntents.cancel(piId);
      return `Stripe payment cancelled (${pi.status})`;
    }
    if (pi.status === 'succeeded') {
      return 'Payment already captured — shop order cancelled (use Refund to return funds)';
    }
    if (pi.status === 'canceled') {
      return 'Stripe payment was already cancelled';
    }
    return `Stripe payment status: ${pi.status}`;
  } catch (err) {
    logger.warn('Stripe cancel lookup failed:', err);
    return `Shop order cancelled (Stripe lookup failed: ${err.message || 'unknown error'})`;
  }
}

/** Mark order cancelled in Firestore; cancel open Stripe PI when possible (no refund). */
exports.cancelShopOrder = onCall({ cors: true, secrets: ['STRIPE_SHOP_SECRET_KEY'] }, async (request) => {
  requireAdmin(request);
  const { orderId } = request.data || {};
  const { ref, data } = await getOrder(orderId);

  if ((data.status || '').toLowerCase() === 'cancelled' || (data.status || '').toLowerCase() === 'canceled') {
    throw new HttpsError('failed-precondition', 'Order is already cancelled');
  }
  if ((data.financialStatus || '').toUpperCase() === 'REFUNDED') {
    throw new HttpsError('failed-precondition', 'Order is already refunded');
  }

  const stripeDetail = await resolveStripeCancelDetail(data.paymentIntentId);

  await ref.update({
    status: 'cancelled',
    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    cancelledBy: request.auth.uid,
  });

  await safeAppendActivity(ref, activityEntry({
    type: 'cancelled',
    title: 'Order cancelled',
    detail: stripeDetail,
    actor: 'admin',
    actorEmail: request.auth.token.email || null,
  }));

  return { success: true, stripeDetail };
});

/** Full Stripe refund + cancel order + restore stock. */
exports.refundShopOrder = onCall({ cors: true, secrets: ['STRIPE_SHOP_SECRET_KEY'] }, async (request) => {
  requireAdmin(request);
  const { orderId } = request.data || {};
  const { ref, data } = await getOrder(orderId);

  if ((data.financialStatus || '').toUpperCase() === 'REFUNDED') {
    throw new HttpsError('failed-precondition', 'Order is already refunded');
  }

  const paymentIntentId = normalizePaymentIntentId(data.paymentIntentId);
  if (!paymentIntentId) {
    throw new HttpsError('failed-precondition', 'This order has no Stripe payment to refund');
  }

  const stripe = getShopStripe();
  if (!stripe) throw new HttpsError('internal', 'Shop Stripe is not configured');

  try {
    await stripe.refunds.create({ payment_intent: paymentIntentId });
  } catch (err) {
    logger.error('Stripe refund failed:', err);
    throw new HttpsError('internal', err.message || 'Stripe refund failed');
  }

  await restoreOrderStock(data);

  await ref.update({
    status: 'cancelled',
    financialStatus: 'REFUNDED',
    refundedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    refundedBy: request.auth.uid,
  });

  await safeAppendActivity(ref, activityEntry({
    type: 'refunded',
    title: 'Refunded via Stripe',
    detail: 'Full refund issued',
    actor: 'admin',
    actorEmail: request.auth.token.email || null,
  }));

  return { success: true };
});

/** Permanently delete an order document (admin only). */
exports.deleteShopOrder = onCall({ cors: true }, async (request) => {
  requireAdmin(request);
  const { orderId } = request.data || {};
  const { ref } = await getOrder(orderId);
  await ref.delete();
  return { success: true };
});

/** Assign shopOrderNumber to existing site/manual orders missing one (admin, safe to re-run). */
exports.backfillShopOrderNumbers = onCall({ cors: true }, async (request) => {
  requireAdmin(request);
  const db = admin.firestore();
  const { SHOP_ORDER_NUMBER_START } = require('./shopOrderNumbers');
  const snap = await db.collection('physicalOrders').orderBy('createdAt', 'asc').get();

  let next = SHOP_ORDER_NUMBER_START;
  let updated = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.shopOrderNumber) {
      const n = Number(data.shopOrderNumber);
      if (Number.isFinite(n) && n >= next) next = n + 1;
      continue;
    }
    if (data.isImported || data.squarespaceOrderId || data.importSource) continue;
    const isSiteOrder = data.source === 'own-site' || data.isManual || Boolean(data.sessionId);
    if (!isSiteOrder) continue;

    await docSnap.ref.update({
      shopOrderNumber: next,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    next += 1;
    updated += 1;
  }

  await db.doc('_config/shopOrderSequence').set({
    next,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true, updated, nextNumber: next };
});

/** Re-fetch Stripe checkout session and backfill customer/shipping fields on an order. */
exports.syncShopOrderFromStripe = onCall({ cors: true, secrets: ['STRIPE_SHOP_SECRET_KEY'] }, async (request) => {
  requireAdmin(request);
  const { orderId } = request.data || {};
  const { ref, data } = await getOrder(orderId);

  if (data.source !== 'own-site' && !String(orderId).startsWith('cs_')) {
    throw new HttpsError('failed-precondition', 'Only website Stripe checkout orders can be synced');
  }

  const stripe = getShopStripe();
  if (!stripe) throw new HttpsError('internal', 'Shop Stripe is not configured');

  const sessionId = data.sessionId || orderId;
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.data.price.product'],
    });
  } catch (err) {
    logger.error('syncShopOrderFromStripe retrieve failed:', err);
    throw new HttpsError('internal', err.message || 'Could not load Stripe session');
  }

  const { enrichPhysicalCheckoutSession } = require('./checkoutSessionEnrichment');
  const enriched = await enrichPhysicalCheckoutSession(session, stripe);

  const patch = {
    customerEmail: enriched.customerEmail || data.customerEmail || null,
    customerName: enriched.customerName || data.customerName || null,
    shippingName: enriched.shippingName || data.shippingName || null,
    shippingAddress: enriched.shippingAddress || data.shippingAddress || null,
    billingAddress: enriched.billingAddress || data.billingAddress || null,
    billingName: enriched.billingName || data.billingName || null,
    customerPhone: enriched.customerPhone || data.customerPhone || null,
    giftMessage: enriched.giftMessage || data.giftMessage || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await ref.update(patch);

  await safeAppendActivity(ref, activityEntry({
    type: 'stripe_sync',
    title: 'Order synced from Stripe',
    detail: enriched.shippingAddress?.line1
      ? `Shipping address updated (${enriched.shippingAddress.line1})`
      : 'Customer details refreshed (no shipping address on session)',
    actor: 'admin',
    actorEmail: request.auth.token.email || null,
  }));

  return { success: true, patch };
});
