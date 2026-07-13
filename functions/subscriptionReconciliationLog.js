/**
 * Audit log for subscription reconciliation (Stripe / Google Play / Apple).
 */
const admin = require('firebase-admin');

const COLLECTION = 'subscriptionReconciliationLog';

function snapshotSubscription(sub) {
  if (!sub || typeof sub !== 'object') return null;
  return {
    status: sub.status ?? null,
    plan: sub.plan ?? null,
    interval: sub.interval ?? null,
    paymentProvider: sub.paymentProvider || sub.source || sub.platform || null,
    cancelAtPeriodEnd: !!(sub.cancelAtPeriodEnd || sub.cancel_at_period_end),
    currentPeriodEnd: sub.currentPeriodEnd ?? null,
    stripeSubscriptionId: sub.stripeSubscriptionId ?? null,
    googlePlayProductId: sub.googlePlayProductId ?? null,
    appleOriginalTransactionId: sub.appleOriginalTransactionId ?? null,
  };
}

function inferChangeType(beforeSnap, platform) {
  if (!beforeSnap) return 'missing_restored';
  if (platform === 'stripe' && !beforeSnap.stripeSubscriptionId) return 'missing_restored';
  if (platform === 'googleplay' && !beforeSnap.googlePlayProductId) return 'missing_restored';
  if (platform === 'apple' && !beforeSnap.paymentProvider) return 'missing_restored';
  return 'drift_corrected';
}

function newRunId(trigger) {
  const t = new Date().toISOString().replace(/[:.]/g, '-');
  return `${trigger}-${t}`;
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {object} entry
 */
async function logSubscriptionReconciliation(db, entry) {
  const {
    runId,
    userId,
    userEmail,
    platform,
    changeType,
    before,
    after,
    trigger,
    runBy,
    note,
  } = entry;

  await db.collection(COLLECTION).add({
    runId: runId || 'unknown',
    userId,
    userEmail: userEmail || null,
    platform,
    changeType: changeType || 'updated',
    before: snapshotSubscription(before),
    after: snapshotSubscription(after),
    trigger: trigger || 'unknown',
    runBy: runBy || null,
    note: note || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function fetchUserEmail(db, userId) {
  try {
    const snap = await db.collection('users').doc(userId).get();
    return snap.exists ? snap.data()?.email || null : null;
  } catch (_) {
    return null;
  }
}

/**
 * Log a successful sync if before/after differ or data was missing.
 */
async function logIfSubscriptionChanged(db, opts) {
  const {
    runId,
    userId,
    platform,
    beforeSub,
    afterSub,
    trigger,
    runBy,
    changeType: explicitType,
    note,
    forceLog,
  } = opts;

  const before = snapshotSubscription(beforeSub);
  const after = snapshotSubscription(afterSub);
  const missingBefore = !beforeSub || inferChangeType(before, platform) === 'missing_restored';
  const changed = JSON.stringify(before) !== JSON.stringify(after);

  if (!forceLog && !missingBefore && !changed) return false;

  const email = await fetchUserEmail(db, userId);
  await logSubscriptionReconciliation(db, {
    runId,
    userId,
    userEmail: email,
    platform,
    changeType: explicitType || inferChangeType(before, platform),
    before: beforeSub,
    after: afterSub,
    trigger,
    runBy,
    note,
  });
  return true;
}

async function fetchReconciliationLogs(db, { limit = 50, runId } = {}) {
  const fetchLimit = runId ? Math.min(500, limit * 10) : Math.min(limit, 200);
  const snap = await db.collection(COLLECTION).orderBy('createdAt', 'desc').limit(fetchLimit).get();
  let rows = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      ...d,
      createdAt: d.createdAt?.toDate?.() ? d.createdAt.toDate().toISOString() : d.createdAt,
    };
  });
  if (runId) {
    rows = rows.filter((r) => r.runId === runId).slice(0, limit);
  }
  return rows;
}

module.exports = {
  COLLECTION,
  newRunId,
  snapshotSubscription,
  logSubscriptionReconciliation,
  logIfSubscriptionChanged,
  fetchReconciliationLogs,
};
