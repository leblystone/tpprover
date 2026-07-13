/**
 * Digital product fulfillment — PDF planners sold on the shop.
 * After Stripe payment: create per-item download tokens, email links, expose on success page.
 */
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

const TOKEN_COLLECTION = 'digitalDownloadTokens';
const TOKEN_EXPIRY_DAYS = 90;
const MAX_DOWNLOADS_PER_TOKEN = 25;
/** Branded file URL — streams PDF from our domain, not firebasestorage.googleapis.com */
function brandedDownloadFileUrl(token) {
  return `${getBaseUrl()}/api/download-file/${token}`;
}

function safeDownloadFileName(name) {
  const base = String(name || 'pep-planner.pdf')
    .replace(/[^\w.\- ()]+/g, '_')
    .slice(0, 120);
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

function httpStatusForError(err) {
  if (!(err instanceof HttpsError)) return 500;
  const map = {
    'invalid-argument': 400,
    'not-found': 404,
    'failed-precondition': 410,
    'resource-exhausted': 429,
  };
  return map[err.code] || 500;
}

const { getStripeShopSecretKey, sanitizeSecret } = require('./stripeShopKey');

function getStripe() {
  // Shop Stripe account — separate from app subscription account
  const key =
    getStripeShopSecretKey() ||
    sanitizeSecret(process.env.STRIPE_SECRET_KEY);
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
  const shopEmails = require('./shopEmails');
  const orderStatusUrl = `${baseUrl}/shop/success?session_id=${sessionId}`;
  const safeDeliveries = normalizeDeliveriesForEmail(deliveries);
  const bodyHtml = shopEmails.buildDownloadLinksTableHtml(safeDeliveries);

  if (!bodyHtml) {
    logger.error('sendDigitalDownloadEmail: no valid download page links', { sessionId });
    throw new Error('No valid download links to send');
  }

  await shopEmails.sendShopTemplatedEmail('shopDigitalDownload', customerEmail, {
    customerName: customerName || 'there',
    orderStatusUrl,
    sessionId,
  }, {
    bodyHtml,
    emailType: 'digital_download_customer',
    recipientName: customerName,
    forceShopDownloadBody: true,
  });
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

function buildDownloadInfoPayload(data) {
  const max = data.maxDownloads || MAX_DOWNLOADS_PER_TOKEN;
  const used = data.downloadCount || 0;
  return {
    productName: data.productName,
    fileName: safeDownloadFileName(data.downloadFileName),
    downloadsRemaining: Math.max(0, max - used),
    maxDownloads: max,
    expiresAt: data.expiresAt?.toMillis?.() || null,
    downloadUrl: brandedDownloadFileUrl(data.token || ''),
  };
}

function parseDownloadRequest(req) {
  let pathname = req.path || '';
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'thepepplanner.app';
    const rawUrl = req.url || req.originalUrl || pathname;
    pathname = new URL(rawUrl, `https://${host}`).pathname;
  } catch {
    /* use req.path */
  }

  const pathParts = pathname.split('/').filter(Boolean);
  let isInfo = false;
  let token = '';

  const infoIdx = pathParts.indexOf('info');
  if (infoIdx > 0) {
    isInfo = true;
    token = pathParts[infoIdx - 1] || '';
  } else {
    token = pathParts[pathParts.length - 1] || '';
  }

  if (!token || token === 'download-file' || token === 'api') {
    token = req.query?.token || '';
  }
  if (req.query?.info === '1' || req.query?.meta === '1') {
    isInfo = true;
  }
  return { token, isInfo };
}

function normalizeDeliveriesForEmail(deliveries) {
  const baseUrl = getBaseUrl().replace(/\/$/, '');
  return (deliveries || []).map((d) => ({
    productName: d.productName,
    token: d.token || d.id,
    downloadUrl: d.token || d.id ? `${baseUrl}/downloads/${d.token || d.id}` : d.downloadUrl,
  }));
}

/**
 * Single HTTP entry for digital downloads:
 *   GET /api/download-file/:token/info  → JSON metadata (no download counted)
 *   GET /api/download-file/:token       → stream PDF (branded filename, no Storage URL)
 */
exports.digitalDownload = onRequest(
  { cors: true, invoker: 'public' },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.status(204).send('');
      return;
    }
    if (req.method !== 'GET') {
      res.status(405).type('text/plain').send('Method not allowed');
      return;
    }

    const { token, isInfo } = parseDownloadRequest(req);

    try {
      const data = await getTokenDoc(token);
      assertTokenValid(data);

      if (isInfo) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'private, no-store, max-age=0');
        res.status(200).json(buildDownloadInfoPayload({ ...data, token }));
        return;
      }

      const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'tpp-splendide.firebasestorage.app';
      const bucket = admin.storage().bucket(bucketName);
      const file = bucket.file(data.downloadStoragePath);
      const [exists] = await file.exists();
      if (!exists) {
        logger.error(`PDF missing at ${data.downloadStoragePath} for token ${token}`);
        res.status(404).type('text/plain').send('The file is temporarily unavailable. Please contact support.');
        return;
      }

      const fileName = safeDownloadFileName(data.downloadFileName);

      await admin.firestore().collection(TOKEN_COLLECTION).doc(token).update({
        downloadCount: admin.firestore.FieldValue.increment(1),
        lastDownloadedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      file
        .createReadStream()
        .on('error', (err) => {
          logger.error('digitalDownload stream error', token, err);
          if (!res.headersSent) {
            res.status(500).type('text/plain').send('Download failed. Please try again.');
          } else {
            res.end();
          }
        })
        .pipe(res);
    } catch (err) {
      const status = httpStatusForError(err);
      const message =
        err instanceof HttpsError ? err.message : 'Download could not be completed.';
      logger.warn('digitalDownload rejected', { token: token?.slice?.(0, 8), status, message });
      if (!res.headersSent) {
        if (isInfo) {
          res.status(status).json({ error: message });
        } else {
          res.status(status).type('text/plain').send(message);
        }
      }
    }
  }
);

/** @deprecated Use digitalDownload HTTP routes; kept for older clients */
exports.getDigitalDownloadInfo = onCall(
  { cors: true, enforceAppCheck: false },
  async (request) => {
    const { token } = request.data || {};
    const data = await getTokenDoc(token);
    assertTokenValid(data);
    return buildDownloadInfoPayload({ ...data, token });
  }
);

/** @deprecated Returns branded URL only; file served by digitalDownload */
exports.redeemDigitalDownload = onCall(
  { cors: true, enforceAppCheck: false },
  async (request) => {
    const { token } = request.data || {};
    const data = await getTokenDoc(token);
    assertTokenValid(data);
    const fileName = safeDownloadFileName(data.downloadFileName);
    const downloadUrl = brandedDownloadFileUrl(token);
    return {
      signedUrl: downloadUrl,
      downloadUrl,
      productName: data.productName,
      fileName,
    };
  }
);

/**
 * Public: list digital downloads for a paid checkout session (success page).
 */
exports.getSessionDigitalDownloads = onCall(
  { cors: true, enforceAppCheck: false, secrets: ['STRIPE_SHOP_SECRET_KEY'] },
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

  const safeDeliveries = normalizeDeliveriesForEmail(deliveries);

  return {
    success: true,
    linkCount: safeDeliveries.length,
    sentTo: customerEmail,
    downloadPageUrls: safeDeliveries.map((d) => d.downloadUrl),
  };
});

module.exports.fulfillDigitalDownloadsForOrder = fulfillDigitalDownloadsForOrder;
