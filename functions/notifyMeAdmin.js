const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { sendShopTemplatedEmail, SHOP_BASE } = require('./shopEmails');

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

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function productShopUrl(product) {
  const slug = product?.slug;
  if (slug) return `${SHOP_BASE.replace(/\/$/, '')}/shop/products/${slug}`;
  return `${SHOP_BASE.replace(/\/$/, '')}/shop`;
}

/**
 * Send back-in-stock emails to pending waitlist entries for a product.
 * Marks each request as notified (does not delete — admin can audit).
 */
async function sendNotifyMeAlertsForProduct(db, productId, { sentBy = 'system' } = {}) {
  if (!productId) throw new Error('productId is required');

  const productSnap = await db.collection('shopProducts').doc(productId).get();
  const product = productSnap.exists ? productSnap.data() : {};
  const productName = product.name || productId;
  const shopUrl = productShopUrl(product);

  const pendingSnap = await db.collection('notifyMeRequests')
    .where('productId', '==', productId)
    .get();

  const pendingDocs = pendingSnap.docs.filter((docSnap) => {
    const status = docSnap.data().status;
    return status !== 'notified';
  });

  if (!pendingDocs.length) {
    return { sent: 0, skipped: 0, productName };
  }

  let sent = 0;
  let skipped = 0;
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const docSnap of pendingDocs) {
    const data = docSnap.data();
    const to = normalizeEmail(data.email);
    if (!to) {
      skipped += 1;
      continue;
    }

    try {
      await sendShopTemplatedEmail(
        'shopBackInStock',
        to,
        {
          customerName: to.split('@')[0] || 'there',
          productName,
          shopUrl,
        },
        {
          emailType: 'notifyMeAlert',
          sentBy,
          metadata: { productId, requestId: docSnap.id },
          priority: 'normal',
        }
      );

      await docSnap.ref.update({
        status: 'notified',
        notifiedAt: now,
        updatedAt: now,
      });
      sent += 1;
    } catch (err) {
      logger.error(`Failed notify-me email to ${to} for ${productId}:`, err);
      skipped += 1;
    }
  }

  logger.info(`Notify-me alerts for ${productId}: sent=${sent}, skipped=${skipped}`);
  return { sent, skipped, productName, productId };
}

/** Public signup — dedupes pending requests for same email + product. */
exports.subscribeNotifyMe = onCall({ cors: true, enforceAppCheck: false }, async (request) => {
  const { productId, productName, email } = request.data || {};
  const normalizedEmail = normalizeEmail(email);

  if (!productId || typeof productId !== 'string') {
    throw new HttpsError('invalid-argument', 'productId is required.');
  }
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new HttpsError('invalid-argument', 'A valid email is required.');
  }

  const db = admin.firestore();

  const existing = await db.collection('notifyMeRequests')
    .where('productId', '==', productId)
    .where('email', '==', normalizedEmail)
    .limit(5)
    .get();

  const alreadyPending = existing.docs.some((d) => d.data().status !== 'notified');
  if (alreadyPending) {
    return { ok: true, duplicate: true };
  }

  await db.collection('notifyMeRequests').add({
    email: normalizedEmail,
    productId,
    productName: productName || null,
    status: 'pending',
    source: 'shop',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, duplicate: false };
});

/** Admin: notify all pending subscribers for one product. */
exports.sendNotifyMeAlerts = onCall({ cors: true }, async (request) => {
  requireAdmin(request);
  const { productId } = request.data || {};
  if (!productId) throw new HttpsError('invalid-argument', 'productId is required');

  const db = admin.firestore();
  const adminEmail = (request.auth.token.email || '').toLowerCase();
  const result = await sendNotifyMeAlertsForProduct(db, productId, { sentBy: adminEmail });
  return result;
});

module.exports.sendNotifyMeAlertsForProduct = sendNotifyMeAlertsForProduct;
