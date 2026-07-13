const crypto = require('crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const ADMIN_EMAILS = [
  'lebrockmaldonado@gmail.com',
  'contact@thepepplanner.com',
  'thepepplanner@gmail.com',
];

const SHOP_BASE = process.env.SHOP_BASE_URL || process.env.BASE_URL || 'https://thepepplanner.app';

function getUnsubscribeSecret() {
  return process.env.MARKETING_UNSUBSCRIBE_SECRET
    || process.env.STRIPE_SHOP_SECRET_KEY
    || 'tpp-marketing-unsub-dev-only';
}

function requireAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const email = (request.auth.token.email || '').toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) throw new HttpsError('permission-denied', 'Admin access required');
  return email;
}

function marketingDocId(email) {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._+-]/g, '_');
}

function normalizeEmail(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (!email.includes('@') || email.length < 5) return null;
  return email;
}

function createUnsubscribeToken(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return crypto
    .createHmac('sha256', getUnsubscribeSecret())
    .update(normalized)
    .digest('hex')
    .slice(0, 32);
}

function verifyUnsubscribeToken(email, token) {
  const normalized = normalizeEmail(email);
  if (!normalized || !token) return false;
  const expected = createUnsubscribeToken(normalized);
  const provided = String(token).trim().slice(0, 32);
  if (expected.length !== provided.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

function buildMarketingUnsubscribeUrl(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return `${SHOP_BASE}/unsubscribe`;
  const token = createUnsubscribeToken(normalized);
  const params = new URLSearchParams({ email: normalized, token });
  return `${SHOP_BASE}/unsubscribe?${params.toString()}`;
}

function buildMarketingUnsubscribeFooterHtml(email) {
  const url = buildMarketingUnsubscribeUrl(email);
  return `
<p style="font-size:12px;color:#6b7280;margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;line-height:1.6;">
  The Pep Planner · contact@thepepplanner.com<br/>
  You received this because you opted in to shop updates.<br/>
  <a href="${url}" style="color:#5a7a6a;text-decoration:underline;">Unsubscribe from promotional emails</a>
</p>`.trim();
}

/** Append CAN-SPAM unsubscribe footer to any HTML email body. */
function appendMarketingUnsubscribeFooter(html, email) {
  const footer = buildMarketingUnsubscribeFooterHtml(email);
  if (!html || !email) return html || '';
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`);
  }
  return `${html}\n${footer}`;
}

async function applyMarketingOptOut(normalized, displayEmail, { reason, source, updatedBy = null } = {}) {
  const ref = admin.firestore().collection('shopMarketingContacts').doc(marketingDocId(normalized));
  const patch = {
    email: normalized,
    displayEmail: (displayEmail || normalized).trim(),
    marketingOptIn: false,
    marketingOptOutAt: admin.firestore.FieldValue.serverTimestamp(),
    optOutReason: reason || 'Customer unsubscribe',
    unsubscribeSource: source || 'web',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (updatedBy) patch.updatedBy = updatedBy;
  await ref.set(patch, { merge: true });
}

/**
 * Sync marketing preference from a completed shop order.
 * Opt-in only when customer checked the box at checkout.
 */
async function syncMarketingContactFromOrder(db, {
  email,
  name,
  marketingConsent,
  source = 'own-site',
  orderId,
}) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  const ref = db.collection('shopMarketingContacts').doc(marketingDocId(normalized));
  const patch = {
    email: normalized,
    displayEmail: email.trim(),
    lastSource: source,
    lastOrderId: orderId || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (name?.trim()) patch.name = name.trim();

  if (marketingConsent === true) {
    patch.marketingOptIn = true;
    patch.marketingConsentAt = admin.firestore.FieldValue.serverTimestamp();
    patch.marketingOptOutAt = admin.firestore.FieldValue.delete();
    patch.optOutReason = admin.firestore.FieldValue.delete();
    patch.unsubscribeSource = admin.firestore.FieldValue.delete();
  } else if (marketingConsent === false) {
    patch.lastCheckoutDeclinedAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await ref.set(patch, { merge: true });
}

/** Public: opt out of shop promotional emails (email link or web form). */
exports.unsubscribeShopMarketingContact = onCall({ cors: true }, async (request) => {
  const { email, token } = request.data || {};
  const normalized = normalizeEmail(email);
  if (!normalized) throw new HttpsError('invalid-argument', 'Please enter a valid email address');

  if (token && !verifyUnsubscribeToken(normalized, token)) {
    throw new HttpsError('permission-denied', 'This unsubscribe link is invalid or expired. Use the form below.');
  }

  await applyMarketingOptOut(normalized, email, {
    reason: 'Customer unsubscribe',
    source: token ? 'email_link' : 'web_form',
  });

  return { success: true, email: normalized, alreadyOptedOut: false };
});

/** Admin: mark a contact opted in/out of promotional email. */
exports.updateShopMarketingOptIn = onCall({ cors: true }, async (request) => {
  const adminEmail = requireAdmin(request);
  const { email, marketingOptIn, reason } = request.data || {};
  const normalized = normalizeEmail(email);
  if (!normalized) throw new HttpsError('invalid-argument', 'Valid email is required');

  const ref = admin.firestore().collection('shopMarketingContacts').doc(marketingDocId(normalized));
  const patch = {
    email: normalized,
    displayEmail: email.trim(),
    marketingOptIn: marketingOptIn === true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminEmail,
  };

  if (marketingOptIn === true) {
    patch.marketingConsentAt = admin.firestore.FieldValue.serverTimestamp();
    patch.marketingOptOutAt = admin.firestore.FieldValue.delete();
    patch.optOutReason = admin.firestore.FieldValue.delete();
    patch.unsubscribeSource = admin.firestore.FieldValue.delete();
  } else {
    patch.marketingOptOutAt = admin.firestore.FieldValue.serverTimestamp();
    patch.optOutReason = reason?.trim() || 'Admin opt-out';
    patch.unsubscribeSource = 'admin';
  }

  await ref.set(patch, { merge: true });
  return { success: true, email: normalized, marketingOptIn: marketingOptIn === true };
});

module.exports.syncMarketingContactFromOrder = syncMarketingContactFromOrder;
module.exports.marketingDocId = marketingDocId;
module.exports.normalizeEmail = normalizeEmail;
module.exports.createUnsubscribeToken = createUnsubscribeToken;
module.exports.verifyUnsubscribeToken = verifyUnsubscribeToken;
module.exports.buildMarketingUnsubscribeUrl = buildMarketingUnsubscribeUrl;
module.exports.buildMarketingUnsubscribeFooterHtml = buildMarketingUnsubscribeFooterHtml;
module.exports.appendMarketingUnsubscribeFooter = appendMarketingUnsubscribeFooter;
