const admin = require('firebase-admin');
const functions = require('firebase-functions');
const logger = require('firebase-functions/logger');
const { ADMIN_EMAILS } = require('./adminAuth');

/**
 * Audit for the Meagan-class sync failure:
 *   - userData is missing / empty / stuck on legacy v1 encrypted blob
 *   - user appears recently active (or has paid/lifetime access)
 *   - native app would therefore load empty while PWA localStorage may still have data
 *
 * Read-only. Does not mutate Firestore.
 *
 * Callable: auditStaleUserData
 * Local:    node functions/scripts/auditStaleUserData.js
 */

const MODERN_ARRAY_FIELDS = [
  'protocols', 'orders', 'stockpile', 'vendors',
  'supplements', 'reconItems', 'metrics', 'scheduledBuys',
  'wishlist', 'userNotes', 'userGoals',
];

const ACTIVE_DAYS = 90;
const STALE_CLOUD_DAYS = 60;

function toDate(raw) {
  if (!raw) return null;
  try {
    if (raw.toDate) return raw.toDate();
    if (typeof raw.seconds === 'number') return new Date(raw.seconds * 1000);
    if (typeof raw === 'number') return new Date(raw);
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function daysSince(date) {
  if (!date) return null;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

function modernItemCounts(data = {}) {
  const counts = {};
  let total = 0;
  for (const key of MODERN_ARRAY_FIELDS) {
    const n = Array.isArray(data[key]) ? data[key].length : 0;
    counts[key] = n;
    total += n;
  }
  return { counts, total };
}

function isLegacyEncryptedBlob(data = {}) {
  const encrypted = typeof data.data === 'string' && data.data.length > 20;
  const looksV1 = Boolean(data.salt) || data.version === '1.0' || data.version === '1';
  const { total } = modernItemCounts(data);
  return encrypted && looksV1 && total === 0;
}

function hasModernCloudData(data = {}) {
  return modernItemCounts(data).total > 0;
}

function subscriptionSummary(userDoc = {}, subDoc = {}) {
  const sub = subDoc.subscription || userDoc.subscription || {};
  const hasLifetime =
    sub.hasLifetimeAccess === true ||
    sub.interval === 'lifetime' ||
    userDoc.subscription?.hasLifetimeAccess === true ||
    userDoc.subscription?.interval === 'lifetime';
  const status = sub.status || userDoc.subscription?.status || 'unknown';
  const interval = sub.interval || userDoc.subscription?.interval || null;
  const isPaid =
    hasLifetime ||
    status === 'active' ||
    status === 'trialing' ||
    status === 'past_due';
  return { hasLifetime, status, interval, isPaid };
}

/**
 * Core audit. Returns a plain JSON-serializable report.
 * @param {FirebaseFirestore.Firestore} db
 */
async function runStaleUserDataAudit(db) {
  const startedAt = new Date().toISOString();
  logger.info('🔍 Starting stale userData audit...');

  const [usersSnap, userDataSnap, userdataSnap, subsSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('userData').get(),
    db.collection('userdata').get(),
    db.collection('userSubscriptions').get(),
  ]);

  const usersById = new Map(usersSnap.docs.map((d) => [d.id, d.data() || {}]));
  const userDataById = new Map(userDataSnap.docs.map((d) => [d.id, d.data() || {}]));
  const userdataById = new Map(userdataSnap.docs.map((d) => [d.id, d.data() || {}]));
  const subsById = new Map(subsSnap.docs.map((d) => [d.id, d.data() || {}]));

  const allUserIds = new Set([
    ...usersById.keys(),
    ...userDataById.keys(),
    ...userdataById.keys(),
    ...subsById.keys(),
  ]);

  const findings = {
    startedAt,
    finishedAt: null,
    totals: {
      users: usersById.size,
      userDataDocs: userDataById.size,
      userdataDocs: userdataById.size,
      userSubscriptions: subsById.size,
      scanned: allUserIds.size,
    },
    counts: {
      legacyOnlyUserData: 0,
      emptyModernUserData: 0,
      missingUserData: 0,
      hasLegacyuserdataLowercase: 0,
      recentlyActiveAtRisk: 0,
      paidAtRisk: 0,
      divergentStale: 0,
      critical: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
    },
    atRisk: [],
  };

  for (const userId of allUserIds) {
    const user = usersById.get(userId) || {};
    const cloud = userDataById.get(userId) || null;
    const legacyLower = userdataById.get(userId) || null;
    const subDoc = subsById.get(userId) || {};
    const sub = subscriptionSummary(user, subDoc);

    const lastActive = toDate(user.lastActive);
    const lastActiveDays = daysSince(lastActive);
    const recentlyActive = lastActiveDays != null && lastActiveDays <= ACTIVE_DAYS;

    const cloudLastUpdated = cloud ? toDate(cloud.lastUpdated) : null;
    const cloudAgeDays = daysSince(cloudLastUpdated);

    const legacyOnly = cloud ? isLegacyEncryptedBlob(cloud) : false;
    const modernOk = cloud ? hasModernCloudData(cloud) : false;
    const emptyModern = Boolean(cloud) && !legacyOnly && !modernOk;
    const missingUserData = !cloud;
    const hasLowercaseLegacy = Boolean(legacyLower) && (
      isLegacyEncryptedBlob(legacyLower) || hasModernCloudData(legacyLower) === false
    );

    // Risk signals — any one of these with empty/broken modern cloud is enough to flag
    const cloudBroken = legacyOnly || emptyModern || missingUserData;
    if (!cloudBroken) continue;

    if (legacyOnly) findings.counts.legacyOnlyUserData++;
    if (emptyModern) findings.counts.emptyModernUserData++;
    if (missingUserData) findings.counts.missingUserData++;
    if (legacyLower) findings.counts.hasLegacyuserdataLowercase++;

    // Skip never-active, never-paid ghosts with no signals of real usage.
    // Keep anyone paid/lifetime OR recently active OR who has any local-era lower-case data.
    const worthFlagging = sub.isPaid || recentlyActive || Boolean(legacyLower);
    if (!worthFlagging) continue;

    // Meagan pattern: user is recently active, but cloud lastUpdated is much older —
    // classic "PWA localStorage has data, Firestore never got modern writes".
    const divergentStale =
      lastActiveDays != null &&
      cloudAgeDays != null &&
      lastActiveDays <= ACTIVE_DAYS &&
      (cloudAgeDays - lastActiveDays) >= 30;

    // Priority:
    //   critical = Meagan-pattern divergence (active ≫ cloud age)
    //   high     = paid/lifetime AND (recently active OR legacy-only trap)
    //   medium   = recently active + broken cloud, OR paid but inactive
    //   low      = everyone else we still decided to flag
    let priority = 'low';
    if (divergentStale) {
      priority = 'critical';
    } else if (sub.isPaid && (recentlyActive || legacyOnly)) {
      priority = 'high';
    } else if (recentlyActive || sub.isPaid) {
      priority = 'medium';
    }

    if (priority === 'critical') findings.counts.critical = (findings.counts.critical || 0) + 1;
    else if (priority === 'high') findings.counts.highPriority++;
    else if (priority === 'medium') findings.counts.mediumPriority++;
    else findings.counts.lowPriority++;

    if (recentlyActive) findings.counts.recentlyActiveAtRisk++;
    if (sub.isPaid) findings.counts.paidAtRisk++;
    if (divergentStale) findings.counts.divergentStale = (findings.counts.divergentStale || 0) + 1;

    const modernCounts = cloud ? modernItemCounts(cloud).counts : {};

    findings.atRisk.push({
      userId,
      email: user.email || 'N/A',
      priority,
      reasons: [
        legacyOnly ? 'legacy_encrypted_userData_only' : null,
        emptyModern ? 'empty_modern_userData' : null,
        missingUserData ? 'missing_userData_doc' : null,
        legacyLower && !modernOk ? 'has_lowercase_userdata_without_modern_cloud' : null,
        recentlyActive && cloudAgeDays != null && cloudAgeDays >= STALE_CLOUD_DAYS
          ? 'active_but_cloud_stale'
          : null,
        divergentStale ? 'divergent_active_vs_cloud' : null,
        sub.hasLifetime ? 'lifetime' : null,
      ].filter(Boolean),
      subscription: {
        status: sub.status,
        interval: sub.interval,
        hasLifetime: sub.hasLifetime,
        isPaid: sub.isPaid,
      },
      lastActive: lastActive ? lastActive.toISOString() : null,
      lastActiveDaysAgo: lastActiveDays != null ? Math.round(lastActiveDays) : null,
      cloudLastUpdated: cloudLastUpdated ? cloudLastUpdated.toISOString() : null,
      cloudAgeDays: cloudAgeDays != null ? Math.round(cloudAgeDays) : null,
      modernCounts,
      flags: {
        legacyOnlyUserData: legacyOnly,
        emptyModernUserData: emptyModern,
        missingUserData,
        hasLowercaseuserdata: Boolean(legacyLower),
        lowercaseIsLegacyBlob: legacyLower ? isLegacyEncryptedBlob(legacyLower) : false,
      },
    });
  }

  // Sort: critical → high → medium → low; within tier, recently active first
  const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.atRisk.sort((a, b) => {
    const pr = priorityRank[a.priority] - priorityRank[b.priority];
    if (pr !== 0) return pr;
    const aDays = a.lastActiveDaysAgo ?? 9999;
    const bDays = b.lastActiveDaysAgo ?? 9999;
    return aDays - bDays;
  });

  findings.finishedAt = new Date().toISOString();
  logger.info(
    `✅ Stale userData audit complete: ${findings.atRisk.length} at-risk ` +
    `(high=${findings.counts.highPriority}, medium=${findings.counts.mediumPriority}, low=${findings.counts.lowPriority})`
  );

  return findings;
}

/**
 * Admin callable — read-only fleet audit.
 */
exports.auditStaleUserData = functions.https.onCall(async (data, context) => {
  // Mirror auditLifetimeAccess (v1 callable): auth via token email.
  // Note: adminAuth.verifyAdmin expects the v2 `request` shape; adapt here.
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  const callerEmail = (context.auth.token?.email || '').toLowerCase();
  if (!ADMIN_EMAILS.includes(callerEmail)) {
    // Fallback: role=admin on users doc
    const dbCheck = admin.firestore();
    const userDoc = await dbCheck.collection('users').doc(context.auth.uid).get();
    const role = userDoc.exists ? userDoc.data()?.role : null;
    const docEmail = (userDoc.exists ? userDoc.data()?.email : '' || '').toLowerCase();
    if (role !== 'admin' && !ADMIN_EMAILS.includes(docEmail)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
  }

  try {
    const findings = await runStaleUserDataAudit(admin.firestore());
    return { success: true, findings };
  } catch (error) {
    logger.error('❌ Stale userData audit failed:', error);
    throw new functions.https.HttpsError('internal', `Audit failed: ${error.message}`);
  }
});

// Shared for the local script
exports.runStaleUserDataAudit = runStaleUserDataAudit;
