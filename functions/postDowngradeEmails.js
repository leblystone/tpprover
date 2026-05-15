/**
 * Post-Downgrade Email Scheduler
 *
 * Triggers when a userSubscriptions document is updated.
 * Detects trialing → free/expired transitions and schedules win-back emails:
 *   - Day 7: "Your data is safe. Here's what Research+ gave you."
 *   - Day 30: Soft re-engage.
 *
 * Also runs a scheduled sweep to process pending win-back emails.
 */

const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');

/**
 * Detect subscription downgrade and schedule win-back emails.
 */
exports.onSubscriptionDowngrade = onDocumentUpdated(
  {
    document: 'userSubscriptions/{userId}',
    secrets: ['RESEND_API_KEY'],
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    const userId = event.params.userId;

    if (!before || !after) return;

    // Extract subscription from the nested structure
    const prevSub = before.subscription || before;
    const currSub = after.subscription || after;

    const prevStatus = (prevSub.status || '').toLowerCase();
    const currStatus = (currSub.status || '').toLowerCase();

    // Detect downgrade: trialing/active → expired/canceled/free
    const wasActive = ['trialing', 'active', 'trial'].includes(prevStatus);
    const isNowInactive = ['expired', 'canceled', 'free', 'refunded'].includes(currStatus);

    if (!wasActive || !isNowInactive) return;

    logger.info(`📉 Subscription downgrade detected for ${userId}: ${prevStatus} → ${currStatus}`);

    const db = admin.firestore();
    const now = new Date();

    // Check if we've already scheduled win-back emails for this user
    const existingSnap = await db.collection('scheduledEmails')
      .where('userId', '==', userId)
      .where('type', '==', 'winback_day7')
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      logger.info(`⏭️ Win-back emails already scheduled for ${userId}`);
      return;
    }

    // Look up user email
    let userEmail = null;
    let userName = null;
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userEmail = userData.email;
        userName = userData.displayName
          ? userData.displayName.split(' ')[0]
          : (userData.email || '').split('@')[0];
      }
    } catch (err) {
      logger.warn(`⚠️ Could not look up user ${userId}:`, err.message);
    }

    if (!userEmail) {
      logger.warn(`⚠️ No email found for user ${userId}, skipping win-back scheduling`);
      return;
    }

    // Schedule Day 7 and Day 30 emails
    const day7Date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const day30Date = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const batch = db.batch();

    batch.set(db.collection('scheduledEmails').doc(), {
      userId,
      userEmail,
      userName,
      type: 'winback_day7',
      scheduledFor: admin.firestore.Timestamp.fromDate(day7Date),
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      previousStatus: prevStatus,
    });

    batch.set(db.collection('scheduledEmails').doc(), {
      userId,
      userEmail,
      userName,
      type: 'winback_day30',
      scheduledFor: admin.firestore.Timestamp.fromDate(day30Date),
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      previousStatus: prevStatus,
    });

    await batch.commit();
    logger.info(`✅ Win-back emails scheduled for ${userEmail}: Day 7 (${day7Date.toISOString()}) and Day 30 (${day30Date.toISOString()})`);
  }
);

/**
 * Process scheduled win-back emails.
 * Runs every 6 hours, sends any emails whose scheduledFor has passed.
 */
exports.processScheduledWinBackEmails = onSchedule(
  {
    schedule: '0 */6 * * *', // Every 6 hours
    timeZone: 'America/New_York',
    secrets: ['RESEND_API_KEY'],
  },
  async () => {
    logger.info('📬 Processing scheduled win-back emails...');

    try {
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();

      const pendingSnap = await db.collection('scheduledEmails')
        .where('status', '==', 'pending')
        .where('scheduledFor', '<=', now)
        .get();

      if (pendingSnap.empty) {
        logger.info('✅ No pending win-back emails to send');
        return;
      }

      logger.info(`📧 Found ${pendingSnap.size} win-back email(s) to send`);

      for (const emailDoc of pendingSnap.docs) {
        const data = emailDoc.data();

        // Before sending, check if user has resubscribed
        let skipReason = null;
        try {
          const subDoc = await db.collection('userSubscriptions').doc(data.userId).get();
          if (subDoc.exists) {
            const sub = subDoc.data()?.subscription || subDoc.data() || {};
            const status = (sub.status || '').toLowerCase();
            if (['active', 'trialing'].includes(status) || sub.hasLifetimeAccess) {
              skipReason = `resubscribed (status: ${status})`;
            }
          }
        } catch (_) { /* proceed if check fails */ }

        if (skipReason) {
          await emailDoc.ref.update({
            status: 'skipped',
            skipReason,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          logger.info(`⏭️ Skipped ${data.type} for ${data.userEmail}: ${skipReason}`);
          continue;
        }

        // Send the email
        try {
          let success = false;

          if (data.type === 'winback_day7') {
            success = await emailService.sendWinBackEmail(
              data.userEmail,
              data.userName
            );
          } else if (data.type === 'winback_day30') {
            success = await emailService.sendWinBackEmail(
              data.userEmail,
              data.userName
            );
          }

          await emailDoc.ref.update({
            status: success ? 'sent' : 'failed',
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          if (success) {
            logger.info(`✅ ${data.type} email sent to ${data.userEmail}`);
          } else {
            logger.warn(`⚠️ ${data.type} email failed for ${data.userEmail}`);
          }
        } catch (err) {
          logger.error(`❌ Error sending ${data.type} to ${data.userEmail}:`, err.message);
          await emailDoc.ref.update({
            status: 'failed',
            error: err.message,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      logger.info('✅ Win-back email processing completed');
    } catch (error) {
      logger.error('❌ Win-back email processing failed:', error);
    }
  }
);
