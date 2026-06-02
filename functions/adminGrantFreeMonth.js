/**
 * adminGrantFreeMonth
 *
 * Grants a free month to an active paid subscriber WITHOUT causing a double-charge.
 *
 * Platform behavior:
 *  - Stripe:       Calls stripe.subscriptions.update({ trial_end }) to push the next
 *                  payment date forward. Stripe will NOT collect payment until the new date.
 *  - Google Play:  Calls purchases.subscriptions.defer to tell Google to push the next
 *                  billing date. Google will NOT charge until the deferred date.
 *  - Apple IAP:    Apple has NO developer-side defer API. We extend currentPeriodEnd in
 *                  Firestore (user gets app access) but Apple WILL still charge on their
 *                  original schedule. The response includes a warning + App Store Connect link.
 *
 * Admin-only (verifies caller email against ADMIN_EMAILS list via shared verifyAdmin pattern).
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const ADMIN_EMAILS = [
  'admin@thepepplanner.com',
  'lebro@thepepplanner.com',
];

const PACKAGE_NAME = 'com.thepepplanner.app';
const FREE_MONTH_DAYS = 30;

function verifyAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const callerEmail = request.auth.token.email;
  if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
  return callerEmail;
}

// ─── Stripe ──────────────────────────────────────────────────────────────────

async function grantFreeMonthStripe({ stripeSubscriptionId, currentPeriodEnd, userId, db, adminEmail, note }) {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  // Calculate new period end: currentPeriodEnd + 30 days (or now + 30 if missing)
  const baseDate = currentPeriodEnd ? new Date(currentPeriodEnd) : new Date();
  const newEndDate = new Date(baseDate.getTime() + FREE_MONTH_DAYS * 24 * 60 * 60 * 1000);
  const newEndUnix = Math.floor(newEndDate.getTime() / 1000);

  // Tell Stripe to skip the next charge until the new date.
  // trial_end on an active subscription pushes the billing date forward without
  // cancelling or downgrading — Stripe treats it as a billing pause.
  const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
    trial_end: newEndUnix,
    proration_behavior: 'none',
  });

  const confirmedEnd = new Date(updated.current_period_end * 1000).toISOString();

  // Mirror in Firestore
  await _writeFirestore({ userId, db, newEndIso: confirmedEnd, adminEmail, note, provider: 'stripe' });

  return {
    platformSkipped: true,
    newPeriodEnd: confirmedEnd,
    warning: null,
  };
}

// ─── Google Play ─────────────────────────────────────────────────────────────

async function grantFreeMonthGooglePlay({ googlePlayPurchaseToken, googlePlayProductId, currentPeriodEnd, userId, db, adminEmail, note }) {
  const { google } = require('googleapis');

  const keyValue = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY;
  if (!keyValue) throw new HttpsError('internal', 'Google Play service account not configured');

  const serviceAccountKey = JSON.parse(keyValue.trim().replace(/\r?\n/g, ''));
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountKey,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const androidpublisher = google.androidpublisher({ version: 'v3', auth });

  const baseDate = currentPeriodEnd ? new Date(currentPeriodEnd) : new Date();
  const expectedExpiryMs = baseDate.getTime();
  const newExpiryMs = baseDate.getTime() + FREE_MONTH_DAYS * 24 * 60 * 60 * 1000;

  // purchases.subscriptions.defer tells Google Play to move the next billing date.
  // Google will NOT charge the user until desiredExpiryTimeMillis.
  const response = await androidpublisher.purchases.subscriptions.defer({
    packageName: PACKAGE_NAME,
    subscriptionId: googlePlayProductId,
    token: googlePlayPurchaseToken,
    requestBody: {
      deferralInfo: {
        expectedExpiryTimeMillis: String(expectedExpiryMs),
        desiredExpiryTimeMillis: String(newExpiryMs),
      },
    },
  });

  const confirmedEndMs = parseInt(response.data.newExpiryTimeMillis, 10);
  const confirmedEnd = new Date(confirmedEndMs).toISOString();

  await _writeFirestore({ userId, db, newEndIso: confirmedEnd, adminEmail, note, provider: 'google_play' });

  return {
    platformSkipped: true,
    newPeriodEnd: confirmedEnd,
    warning: null,
  };
}

// ─── Apple IAP ───────────────────────────────────────────────────────────────

async function grantFreeMonthApple({ currentPeriodEnd, userId, db, adminEmail, note }) {
  // Apple has NO developer API to defer or skip a charge.
  // We extend Firestore so the user has app access, but Apple will still charge
  // on their original billing schedule.
  const baseDate = currentPeriodEnd ? new Date(currentPeriodEnd) : new Date();
  const newEndDate = new Date(baseDate.getTime() + FREE_MONTH_DAYS * 24 * 60 * 60 * 1000);
  const newEndIso = newEndDate.toISOString();

  await _writeFirestore({ userId, db, newEndIso, adminEmail, note, provider: 'apple' });

  return {
    platformSkipped: false,
    newPeriodEnd: newEndIso,
    warning: 'Apple IAP has no developer API to defer charges. The user\'s app access has been extended in Firestore but Apple WILL still charge them on their original schedule. To prevent the charge, issue a manual refund in App Store Connect: https://appstoreconnect.apple.com',
  };
}

// ─── Shared Firestore write ───────────────────────────────────────────────────

async function _writeFirestore({ userId, db, newEndIso, adminEmail, note, provider }) {
  const now = new Date();
  const historyEntry = {
    eventType: 'admin_free_month_grant',
    title: 'Free month granted by admin',
    description: `Admin ${adminEmail} granted a free month (+${FREE_MONTH_DAYS} days). Provider: ${provider}. Note: ${note || '(none)'}`,
    severity: 'info',
    source: 'admin_free_month',
    grantedBy: adminEmail,
    addedDays: FREE_MONTH_DAYS,
    newPeriodEnd: newEndIso,
    note: note || '',
    eventTimestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  const subRef = db.collection('userSubscriptions').doc(userId);
  const batch = db.batch();

  batch.set(subRef, {
    subscription: {
      currentPeriodEnd: newEndIso,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    },
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  batch.set(subRef.collection('history').doc(), historyEntry);

  // Mirror on users doc
  batch.set(db.collection('users').doc(userId), {
    subscription: {
      currentPeriodEnd: newEndIso,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await batch.commit();
}

// ─── Export ───────────────────────────────────────────────────────────────────

exports.adminGrantFreeMonth = onCall(
  { cors: true },
  async (request) => {
    const adminEmail = verifyAdmin(request);
    const { userId, note } = request.data;

    if (!userId) throw new HttpsError('invalid-argument', 'userId is required');

    const db = admin.firestore();

    const [userDoc, subDoc] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('userSubscriptions').doc(userId).get(),
    ]);

    if (!userDoc.exists) throw new HttpsError('not-found', 'User not found');

    const subData = subDoc.exists ? subDoc.data() : {};
    const sub = subData.subscription || userDoc.data()?.subscription || {};

    const provider = (sub.paymentProvider || sub.source || '').toLowerCase();
    const status = (sub.status || '').toLowerCase();
    const interval = (sub.interval || '').toLowerCase();

    // Guard: don't run on trials, expired, refunded, or lifetime accounts
    if (!status || status === 'trialing') {
      throw new HttpsError('failed-precondition', 'User is on a trial — use "Add Research Time" instead.');
    }
    if (['refunded', 'disputed', 'revoked', 'canceled', 'cancelled'].includes(status)) {
      throw new HttpsError('failed-precondition', `Cannot grant free month to a ${status} subscription.`);
    }
    if (interval === 'lifetime' || sub.hasLifetimeAccess) {
      throw new HttpsError('failed-precondition', 'User already has lifetime access — no billing to defer.');
    }

    logger.info(`💳 Admin free month grant for user ${userId} by ${adminEmail} (provider: ${provider})`);

    let result;

    if (provider === 'stripe') {
      if (!sub.stripeSubscriptionId) {
        throw new HttpsError('failed-precondition', 'No stripeSubscriptionId on this user\'s subscription.');
      }
      result = await grantFreeMonthStripe({
        stripeSubscriptionId: sub.stripeSubscriptionId,
        currentPeriodEnd: sub.currentPeriodEnd,
        userId, db, adminEmail, note,
      });

    } else if (provider === 'google_play' || provider === 'google' || provider === 'android') {
      if (!sub.googlePlayPurchaseToken) {
        throw new HttpsError('failed-precondition', 'No googlePlayPurchaseToken found — cannot defer Google Play billing.');
      }
      const productId = sub.googlePlayProductId || sub.appleProductId || sub.productId;
      if (!productId) {
        throw new HttpsError('failed-precondition', 'No googlePlayProductId found — cannot defer Google Play billing.');
      }
      result = await grantFreeMonthGooglePlay({
        googlePlayPurchaseToken: sub.googlePlayPurchaseToken,
        googlePlayProductId: productId,
        currentPeriodEnd: sub.currentPeriodEnd,
        userId, db, adminEmail, note,
      });

    } else if (provider === 'apple' || provider === 'appstore') {
      result = await grantFreeMonthApple({
        currentPeriodEnd: sub.currentPeriodEnd,
        userId, db, adminEmail, note,
      });

    } else {
      // Unknown provider — safe Firestore-only extend with a warning
      const baseDate = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : new Date();
      const newEndIso = new Date(baseDate.getTime() + FREE_MONTH_DAYS * 24 * 60 * 60 * 1000).toISOString();
      await _writeFirestore({ userId, db, newEndIso, adminEmail, note, provider: provider || 'unknown' });
      result = {
        platformSkipped: false,
        newPeriodEnd: newEndIso,
        warning: `Unknown payment provider "${provider}". Firestore updated only — verify billing manually.`,
      };
    }

    logger.info(`✅ Free month granted for ${userId}. New period end: ${result.newPeriodEnd}. Platform charge skipped: ${result.platformSkipped}`);

    return {
      success: true,
      userId,
      provider,
      platformChargeSkipped: result.platformSkipped,
      newPeriodEnd: result.newPeriodEnd,
      warning: result.warning || null,
      message: result.platformSkipped
        ? `✅ Free month granted. Next charge pushed to ${new Date(result.newPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. ${provider === 'stripe' ? 'Stripe' : 'Google Play'} has been told to skip the next payment.`
        : `✅ App access extended to ${new Date(result.newPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. ${result.warning || ''}`,
    };
  }
);
