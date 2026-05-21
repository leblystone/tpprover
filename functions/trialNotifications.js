/**
 * Trial Lifecycle Notifications — Scheduled Cloud Function
 * Runs every 6 hours. Sends push notifications to users at key trial milestones:
 *   - Day 3: "You're tracking well!"
 *   - Day 7: "Halfway through your trial"
 *   - Day 12: "2 days left on Research+" (paired with the existing trial-ending email)
 *
 * Uses server-side FCM so notifications deliver even when the app is closed.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const pushNotifications = require('./pushNotifications');

const TRIAL_MILESTONES = [
  {
    dayNumber: 3,
    title: "You're tracking well! 📊",
    body: "Keep logging — consistency is where the magic happens. Your Research+ trial is off to a great start.",
  },
  {
    dayNumber: 7,
    title: "1 week in — halfway through your trial 🔬",
    body: "You've built a solid tracking habit. Research+ keeps your data unlimited and synced across all your devices.",
  },
  {
    dayNumber: 12,
    title: "2 days left on Research+ ⏳",
    body: "Your full-access trial ends soon. Subscribe to keep unlimited protocols, cloud sync, and AI research.",
  },
];

exports.sendTrialMilestoneNotifications = onSchedule(
  {
    schedule: '0 */6 * * *', // Every 6 hours
    timeZone: 'America/New_York',
  },
  async () => {
    logger.info('🔔 Checking trial milestone notifications...');

    try {
      const db = admin.firestore();
      const now = new Date();

      // For each milestone, find users who started their trial N days ago
      for (const milestone of TRIAL_MILESTONES) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() - milestone.dayNumber);
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Query users whose account was created on the target day and who are still trialing.
        // createdAt is on the users doc; trial status requires a join with userSubscriptions.
        const usersSnapshot = await db.collection('users')
          .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(targetDate))
          .where('createdAt', '<', admin.firestore.Timestamp.fromDate(nextDay))
          .get();

        if (usersSnapshot.empty) continue;

        logger.info(`📧 Found ${usersSnapshot.size} user(s) for Day ${milestone.dayNumber} milestone`);

        for (const userDoc of usersSnapshot.docs) {
          const userId = userDoc.id;
          const userData = userDoc.data();

          // Confirm still trialing
          try {
            const subDoc = await db.collection('userSubscriptions').doc(userId).get();
            if (subDoc.exists) {
              const sub = subDoc.data()?.subscription || subDoc.data() || {};
              const status = (sub.status || '').toLowerCase();
              if (!['trialing', 'trial'].includes(status) && sub.interval !== 'trial') {
                continue; // Already subscribed or expired
              }
            }
          } catch (_) { /* proceed if check fails */ }

          // Dedup — one notification per user per milestone
          const dedupKey = `trial_day_${milestone.dayNumber}`;
          const dedupSnap = await db.collection('notificationLogs')
            .where('userId', '==', userId)
            .where('type', '==', dedupKey)
            .limit(1)
            .get();
          if (!dedupSnap.empty) continue;

          // Send push via FCM (respects subscription + master push prefs)
          try {
            await pushNotifications.sendPushNotificationByType(
              userId,
              'subscription',
              {
                title: milestone.title,
                body: milestone.body,
                data: { type: 'trial_milestone', day: String(milestone.dayNumber) },
              }
            );

            // Log for dedup
            await db.collection('notificationLogs').add({
              userId,
              type: dedupKey,
              title: milestone.title,
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            logger.info(`✅ Day ${milestone.dayNumber} notification sent to ${userData.email || userId}`);
          } catch (err) {
            logger.warn(`⚠️ Failed to send Day ${milestone.dayNumber} push to ${userId}:`, err.message);
          }
        }
      }

      logger.info('✅ Trial milestone check completed');
    } catch (error) {
      logger.error('❌ Trial milestone check failed:', error);
    }
  }
);

/**
 * Seed the triggered notification config in Firestore (adminConfig/triggeredNotifications).
 * Call once from the admin panel or via `firebase functions:shell`.
 */
exports.seedTrialNotificationConfig = onCall(
  { cors: true },
  async (request) => {
    const db = admin.firestore();
    const notifications = {};

    TRIAL_MILESTONES.forEach((m) => {
      const id = `trial_day_${m.dayNumber}`;
      notifications[id] = {
        id,
        name: `Trial Day ${m.dayNumber}`,
        title: m.title,
        body: m.body,
        enabled: true,
        triggers: {
          type: 'time_based',
          daysAfterTrialStart: m.dayNumber,
        },
        targeting: { audience: 'all_users' },
        scheduling: {
          active: true,
          quietHours: { start: '22:00', end: '08:00' },
        },
      };
    });

    await db.collection('adminConfig').doc('triggeredNotifications').set(
      { notifications },
      { merge: true }
    );

    logger.info('✅ Trial notification config seeded');
    return { success: true, milestonesSeeded: TRIAL_MILESTONES.length };
  }
);
