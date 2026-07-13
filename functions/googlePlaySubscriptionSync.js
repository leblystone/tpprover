/**
 * Google Play → Firestore subscription sync (admin reconciliation).
 */
const admin = require('firebase-admin');
const { google } = require('googleapis');
const { logger } = require('firebase-functions');

const PACKAGE_NAME = 'com.thepepplanner.app';

function getPlayClient() {
  const keyValue = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY;
  if (!keyValue) return null;
  try {
    const credentials = JSON.parse(keyValue.trim().replace(/\r?\n/g, ''));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    return google.androidpublisher({ version: 'v3', auth });
  } catch (e) {
    logger.error('Google Play client init failed', e.message);
    return null;
  }
}

async function fetchGooglePlaySubscription(productId, purchaseToken) {
  const client = getPlayClient();
  if (!client) return null;
  const response = await client.purchases.subscriptions.get({
    packageName: PACKAGE_NAME,
    subscriptionId: productId,
    token: purchaseToken,
  });
  return response.data;
}

function mapGooglePlayToSubscription(productId, purchaseToken, data) {
  const expiryMs = data.expiryTimeMillis ? parseInt(data.expiryTimeMillis, 10) : 0;
  const now = Date.now();
  const autoRenew = data.autoRenewing === true;
  let status = 'active';
  if (expiryMs && expiryMs <= now) status = 'expired';
  if (data.cancelReason != null && data.cancelReason !== 0) status = 'canceled';

  return {
    status,
    plan: productId,
    interval: productId.includes('annual') || productId.includes('year') ? 'year' : 'month',
    paymentProvider: 'googleplay',
    source: 'googleplay',
    platform: 'google-play',
    googlePlayProductId: productId,
    googlePlayPurchaseToken: purchaseToken,
    currentPeriodStart: data.startTimeMillis
      ? new Date(parseInt(data.startTimeMillis, 10)).toISOString()
      : null,
    currentPeriodEnd: expiryMs ? new Date(expiryMs).toISOString() : null,
    cancelAtPeriodEnd: !autoRenew,
    isAutoRenewing: autoRenew,
    cancelReason: data.cancelReason ?? null,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function writeGooglePlaySubscription(db, userId, subscriptionData) {
  const ts = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('userSubscriptions').doc(userId).set(
    { subscription: subscriptionData, lastUpdated: ts, lastReconciledAt: ts },
    { merge: true }
  );
  await db.collection('users').doc(userId).set(
    { subscription: subscriptionData, updatedAt: ts },
    { merge: true }
  );
}

async function resolveGooglePlayCredentials(db, userId) {
  const subDoc = await db.collection('userSubscriptions').doc(userId).get();
  const sub = subDoc.exists ? subDoc.data()?.subscription : null;
  const userDoc = await db.collection('users').doc(userId).get();
  const userSub = userDoc.exists ? userDoc.data()?.subscription : null;
  const merged = { ...(userSub || {}), ...(sub || {}) };
  const token = merged.googlePlayPurchaseToken;
  const productId = merged.googlePlayProductId;
  if (token && productId) return { token, productId };
  return null;
}

async function syncUserGooglePlayFromStore(db, userId, options = {}) {
  const logContext = options.logContext || {};
  const subDoc = await db.collection('userSubscriptions').doc(userId).get();
  const beforeSub = subDoc.exists ? subDoc.data()?.subscription : null;

  const creds = await resolveGooglePlayCredentials(db, userId);
  if (!creds) {
    return { success: false, userId, reason: 'no_google_play_token' };
  }
  const data = await fetchGooglePlaySubscription(creds.productId, creds.token);
  if (!data) {
    return { success: false, userId, reason: 'google_play_api_failed' };
  }
  const subscriptionData = mapGooglePlayToSubscription(creds.productId, creds.token, data);
  await writeGooglePlaySubscription(db, userId, subscriptionData);

  let logged = false;
  if (logContext.runId) {
    const { logIfSubscriptionChanged } = require('./subscriptionReconciliationLog');
    logged = await logIfSubscriptionChanged(db, {
      runId: logContext.runId,
      userId,
      platform: 'googleplay',
      beforeSub,
      afterSub: subscriptionData,
      trigger: logContext.trigger,
      runBy: logContext.runBy,
      changeType: options.changeType,
      forceLog: options.forceLog,
    });
  }

  return {
    success: true,
    userId,
    status: subscriptionData.status,
    cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
    logged,
  };
}

async function collectGooglePlayUserIds(db) {
  const ids = new Set();
  const subSnap = await db.collection('userSubscriptions').get();
  for (const doc of subSnap.docs) {
    const sub = doc.data()?.subscription;
    if (sub?.googlePlayPurchaseToken && sub?.googlePlayProductId) ids.add(doc.id);
    if (
      sub?.paymentProvider === 'googleplay' ||
      sub?.source === 'googleplay' ||
      sub?.platform === 'google-play'
    ) {
      if (sub?.googlePlayPurchaseToken) ids.add(doc.id);
    }
  }
  return Array.from(ids);
}

async function runGooglePlayReconciliation(db, options = {}) {
  const maxUsers = options.maxUsers ?? 500;
  const userIds = (await collectGooglePlayUserIds(db)).slice(0, maxUsers);
  let synced = 0;
  let failed = 0;
  let skipped = 0;
  let logged = 0;
  if (options.logContext) {
    options.logContext.onLogged = () => { logged += 1; };
  }

  for (const userId of userIds) {
    try {
      const subDoc = await db.collection('userSubscriptions').doc(userId).get();
      const beforeSub = subDoc.exists ? subDoc.data()?.subscription : null;
      const changeType = !beforeSub?.googlePlayPurchaseToken ? 'missing_restored' : 'drift_corrected';

      const result = await syncUserGooglePlayFromStore(db, userId, {
        logContext: options.logContext,
        changeType,
      });
      if (result.success) {
        synced++;
        if (result.logged) options.logContext?.onLogged?.();
      } else if (result.reason === 'no_google_play_token') skipped++;
      else failed++;
    } catch (e) {
      failed++;
      logger.warn(`Google Play sync failed for ${userId}`, e.message);
    }
  }

  return { usersScanned: userIds.length, synced, skipped, failed, logged };
}

module.exports = {
  syncUserGooglePlayFromStore,
  runGooglePlayReconciliation,
  collectGooglePlayUserIds,
};
