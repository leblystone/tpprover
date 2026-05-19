/**
 * Digital product fulfillment — PDF planners sold on the shop.
 * After Stripe payment: create per-item download tokens, email links, expose on success page.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

const TOKEN_COLLECTION = 'digitalDownloadTokens';
const TOKEN_EXPIRY_DAYS = 90;
const MAX_DOWNLOADS_PER_TOKEN = 25;
const SIGNED_URL_MINUTES = 15;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'sk_test_fallback_key') return null;
  return require('stripe')(key);
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

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

async function buildProductMaps(db) {
  const snap = await db.collection('shopProducts').get();
  const byPriceId = new Map();
  const byProductId = new Map();
  snap.forEach((doc) => {
    const data = { id: doc.id, ...doc.data() };
    byProductId.set(doc.id, data);
    if (data.stripePriceId) byPriceId.set(data.stripePriceId, data);
  });
  return { byPriceId, byProductId };
}

function resolveProduct(item, { byPriceId, byProductId }) {
  if (item.priceId && byPriceId.has(item.priceId)) return byPriceId.get(item.priceId);
  if (item.productId && byProductId.has(item.productId)) return byProductId.get(item.productId);
  return null;
}

function isTokenUsable(data) {
  const now = Date.now();
  const expires = data.expiresAt?.toMillis?.() ?? 0;
  if (expires && now > expires) return false;
  if ((data.downloadCount || 0) >= (data.maxDownloads || MAX_DOWNLOADS_PER_TOKEN)) return false;
  return true;
}

function getBaseUrl() {
  return process.env.SHOP_BASE_URL || 'https://thepepplanner.app';
}

async function createTokenForSlot(db, sessionId, product, item, customerEmail) {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);
  const baseUrl = getBaseUrl();

  const tokenDoc = {
    token,
    sessionId,
    productId: product.id,
    productName: product.name || item.name || 'Digital download',
    customerEmail: customerEmail || null,
    downloadStoragePath: product.downloadStoragePath,
    downloadFileName: product.downloadFileName || `${product.slug || 'planner'}.pdf`,
    downloadCount: 0,
    maxDownloads: MAX_DOWNLOADS_PER_TOKEN,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection(TOKEN_COLLECTION).doc(token).set(tokenDoc);

  return {
    token,
    productName: tokenDoc.productName,
    downloadUrl: `${baseUrl}/downloads/${token}`,
  };
}

/**
 * Ensure each digital line item has a usable download token; create new ones when needed.
 */
async function ensureDeliveriesForOrder(sessionId, lineItems, customerEmail) {
  if (!sessionId || !Array.isArray(lineItems) || lineItems.length === 0) {
    return { deliveries: [], hasDigital: false };
  }

  const db = admin.firestore();
  const maps = await buildProductMaps(db);
  const baseUrl = getBaseUrl();

  const digitalSlots = [];
  for (const item of lineItems) {
    const product = resolveProduct(item, maps);
    if (!product || product.category !== 'digital') continue;
    if (!product.downloadStoragePath) {
      logger.warn(`Digital product ${product.id} missing PDF — skipping`);
      continue;
    }
    const qty = Math.max(1, item.quantity || 1);
    for (let i = 0; i < qty; i++) digitalSlots.push({ product, item });
  }

  if (digitalSlots.length === 0) return { deliveries: [], hasDigital: false };

  const snap = await db.collection(TOKEN_COLLECTION).where('sessionId', '==', sessionId).get();
  const poolByProduct = new Map();
  snap.docs.forEach((doc) => {
    if (!isTokenUsable(doc.data())) return;
    const pid = doc.data().productId;
    const list = poolByProduct.get(pid) || [];
    list.push({
      token: doc.id,
      productName: doc.data().productName,
      downloadUrl: `${baseUrl}/downloads/${doc.id}`,
    });
    poolByProduct.set(pid, list);
  });

  const deliveries = [];
  for (const slot of digitalSlots) {
    const pool = poolByProduct.get(slot.product.id) || [];
    const existing = pool.shift();
    if (existing) {
      deliveries.push(existing);
      poolByProduct.set(slot.product.id, pool);
    } else {
      const created = await createTokenForSlot(db, sessionId, slot.product, slot.item, customerEmail);
      deliveries.push(created);
    }
  }

  return { deliveries, hasDigital: true };
}

/**
 * Create download tokens for digital line items and send the download email.
 */
async function fulfillDigitalDownloadsForOrder({ sessionId, customerEmail, customerName, lineItems }) {
  const { deliveries, hasDigital } = await ensureDeliveriesForOrder(sessionId, lineItems, customerEmail);
  if (!hasDigital || deliveries.length === 0) return [];

  const db = admin.firestore();
  const baseUrl = getBaseUrl();

  await db.collection('physicalOrders').doc(sessionId).set(
    {
      hasDigitalItems: true,
      digitalDeliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      digitalDownloadCount: deliveries.length,
    },
    { merge: true }
  );

  if (customerEmail) {
    await sendDigitalDownloadEmail({ customerEmail, customerName, sessionId, deliveries, baseUrl });
  }

  logger.info(`📥 Digital fulfillment: ${deliveries.length} token(s) for order ${sessionId}`);
  return deliveries;
}

async function sendDigitalDownloadEmail({ customerEmail, customerName, sessionId, deliveries, baseUrl }) {
  const emailService = require('./emailService');
  const linksHtml = deliveries.map((d) =>
    `<tr>
      <td style="padding:12px 14px;border-bottom:1px solid #eee;font-size:15px;color:#333">${d.productName}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #eee;text-align:right">
        <a href="${d.downloadUrl}" style="display:inline-block;background:#4A7C6F;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Download PDF</a>
      </td>
    </tr>`
  ).join('');

  const orderUrl = `${baseUrl}/shop/success?session_id=${sessionId}`;

  const html = `
    <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e8e3">
      <div style="background:#4A7C6F;padding:32px 24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">Your download is ready</h1>
        <p style="color:#d4e8e2;margin:8px 0 0;font-size:14px">Hyperlinked PDF — save to your tablet</p>
      </div>
      <div style="padding:28px 24px">
        <p style="font-size:16px;color:#333">Hi${customerName ? ` ${customerName}` : ''},</p>
        <p style="font-size:15px;color:#555;line-height:1.6">Thanks for your purchase! Tap below to download your planner PDF. Links stay active for ${TOKEN_EXPIRY_DAYS} days (up to ${MAX_DOWNLOADS_PER_TOKEN} downloads each).</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0">
          <thead><tr style="background:#f5f5f0">
            <th style="padding:10px 14px;text-align:left;font-size:12px;color:#666;text-transform:uppercase">Product</th>
            <th style="padding:10px 14px;text-align:right;font-size:12px;color:#666;text-transform:uppercase">Download</th>
          </tr></thead>
          <tbody>${linksHtml}</tbody>
        </table>
        <p style="font-size:13px;color:#888;line-height:1.5">Best on iPad/tablet with GoodNotes, Notability, or similar. Not intended for printing.</p>
        <div style="text-align:center;margin-top:24px">
          <a href="${orderUrl}" style="color:#4A7C6F;font-size:14px">View order confirmation</a>
        </div>
        <p style="margin-top:28px;padding-top:16px;border-top:1px solid #eee;color:#4A7C6F;font-weight:600;text-align:center">— The Pep Planner Team</p>
      </div>
    </div>`;


  await emailService.sendEmailWithQueue(
    customerEmail,
    'Your PEP Planner PDF download is ready',
    html,
    {
      type: 'digital_download_customer',
      recipientName: customerName,
      logToHistory: true,
      sentBy: 'system',
    }
  );
}

async function getTokenDoc(token) {
  if (!token || typeof token !== 'string' || token.length < 32) {
    throw new HttpsError('invalid-argument', 'Invalid download link.');
  }
  const snap = await admin.firestore().collection(TOKEN_COLLECTION).doc(token).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'This download link is invalid or has expired.');
  }
  return snap.data();
}

function assertTokenValid(data) {
  const now = Date.now();
  const expires = data.expiresAt?.toMillis?.() ?? 0;
  if (expires && now > expires) {
    throw new HttpsError('failed-precondition', 'This download link has expired. Reply to your order email for help.');
  }
  if ((data.downloadCount || 0) >= (data.maxDownloads || MAX_DOWNLOADS_PER_TOKEN)) {
    throw new HttpsError('resource-exhausted', 'Download limit reached for this link. Contact support if you need another copy.');
  }
}

/**
 * Public: redeem a token → short-lived signed Storage URL for the PDF.
 */
exports.redeemDigitalDownload = onCall(
  { cors: true, enforceAppCheck: false },
  async (request) => {
    const { token } = request.data || {};
    const data = await getTokenDoc(token);
    assertTokenValid(data);

    const bucket = admin.storage().bucket();
    const file = bucket.file(data.downloadStoragePath);
    const [exists] = await file.exists();
    if (!exists) {
      logger.error(`PDF missing at ${data.downloadStoragePath} for token ${token}`);
      throw new HttpsError('not-found', 'The file is temporarily unavailable. Please contact support.');
    }

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + SIGNED_URL_MINUTES * 60 * 1000,
      responseDisposition: `attachment; filename="${(data.downloadFileName || 'planner.pdf').replace(/"/g, '')}"`,
    });

    await admin.firestore().collection(TOKEN_COLLECTION).doc(token).update({
      downloadCount: admin.firestore.FieldValue.increment(1),
      lastDownloadedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      signedUrl,
      productName: data.productName,
      fileName: data.downloadFileName,
      expiresInMinutes: SIGNED_URL_MINUTES,
    };
  }
);

/**
 * Public: list digital downloads for a paid checkout session (success page).
 */
exports.getSessionDigitalDownloads = onCall(
  { cors: true, enforceAppCheck: false },
  async (request) => {
    const { sessionId } = request.data || {};
    if (!sessionId) throw new HttpsError('invalid-argument', 'sessionId is required');

    const stripe = getStripe();
    if (!stripe) throw new HttpsError('failed-precondition', 'Payments not configured.');

    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (err) {
      throw new HttpsError('not-found', 'Order not found.');
    }

    if (session.payment_status !== 'paid') {
      throw new HttpsError('failed-precondition', 'Payment not completed yet.');
    }

    const snap = await admin.firestore()
      .collection(TOKEN_COLLECTION)
      .where('sessionId', '==', sessionId)
      .get();

    const baseUrl = process.env.SHOP_BASE_URL || 'https://thepepplanner.app';

    return {
      downloads: snap.docs.map((doc) => {
        const d = doc.data();
        return {
          productName: d.productName,
          token: doc.id,
          downloadPageUrl: `${baseUrl}/downloads/${doc.id}`,
          expiresAt: d.expiresAt?.toMillis?.() || null,
          downloadsRemaining: Math.max(0, (d.maxDownloads || MAX_DOWNLOADS_PER_TOKEN) - (d.downloadCount || 0)),
        };
      }),
    };
  }
);

/**
 * Admin: resend digital download email (reuses valid tokens; mints new if expired/missing).
 */
exports.adminResendDigitalDownload = onCall({ cors: true }, async (request) => {
  const adminEmail = requireAdmin(request);
  const { orderId } = request.data || {};
  if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required');

  const db = admin.firestore();
  const orderSnap = await db.collection('physicalOrders').doc(orderId).get();
  if (!orderSnap.exists) throw new HttpsError('not-found', 'Order not found');

  const order = orderSnap.data();
  const customerEmail = order.customerEmail?.trim();
  if (!customerEmail) {
    throw new HttpsError('failed-precondition', 'This order has no customer email on file.');
  }

  const { deliveries, hasDigital } = await ensureDeliveriesForOrder(
    orderId,
    order.items || [],
    customerEmail
  );

  if (!hasDigital) {
    throw new HttpsError('failed-precondition', 'This order has no digital PDF products.');
  }
  if (deliveries.length === 0) {
    throw new HttpsError(
      'failed-precondition',
      'Digital products are missing uploaded PDFs in admin. Upload PDFs on the product, then try again.'
    );
  }

  const baseUrl = getBaseUrl();
  await sendDigitalDownloadEmail({
    customerEmail,
    customerName: order.customerName,
    sessionId: orderId,
    deliveries,
    baseUrl,
  });

  await orderSnap.ref.set(
    {
      hasDigitalItems: true,
      lastDigitalResendAt: admin.firestore.FieldValue.serverTimestamp(),
      lastDigitalResendBy: adminEmail,
    },
    { merge: true }
  );

  logger.info(`📧 Admin ${adminEmail} resent digital download for order ${orderId} (${deliveries.length} link(s))`);

  return {
    success: true,
    linkCount: deliveries.length,
    sentTo: customerEmail,
  };
});

module.exports.fulfillDigitalDownloadsForOrder = fulfillDigitalDownloadsForOrder;
