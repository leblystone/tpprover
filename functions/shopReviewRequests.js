/**
 * Verified shop review requests — match order email, send invite link, accept submissions.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const shopEmails = require('./shopEmails');

const RATE_LIMIT_MS = 15 * 60 * 1000;
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BLOCKED_STATUSES = new Set(['cancelled', 'refunded', 'failed', 'abandoned']);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findPaidOrdersByEmail(db, email) {
  const lower = normalizeEmail(email);
  const raw = String(email || '').trim();
  const tries = [...new Set([lower, raw].filter(Boolean))];
  const byId = new Map();

  for (const candidate of tries) {
    const snap = await db
      .collection('physicalOrders')
      .where('customerEmail', '==', candidate)
      .limit(25)
      .get();
    snap.docs.forEach((d) => byId.set(d.id, d));
  }

  return Array.from(byId.values()).filter((doc) => {
    const status = String(doc.data().status || '').toLowerCase();
    return status && !BLOCKED_STATUSES.has(status);
  });
}

function buildProductNamesFromOrders(orderDocs) {
  const names = new Set();
  orderDocs.forEach((doc) => {
    const items = doc.data().items || [];
    items.forEach((li) => {
      if (li?.name) names.add(li.name);
    });
  });
  return Array.from(names);
}

function buildReviewInviteBodyHtml(reviewUrl) {
  return `<div style="text-align:center;margin:24px 0">
    <a href="${reviewUrl}" style="display:inline-block;background:#7F9E95;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px">Write your review</a>
  </div>
  <p style="font-size:13px;color:#888;text-align:center;line-height:1.5">This link is for verified purchases only and expires in 7 days.</p>`;
}

async function checkRateLimit(db, emailLower) {
  const ref = db.collection('shopReviewRequestRate').doc(emailLower);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const lastAt = snap.data()?.lastRequestedAt?.toDate?.() || new Date(snap.data()?.lastRequestedAt || 0);
  return Date.now() - lastAt.getTime() < RATE_LIMIT_MS;
}

async function touchRateLimit(db, emailLower) {
  await db.collection('shopReviewRequestRate').doc(emailLower).set(
    {
      lastRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      emailLower,
    },
    { merge: true }
  );
}

async function logReviewRequest(db, payload) {
  await db.collection('shopReviewRequests').add({
    ...payload,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/** Create a one-time review token for a delivered order (post-delivery email). */
async function createReviewTokenForOrder(db, orderDoc) {
  const order = orderDoc.data();
  const emailLower = normalizeEmail(order.customerEmail || order.email);
  if (!emailLower) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  const productNames = buildProductNamesFromOrders([orderDoc]);

  await db.collection('shopReviewTokens').doc(token).set({
    emailLower,
    orderIds: [orderDoc.id],
    customerName: order.customerName || order.shippingName || 'there',
    productNames,
    productSlug: null,
    expiresAt,
    used: false,
    source: 'post_delivery',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const reviewUrl = `${shopEmails.SHOP_BASE}/shop/review?token=${token}`;
  return { token, reviewUrl, emailLower, customerName: order.customerName || order.shippingName || 'there' };
}

function buildPostDeliveryReviewBodyHtml(reviewUrl) {
  return `${buildReviewInviteBodyHtml(reviewUrl)}
  ${shopEmails.buildReviewLinksHtml()}`;
}

/**
 * Public: user enters checkout email → verify order → email review link.
 */
exports.requestShopReviewLink = onCall(
  { cors: true, secrets: ['RESEND_API_KEY'] },
  async (request) => {
    const email = normalizeEmail(request.data?.email);
    const productSlug = String(request.data?.productSlug || '').trim() || null;

    if (!isValidEmail(email)) {
      throw new HttpsError('invalid-argument', 'Please enter a valid email address.');
    }

    const db = admin.firestore();
    const genericMessage =
      'If we find an order for that email, we will send a review link shortly. Check your inbox and spam folder.';

    try {
      if (await checkRateLimit(db, email)) {
        await logReviewRequest(db, {
          emailLower: email,
          productSlug,
          status: 'rate_limited',
          source: 'user_request',
        });
        return { success: true, message: genericMessage };
      }

      const orderDocs = await findPaidOrdersByEmail(db, email);

      if (orderDocs.length === 0) {
        await touchRateLimit(db, email);
        await logReviewRequest(db, {
          emailLower: email,
          productSlug,
          status: 'no_order',
          orderIds: [],
          source: 'user_request',
        });
        return { success: true, message: genericMessage };
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
      const orderIds = orderDocs.map((d) => d.id);
      const customerName =
        orderDocs[0].data().customerName ||
        orderDocs[0].data().shippingName ||
        'there';
      const productNames = buildProductNamesFromOrders(orderDocs);

      await db.collection('shopReviewTokens').doc(token).set({
        emailLower: email,
        orderIds,
        customerName,
        productNames,
        productSlug,
        expiresAt,
        used: false,
        source: 'user_request',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const reviewUrl = `${shopEmails.SHOP_BASE}/shop/review?token=${token}`;

      await shopEmails.sendShopTemplatedEmail(
        'shopReviewInvite',
        email,
        {
          customerName,
          reviewUrl,
          orderStatusUrl: reviewUrl,
          sessionId: orderIds[0],
        },
        {
          bodyHtml: buildReviewInviteBodyHtml(reviewUrl),
          emailType: 'shopReviewInvite',
          metadata: { orderIds, productSlug, source: 'user_request' },
          priority: 'normal',
        }
      );

      await touchRateLimit(db, email);
      await logReviewRequest(db, {
        emailLower: email,
        productSlug,
        status: 'email_sent',
        orderIds,
        tokenId: token,
        source: 'user_request',
      });

      for (const orderDoc of orderDocs) {
        await orderDoc.ref.set(
          {
            reviewInviteSentAt: admin.firestore.FieldValue.serverTimestamp(),
            reviewInviteSource: 'user_request',
          },
          { merge: true }
        );
      }

      logger.info('shopReviewInvite sent', { email, orderCount: orderIds.length });
      return { success: true, message: genericMessage };
    } catch (err) {
      logger.error('requestShopReviewLink failed', err);
      throw new HttpsError('internal', 'Something went wrong. Please try again in a few minutes.');
    }
  }
);

/**
 * Validate token for the write-review page (no auth required).
 */
exports.getShopReviewToken = onCall({ cors: true }, async (request) => {
  const token = String(request.data?.token || '').trim();
  if (!token) {
    throw new HttpsError('invalid-argument', 'Review link is invalid.');
  }

  const db = admin.firestore();
  const tokenRef = db.collection('shopReviewTokens').doc(token);
  const tokenDoc = await tokenRef.get();

  if (!tokenDoc.exists) {
    throw new HttpsError('not-found', 'This review link is invalid or has expired.');
  }

  const data = tokenDoc.data();
  if (data.used) {
    throw new HttpsError('failed-precondition', 'This review link has already been used.');
  }

  const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
  if (expiresAt && new Date() > expiresAt) {
    throw new HttpsError('deadline-exceeded', 'This review link has expired. Request a new one from the shop.');
  }

  return {
    valid: true,
    customerName: data.customerName || 'Customer',
    productNames: data.productNames || [],
    productSlug: data.productSlug || null,
    orderIds: data.orderIds || [],
  };
});

/**
 * Submit a verified review (token proves purchase).
 */
exports.submitVerifiedShopReview = onCall({ cors: true }, async (request) => {
  const token = String(request.data?.token || '').trim();
  const rating = Math.min(5, Math.max(1, Number(request.data?.rating) || 0));
  const body = String(request.data?.body || '').trim();
  const authorName = String(request.data?.authorName || '').trim();
  const productName = String(request.data?.productName || '').trim();

  if (!token) throw new HttpsError('invalid-argument', 'Review link is invalid.');
  if (!rating) throw new HttpsError('invalid-argument', 'Please select a star rating.');
  if (!authorName) throw new HttpsError('invalid-argument', 'Please enter your name.');

  const db = admin.firestore();
  const tokenRef = db.collection('shopReviewTokens').doc(token);
  const tokenDoc = await tokenRef.get();

  if (!tokenDoc.exists) {
    throw new HttpsError('not-found', 'This review link is invalid or has expired.');
  }

  const tokenData = tokenDoc.data();
  if (tokenData.used) {
    throw new HttpsError('failed-precondition', 'This review link has already been used.');
  }

  const expiresAt = tokenData.expiresAt?.toDate?.() || new Date(tokenData.expiresAt);
  if (expiresAt && new Date() > expiresAt) {
    throw new HttpsError('deadline-exceeded', 'This review link has expired.');
  }

  const resolvedProductName =
    productName ||
    (tokenData.productNames && tokenData.productNames[0]) ||
    '';

  const reviewRef = db.collection('shopReviews').doc();
  await reviewRef.set({
    authorName,
    authorLocation: '',
    productName: resolvedProductName,
    body,
    rating,
    source: 'website',
    sourceUrl: `${shopEmails.SHOP_BASE}/shop/reviews`,
    photos: [],
    active: true,
    verifiedPurchase: true,
    orderIds: tokenData.orderIds || [],
    customerEmailLower: tokenData.emailLower || null,
    reviewTokenId: token,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await tokenRef.update({
    used: true,
    usedAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewId: reviewRef.id,
  });

  await logReviewRequest(db, {
    emailLower: tokenData.emailLower,
    status: 'review_submitted',
    orderIds: tokenData.orderIds || [],
    tokenId: token,
    reviewId: reviewRef.id,
    source: tokenData.source || 'user_request',
  });

  return {
    success: true,
    reviewId: reviewRef.id,
    message: 'Thank you! Your review is live on the shop.',
  };
});

module.exports.createReviewTokenForOrder = createReviewTokenForOrder;
module.exports.buildPostDeliveryReviewBodyHtml = buildPostDeliveryReviewBodyHtml;
