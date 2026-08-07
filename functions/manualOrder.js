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
 * Decrements stock transactionally for catalog products, writes to physicalOrders,
 * optionally sends confirmation email. Custom (free-text) items skip stock.
 *
 * Expected request.data shape:
 * {
 *   items: [{ productId?, name, price, quantity }],  // price in dollars; productId optional for custom items
 *   ...
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

  for (const item of items) {
    const hasCatalog = Boolean(item.productId);
    const hasName = Boolean(String(item.name || '').trim());
    if (!hasCatalog && !hasName) {
      throw new HttpsError('invalid-argument', 'Each item needs a product or a custom name');
    }
    if (!item.quantity || item.quantity < 1) {
      throw new HttpsError('invalid-argument', 'Each item needs a quantity >= 1');
    }
  }

  const decrementResults = await db.runTransaction(async (t) => {
    const catalogIndexes = [];
    const refs = [];
    items.forEach((item, index) => {
      if (item.productId) {
        catalogIndexes.push(index);
        refs.push(db.collection('shopProducts').doc(item.productId));
      }
    });

    const docs = refs.length ? await Promise.all(refs.map((ref) => t.get(ref))) : [];
    const catalogResults = new Map();

    for (let i = 0; i < catalogIndexes.length; i++) {
      const itemIndex = catalogIndexes[i];
      const item = items[itemIndex];
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

      catalogResults.set(itemIndex, {
        productId: item.productId,
        name: data.name || item.name,
        price: item.price ?? (data.price || 0),
        quantity: item.quantity,
        newStock,
      });
    }

    return items.map((item, index) => {
      if (catalogResults.has(index)) return catalogResults.get(index);
      return {
        productId: null,
        name: String(item.name || '').trim(),
        price: item.price ?? 0,
        quantity: item.quantity,
        newStock: null,
      };
    });
  });

  // Calculate totals (price in dollars → store as cents for consistency with Stripe orders)
  const amountTotal = decrementResults.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
    0,
  );

  const { allocateShopOrderNumber } = require('./shopOrderNumbers');
  const shopOrderNumber = await allocateShopOrderNumber(db);

  const orderData = {
    shopOrderNumber,
    source,
    status: 'pending',
    customerName: customerName.trim(),
    customerEmail: customerEmail?.trim() || null,
    customerPhone: customerPhone?.trim() || null,
    shippingName: shippingName?.trim() || customerName.trim(),
    shippingAddress: shippingAddress || null,
    items: decrementResults.map((item) => ({
      productId: item.productId || null,
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

  try {
    const { syncStockToAllPlatforms } = require('./inventorySync');
    await Promise.allSettled(
      decrementResults
        .filter((item) => item.productId)
        .map((item) => syncStockToAllPlatforms(item.productId)),
    );
  } catch (err) {
    logger.warn('Marketplace sync after manual order failed (non-fatal):', err);
  }

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
