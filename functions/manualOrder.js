const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
require('dotenv').config();

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

/**
 * Create a manual order from the admin panel.
 * Decrements stock transactionally, writes to physicalOrders, optionally sends confirmation email.
 *
 * Expected request.data shape:
 * {
 *   items: [{ productId, name, price, quantity }],  // price in dollars
 *   customerName: string,
 *   customerEmail: string,
 *   customerPhone?: string,
 *   shippingAddress?: { line1, line2, city, state, postal_code, country },
 *   shippingName?: string,
 *   source: 'in-person' | 'phone' | 'wholesale' | 'other',
 *   notes?: string,
 *   sendConfirmation: boolean,
 * }
 */
exports.createManualOrder = onCall({ cors: true }, async (request) => {
  const adminEmail = requireAdmin(request);
  const db = admin.firestore();

  const {
    items,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    shippingName,
    source = 'manual',
    notes,
    sendConfirmation = false,
  } = request.data || {};

  if (!items?.length) throw new HttpsError('invalid-argument', 'At least one item is required');
  if (!customerName?.trim()) throw new HttpsError('invalid-argument', 'Customer name is required');

  // Validate items
  for (const item of items) {
    if (!item.productId) throw new HttpsError('invalid-argument', 'Each item needs a productId');
    if (!item.quantity || item.quantity < 1) throw new HttpsError('invalid-argument', 'Each item needs a quantity >= 1');
  }

  // Decrement stock for each item in a single transaction
  const decrementResults = await db.runTransaction(async (t) => {
    const results = [];
    const refs = items.map((item) => db.collection('shopProducts').doc(item.productId));
    const docs = await Promise.all(refs.map((ref) => t.get(ref)));

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const productDoc = docs[i];

      if (!productDoc.exists) {
        throw new HttpsError('not-found', `Product ${item.productId} not found`);
      }

      const data = productDoc.data();
      const currentStock = data.stock ?? 0;
      const newStock = currentStock - item.quantity;

      if (newStock < 0) {
        throw new HttpsError(
          'failed-precondition',
          `Not enough stock for "${data.name || item.productId}": have ${currentStock}, need ${item.quantity}`,
        );
      }

      t.update(refs[i], {
        stock: newStock,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      results.push({
        productId: item.productId,
        name: data.name || item.name,
        price: item.price ?? (data.price || 0),
        quantity: item.quantity,
        newStock,
      });
    }

    return results;
  });

  // Calculate totals (price in dollars → store as cents for consistency with Stripe orders)
  const amountTotal = decrementResults.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
    0,
  );

  const orderData = {
    source,
    status: 'pending',
    customerName: customerName.trim(),
    customerEmail: customerEmail?.trim() || null,
    customerPhone: customerPhone?.trim() || null,
    shippingName: shippingName?.trim() || customerName.trim(),
    shippingAddress: shippingAddress || null,
    items: decrementResults.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      amountTotal: Math.round(item.price * 100) * item.quantity,
    })),
    amountTotal,
    notes: notes?.trim() || null,
    createdBy: adminEmail,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    isManual: true,
  };

  const orderRef = await db.collection('physicalOrders').add(orderData);

  logger.info(`Manual order ${orderRef.id} created by ${adminEmail}`, {
    orderId: orderRef.id,
    source,
    items: decrementResults.map((i) => `${i.name} x${i.quantity}`),
  });

  // Optionally sync stock to marketplaces
  try {
    const { syncStockToAllPlatforms } = require('./inventorySync');
    await Promise.allSettled(
      decrementResults.map((item) => syncStockToAllPlatforms(item.productId)),
    );
  } catch (err) {
    logger.warn('Marketplace sync after manual order failed (non-fatal):', err);
  }

  // Optionally send confirmation email
  if (sendConfirmation && customerEmail?.trim()) {
    try {
      const emailService = require('./emailService');
      const itemsList = decrementResults
        .map((i) => `<li>${i.name} × ${i.quantity} — $${(Math.round(i.price * 100) * i.quantity / 100).toFixed(2)}</li>`)
        .join('');

      await emailService.sendEmailWithQueue(
        customerEmail.trim(),
        '🎉 Your PEP Planner order has been placed!',
        `<h2>Order Confirmed</h2>
         <p>Hi ${customerName.trim()},</p>
         <p>Your order has been received and is being prepared.</p>
         <ul>${itemsList}</ul>
         <p><strong>Total: $${(amountTotal / 100).toFixed(2)}</strong></p>
         <p>We'll be in touch with shipping details soon. Thank you!</p>`,
        { priority: 'normal', type: 'manualOrderConfirmation' },
      );
    } catch (err) {
      logger.warn('Failed to send manual order confirmation email (non-fatal):', err);
    }
  }

  return {
    ok: true,
    orderId: orderRef.id,
    amountTotal,
    items: decrementResults,
  };
});
