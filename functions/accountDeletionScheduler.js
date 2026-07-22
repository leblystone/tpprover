/**
 * Schedule account deletions after billing period ends (Stripe, Google Play, Apple).
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { ensureAdmin } = require('./adminAuth');
const emailService = require('./emailService');
const {
  normalizeSub,
  parseDate,
  normalizePaymentProvider,
  resolveScheduledDeleteAt,
  getSubscriptionBillingSnapshot,
  schedulePlatformCancellation,
  revertPlatformCancellation,
  executeFullAccountDeletion,
} = require('./accountDeletionCore');

function formatDisplayDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });
}

async function loadSubscriptionForUser(db, userId) {
  const snap = await db.collection('userSubscriptions').doc(userId).get();
  return snap.exists ? snap.data() : null;
}

function buildPreviewFromSubscription(subscriptionDoc) {
  const snapshot = getSubscriptionBillingSnapshot(subscriptionDoc);
  return {
    provider: snapshot.provider,
    providerLabel: snapshot.providerLabel,
    status: snapshot.status,
    interval: snapshot.interval,
    currentPeriodEnd: snapshot.currentPeriodEnd,
    canSchedule: snapshot.canSchedule,
    scheduleBlockReason: snapshot.scheduleBlockReason,
    scheduledDeleteAt: snapshot.scheduledDeleteAt
      ? snapshot.scheduledDeleteAt.toISOString()
      : null,
    displayDate: snapshot.scheduledDeleteAt
      ? formatDisplayDate(snapshot.scheduledDeleteAt)
      : null,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
  };
}

async function scheduleDeletionRequest(db, requestId, request, adminUid) {
  const subscriptionDoc = await loadSubscriptionForUser(db, request.userId);
  const snapshot = getSubscriptionBillingSnapshot(subscriptionDoc);

  if (!snapshot.canSchedule || !snapshot.scheduledDeleteAt) {
    throw new HttpsError(
      'failed-precondition',
      snapshot.scheduleBlockReason ||
        'Cannot schedule deletion. Use immediate delete or verify userSubscriptions.'
    );
  }

  const scheduledDeleteAt = snapshot.scheduledDeleteAt;
  const sub = normalizeSub(subscriptionDoc);

  const platformSchedule = await schedulePlatformCancellation({
    snapshot,
    userId: request.userId,
    db,
    subscriptionDocData: subscriptionDoc,
  });

  const requestRef = db.collection('accountDeletionRequests').doc(requestId);
  await requestRef.update({
    status: 'scheduled',
    scheduledDeleteAt: admin.firestore.Timestamp.fromDate(scheduledDeleteAt),
    scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
    scheduledBy: adminUid || 'admin',
    platformSchedule: {
      provider: platformSchedule.provider,
      ok: platformSchedule.ok === true,
      action: platformSchedule.action || null,
      warning: platformSchedule.warning || null,
      at: admin.firestore.FieldValue.serverTimestamp(),
    },
    stripeCancelAtPeriodEnd:
      platformSchedule.provider === 'stripe' && platformSchedule.ok === true,
    subscriptionInfo: {
      ...(request.subscriptionInfo || {}),
      hasSubscription: true,
      canSchedule: true,
      status: sub?.status || request.subscriptionInfo?.status || 'active',
      stripeSubscriptionId: snapshot.stripeSubId || null,
      paymentProvider: snapshot.provider,
      currentPeriodEnd: snapshot.currentPeriodEnd || scheduledDeleteAt.toISOString(),
      interval: snapshot.interval || null,
      hasGooglePlay: !!(snapshot.gpToken && snapshot.gpProductId),
      hasApple: snapshot.hasApple,
    },
  });

  try {
    await emailService.sendAccountDeletionScheduledEmail(
      request.userEmail,
      request.userName,
      scheduledDeleteAt,
      { paymentProvider: snapshot.provider }
    );
  } catch (emailErr) {
    logger.warn(`⚠️ Scheduled deletion email failed: ${emailErr.message}`);
  }

  return {
    scheduledDeleteAt: scheduledDeleteAt.toISOString(),
    displayDate: formatDisplayDate(scheduledDeleteAt),
    platformSchedule,
    paymentProvider: snapshot.provider,
    providerLabel: snapshot.providerLabel,
  };
}

function shouldDeferScheduledDeletion(sub, request) {
  const provider =
    request.platformSchedule?.provider ||
    normalizePaymentProvider(sub) ||
    request.subscriptionInfo?.paymentProvider;

  const periodEnd = parseDate(sub?.currentPeriodEnd);
  const status = (sub?.status || '').toLowerCase();
  const now = Date.now();

  // If cancel_at_period_end was already applied (Stripe renewals stopped, or Apple/GP flagged),
  // the admin has already committed to the deletion — proceed regardless of live sub status.
  // This handles Firestore lag where the sub still shows 'active' after the period ended.
  const cancelAtPeriodEnd = !!(
    sub?.cancelAtPeriodEnd ||
    request.stripeCancelAtPeriodEnd ||
    request.platformSchedule?.ok === true
  );
  if (cancelAtPeriodEnd) {
    return { defer: false };
  }

  if (periodEnd && periodEnd.getTime() > now + 15 * 60 * 1000) {
    if (provider === 'apple') {
      const stillRenewing =
        ['active', 'trialing'].includes(status) &&
        sub?.cancelAtPeriodEnd !== true &&
        request.platformSchedule?.action === 'firestore_only';
      if (stillRenewing) {
        return {
          defer: true,
          reason: 'Apple subscription still active — user must cancel in App Store first',
        };
      }
    }

    if (['active', 'trialing'].includes(status) && provider !== 'apple') {
      return {
        defer: true,
        reason: 'Billing period still active',
      };
    }
  }

  return { defer: false };
}

async function processDueScheduledDeletions() {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  const snap = await db
    .collection('accountDeletionRequests')
    .where('status', '==', 'scheduled')
    .where('scheduledDeleteAt', '<=', now)
    .get();

  if (snap.empty) {
    logger.info('✅ No scheduled account deletions due');
    return { processed: 0 };
  }

  logger.info(`🗑️ Processing ${snap.size} scheduled account deletion(s)`);

  let processed = 0;
  for (const docSnap of snap.docs) {
    const request = { id: docSnap.id, ...docSnap.data() };
    const { userId, userEmail } = request;

    if (!userId || !userEmail) {
      await docSnap.ref.update({
        status: 'failed',
        scheduleError: 'Missing userId or userEmail',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      continue;
    }

    try {
      const subDoc = await loadSubscriptionForUser(db, userId);
      const sub = normalizeSub(subDoc);
      const deferCheck = shouldDeferScheduledDeletion(sub, request);

      if (deferCheck.defer) {
        logger.info(`⏭️ Deferring ${userEmail}: ${deferCheck.reason}`);
        continue;
      }

      await executeFullAccountDeletion({
        userId,
        email: userEmail,
        deletedBy: 'scheduled_job',
        deletionType: 'scheduled',
        requestId: request.id,
      });

      await docSnap.ref.update({
        status: 'approved',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        processedBy: 'scheduled_job',
        scheduleCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      processed += 1;
      logger.info(`✅ Scheduled deletion completed for ${userEmail}`);
    } catch (err) {
      logger.error(`❌ Scheduled deletion failed for ${userEmail}:`, err);
      await docSnap.ref.update({
        status: 'failed',
        scheduleError: err.message || String(err),
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  return { processed };
}

exports.adminPreviewDeletionSchedule = onCall({ cors: true }, async (request) => {
  await ensureAdmin(request);

  const { requestId, userId: directUserId } = request.data || {};
  const db = admin.firestore();

  let userId = directUserId;
  if (requestId) {
    const requestSnap = await db.collection('accountDeletionRequests').doc(requestId).get();
    if (!requestSnap.exists) {
      throw new HttpsError('not-found', 'Deletion request not found');
    }
    userId = requestSnap.data().userId;
  }

  if (!userId) {
    throw new HttpsError('invalid-argument', 'requestId or userId is required');
  }

  const subscriptionDoc = await loadSubscriptionForUser(db, userId);
  const preview = buildPreviewFromSubscription(subscriptionDoc);

  return { success: true, ...preview };
});

exports.adminScheduleAccountDeletion = onCall(
  {
    cors: true,
    secrets: ['RESEND_API_KEY', 'LOGO_URL'],
  },
  async (request) => {
    await ensureAdmin(request);

    const { requestId } = request.data || {};
    if (!requestId) {
      throw new HttpsError('invalid-argument', 'requestId is required');
    }

    const db = admin.firestore();
    const requestRef = db.collection('accountDeletionRequests').doc(requestId);
    const requestSnap = await requestRef.get();

    if (!requestSnap.exists) {
      throw new HttpsError('not-found', 'Deletion request not found');
    }

    const requestData = { id: requestSnap.id, ...requestSnap.data() };
    if (requestData.status !== 'pending') {
      throw new HttpsError(
        'failed-precondition',
        `Cannot schedule request with status "${requestData.status}"`
      );
    }

    const result = await scheduleDeletionRequest(
      db,
      requestId,
      requestData,
      request.auth?.uid
    );

    return {
      success: true,
      message: `Deletion scheduled for ${result.displayDate}`,
      ...result,
    };
  }
);

exports.adminRetryScheduledBilling = onCall({ cors: true }, async (request) => {
  await ensureAdmin(request);

  const { requestId } = request.data || {};
  if (!requestId) {
    throw new HttpsError('invalid-argument', 'requestId is required');
  }

  const db = admin.firestore();
  const requestRef = db.collection('accountDeletionRequests').doc(requestId);
  const requestSnap = await requestRef.get();

  if (!requestSnap.exists) {
    throw new HttpsError('not-found', 'Deletion request not found');
  }

  const requestData = { id: requestSnap.id, ...requestSnap.data() };
  if (requestData.status !== 'scheduled') {
    throw new HttpsError('failed-precondition', 'Request is not scheduled');
  }

  const subscriptionDoc = await loadSubscriptionForUser(db, requestData.userId);
  const snapshot = getSubscriptionBillingSnapshot(subscriptionDoc);
  const platformSchedule = await schedulePlatformCancellation({
    snapshot,
    userId: requestData.userId,
    db,
    subscriptionDocData: subscriptionDoc,
  });

  const resolvedStripeId =
    platformSchedule.stripeSubscriptionId ||
    snapshot.stripeSubId ||
    requestData.subscriptionInfo?.stripeSubscriptionId ||
    null;

  await requestRef.update({
    platformSchedule: {
      provider: platformSchedule.provider,
      ok: platformSchedule.ok === true,
      action: platformSchedule.action || null,
      warning: platformSchedule.warning || null,
      at: admin.firestore.FieldValue.serverTimestamp(),
    },
    stripeCancelAtPeriodEnd:
      platformSchedule.provider === 'stripe' && platformSchedule.ok === true,
    subscriptionInfo: {
      ...(requestData.subscriptionInfo || {}),
      stripeSubscriptionId: resolvedStripeId,
    },
  });

  return {
    success: platformSchedule.ok === true,
    message: platformSchedule.ok
      ? 'Billing action applied successfully'
      : platformSchedule.warning || 'Billing action failed',
    platformSchedule,
  };
});

exports.adminCancelScheduledDeletion = onCall({ cors: true }, async (request) => {
  await ensureAdmin(request);

  const { requestId, reason } = request.data || {};
  if (!requestId) {
    throw new HttpsError('invalid-argument', 'requestId is required');
  }

  const db = admin.firestore();
  const requestRef = db.collection('accountDeletionRequests').doc(requestId);
  const requestSnap = await requestRef.get();

  if (!requestSnap.exists) {
    throw new HttpsError('not-found', 'Deletion request not found');
  }

  const requestData = requestSnap.data();
  if (requestData.status !== 'scheduled') {
    throw new HttpsError('failed-precondition', 'Request is not scheduled');
  }

  const subscriptionDoc = await loadSubscriptionForUser(db, requestData.userId);
  const snapshot = getSubscriptionBillingSnapshot(subscriptionDoc);

  try {
    await revertPlatformCancellation({
      snapshot,
      storedPlatformSchedule: requestData.platformSchedule,
      userId: requestData.userId,
      db,
    });
  } catch (err) {
    logger.warn(`⚠️ Could not revert platform schedule: ${err.message}`);
  }

  if (
    requestData.subscriptionInfo?.stripeSubscriptionId &&
    requestData.stripeCancelAtPeriodEnd &&
    !requestData.platformSchedule
  ) {
    try {
      const { revertStripeCancelAtPeriodEnd } = require('./accountDeletionCore');
      await revertStripeCancelAtPeriodEnd(requestData.subscriptionInfo.stripeSubscriptionId);
    } catch (err) {
      logger.warn(`⚠️ Legacy Stripe revert failed: ${err.message}`);
    }
  }

  await requestRef.update({
    status: 'pending',
    scheduledDeleteAt: admin.firestore.FieldValue.delete(),
    scheduledAt: admin.firestore.FieldValue.delete(),
    scheduledBy: admin.firestore.FieldValue.delete(),
    platformSchedule: admin.firestore.FieldValue.delete(),
    stripeCancelAtPeriodEnd: admin.firestore.FieldValue.delete(),
    scheduleCancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    scheduleCancelledBy: request.auth?.uid || 'admin',
    scheduleCancelReason: reason || null,
  });

  return {
    success: true,
    message: 'Scheduled deletion cancelled. Request is pending again.',
  };
});

exports.processScheduledAccountDeletions = onSchedule(
  {
    schedule: '0 * * * *',
    timeZone: 'America/New_York',
    secrets: ['RESEND_API_KEY'],
  },
  async () => {
    logger.info('🗓️ Running scheduled account deletion processor...');
    try {
      const result = await processDueScheduledDeletions();
      logger.info(`🗓️ Scheduled deletions processed: ${result.processed}`);
    } catch (error) {
      logger.error('❌ Scheduled account deletion processor failed:', error);
    }
  }
);

module.exports.processDueScheduledDeletions = processDueScheduledDeletions;
