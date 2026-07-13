/**
 * Admin-triggered subscription reconciliation (Stripe, Google Play, Apple).
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const {
  runDailyStripeReconciliation,
  syncUserSubscriptionFromStripe,
} = require('./stripeSubscriptionSync');
const {
  runGooglePlayReconciliation,
  syncUserGooglePlayFromStore,
} = require('./googlePlaySubscriptionSync');
const {
  newRunId,
  logIfSubscriptionChanged,
  fetchReconciliationLogs,
} = require('./subscriptionReconciliationLog');

const ADMIN_EMAILS = [
  'lebrockmaldonado@gmail.com',
  'contact@thepepplanner.com',
  'thepepplanner@gmail.com',
];

async function ensureAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  const callerEmail = (request.auth.token && request.auth.token.email) || '';
  if (callerEmail && ADMIN_EMAILS.includes(callerEmail.toLowerCase())) return;
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const data = userDoc.exists ? userDoc.data() : {};
  const docEmail = (data.email || '').toLowerCase();
  if (ADMIN_EMAILS.includes(docEmail) || data.role === 'admin') return;
  throw new HttpsError('permission-denied', 'Admin access required');
}

/**
 * Apple: no polling API without App Store Server credentials.
 * Re-merge known Firestore fields so cancel flags stay consistent.
 */
async function syncUserAppleFromFirestore(db, userId, options = {}) {
  const logContext = options.logContext || {};
  const subDoc = await db.collection('userSubscriptions').doc(userId).get();
  const sub = subDoc.exists ? subDoc.data()?.subscription : null;
  const userDoc = await db.collection('users').doc(userId).get();
  const userSub = userDoc.exists ? userDoc.data()?.subscription : null;
  const beforeSub = { ...(userSub || {}), ...(sub || {}) };
  const merged = { ...beforeSub };

  const isApple =
    merged.paymentProvider === 'apple' ||
    merged.source === 'apple' ||
    merged.platform === 'apple' ||
    merged.appleOriginalTransactionId ||
    merged.appleTransactionId;

  if (!isApple) {
    return { success: false, userId, reason: 'no_apple_subscription' };
  }

  const autoRenewOff = merged.cancelAtPeriodEnd === true || merged.status === 'canceling';
  const normalized = {
    ...merged,
    paymentProvider: 'apple',
    platform: 'apple',
    cancelAtPeriodEnd: autoRenewOff,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ts = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('userSubscriptions').doc(userId).set(
    { subscription: normalized, lastUpdated: ts, lastReconciledAt: ts },
    { merge: true }
  );
  await db.collection('users').doc(userId).set({ subscription: normalized, updatedAt: ts }, { merge: true });

  let logged = false;
  if (logContext.runId) {
    logged = await logIfSubscriptionChanged(db, {
      runId: logContext.runId,
      userId,
      platform: 'apple',
      beforeSub,
      afterSub: normalized,
      trigger: logContext.trigger,
      runBy: logContext.runBy,
      changeType: 'apple_normalized',
      note: 'Apple billing is updated via App Store webhooks; this pass normalized stored fields only.',
    });
  }

  return {
    success: true,
    userId,
    note: 'Apple billing is updated via App Store webhooks; this pass normalized stored fields only.',
    cancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
    logged,
  };
}

async function collectAppleUserIds(db) {
  const ids = new Set();
  const subSnap = await db.collection('userSubscriptions').get();
  for (const doc of subSnap.docs) {
    const sub = doc.data()?.subscription;
    if (
      sub?.appleOriginalTransactionId ||
      sub?.appleTransactionId ||
      sub?.paymentProvider === 'apple' ||
      sub?.platform === 'apple'
    ) {
      ids.add(doc.id);
    }
  }
  return Array.from(ids);
}

async function runAppleReconciliation(db, options = {}) {
  const maxUsers = options.maxUsers ?? 500;
  const userIds = (await collectAppleUserIds(db)).slice(0, maxUsers);
  let synced = 0;
  let failed = 0;
  let logged = 0;
  if (options.logContext) {
    options.logContext.onLogged = () => { logged += 1; };
  }

  for (const userId of userIds) {
    try {
      const result = await syncUserAppleFromFirestore(db, userId, { logContext: options.logContext });
      if (result.success) {
        synced++;
        if (result.logged) options.logContext?.onLogged?.();
      } else failed++;
    } catch (e) {
      failed++;
    }
  }

  return {
    usersScanned: userIds.length,
    synced,
    failed,
    logged,
    note: 'Apple renewals are driven by App Store Server Notifications; this job normalizes Firestore only.',
  };
}

async function runPlatformReconciliation(db, platform, options = {}) {
  if (platform === 'stripe') {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new HttpsError('failed-precondition', 'STRIPE_SECRET_KEY not configured');
    }
    const stripe = require('stripe')(stripeKey);
    return runDailyStripeReconciliation(db, stripe, options);
  }
  if (platform === 'googleplay' || platform === 'google_play') {
    if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY) {
      throw new HttpsError('failed-precondition', 'GOOGLE_PLAY_SERVICE_ACCOUNT_KEY not configured');
    }
    return runGooglePlayReconciliation(db, options);
  }
  if (platform === 'apple') {
    return runAppleReconciliation(db, options);
  }
  throw new HttpsError('invalid-argument', 'platform must be stripe, googleplay, or apple');
}

async function syncSingleUser(db, platform, userId, logContext) {
  const opts = { logContext, forceLog: true, changeType: 'manual_sync' };
  if (platform === 'stripe') {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new HttpsError('failed-precondition', 'STRIPE_SECRET_KEY not configured');
    const stripe = require('stripe')(stripeKey);
    return syncUserSubscriptionFromStripe(db, stripe, userId, opts);
  }
  if (platform === 'googleplay' || platform === 'google_play') {
    return syncUserGooglePlayFromStore(db, userId, opts);
  }
  if (platform === 'apple') {
    return syncUserAppleFromFirestore(db, userId, opts);
  }
  throw new HttpsError('invalid-argument', 'platform must be stripe, googleplay, or apple');
}

exports.adminRunSubscriptionReconciliation = onCall(
  {
    cors: true,
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async (request) => {
    await ensureAdmin(request);
    const { platform = 'all', userId } = request.data || {};
    const db = admin.firestore();
    const runBy = request.auth.token?.email || request.auth.uid;
    const trigger = userId ? 'manual_user' : 'manual_bulk';
    const runId = newRunId(trigger);
    const logContext = { runId, trigger, runBy };

    if (userId) {
      const plat = platform === 'all' ? 'stripe' : platform;
      if (platform === 'all') {
        const results = {};
        let logged = 0;
        for (const p of ['stripe', 'googleplay', 'apple']) {
          try {
            results[p] = await syncSingleUser(db, p, userId, logContext);
            if (results[p].logged) logged++;
          } catch (e) {
            results[p] = { success: false, error: e.message };
          }
        }
        const logs = await fetchReconciliationLogs(db, { runId, limit: 20 });
        return { success: true, userId, runId, logged, results, logs };
      }
      const result = await syncSingleUser(db, plat, userId, logContext);
      const logs = await fetchReconciliationLogs(db, { runId, limit: 10 });
      return { success: result.success !== false, userId, platform: plat, runId, logs, ...result };
    }

    const platforms =
      platform === 'all' ? ['stripe', 'googleplay', 'apple'] : [platform];

    const summary = {};
    let totalLogged = 0;
    for (const p of platforms) {
      try {
        summary[p] = await runPlatformReconciliation(db, p, { maxUsers: 2000, logContext });
        totalLogged += summary[p].logged || 0;
      } catch (e) {
        summary[p] = { error: e.message };
        logger.error(`Reconciliation failed for ${p}`, e);
      }
    }

    const logs = await fetchReconciliationLogs(db, { runId, limit: 100 });

    await db.collection('systemMetrics').doc('subscriptionReconciliation').set(
      {
        lastManualRunAt: admin.firestore.FieldValue.serverTimestamp(),
        lastManualRunBy: runBy,
        lastRunId: runId,
        summary,
        totalLogged,
      },
      { merge: true }
    );

    return { success: true, runId, totalLogged, summary, logs };
  }
);

exports.getAdminSubscriptionReconciliationLog = onCall(
  { cors: true },
  async (request) => {
    await ensureAdmin(request);
    const { limit = 50, runId } = request.data || {};
    const db = admin.firestore();
    const logs = await fetchReconciliationLogs(db, { limit, runId });
    return { success: true, logs };
  }
);
