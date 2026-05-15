/**
 * Sync Health Check — Scheduled Cloud Function
 * Runs every 6 hours, queries syncErrors for users with 3+ failures in the
 * last 24 hours, and sends an admin alert via Resend + Telegram.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');
const adminAlerts = require('./adminAlerts');

exports.syncHealthCheck = onSchedule(
  {
    schedule: '0 */6 * * *', // Every 6 hours
    timeZone: 'America/New_York',
    secrets: ['RESEND_API_KEY'],
  },
  async () => {
    logger.info('🔍 Running sync health check...');

    try {
      const db = admin.firestore();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get all user-level syncErrors subcollections by listing parent docs.
      // syncErrors is a top-level collection group; events are subcollections.
      const recentErrors = await db.collectionGroup('events')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(twentyFourHoursAgo))
        .get();

      if (recentErrors.empty) {
        logger.info('✅ No sync errors in the last 24 hours');
        return;
      }

      // Group by userId (parent doc ID in syncErrors/{userId}/events)
      const errorsByUser = {};
      recentErrors.forEach((doc) => {
        const userId = doc.ref.parent.parent?.id;
        if (!userId) return;
        if (!errorsByUser[userId]) errorsByUser[userId] = [];
        errorsByUser[userId].push(doc.data());
      });

      // Find users with 3+ failures
      const troubledUsers = Object.entries(errorsByUser)
        .filter(([, errors]) => errors.length >= 3)
        .map(([userId, errors]) => ({
          userId,
          errorCount: errors.length,
          latestError: errors.sort((a, b) =>
            (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0)
          )[0],
        }));

      if (troubledUsers.length === 0) {
        logger.info(`✅ ${recentErrors.size} sync errors found, but no user hit 3+ threshold`);
        return;
      }

      logger.warn(`⚠️ ${troubledUsers.length} user(s) with 3+ sync failures in 24h`);

      // Look up emails for affected users
      const userDetails = await Promise.all(
        troubledUsers.map(async (tu) => {
          try {
            const userDoc = await db.collection('users').doc(tu.userId).get();
            const email = userDoc.exists ? userDoc.data()?.email : 'unknown';
            return { ...tu, email };
          } catch {
            return { ...tu, email: 'lookup-failed' };
          }
        })
      );

      // Build alert message
      const lines = userDetails.map((u) =>
        `• ${u.email} (${u.userId.substring(0, 8)}…) — ${u.errorCount} error(s), latest: ${u.latestError?.code || '?'}`
      );

      const subject = `⚠️ Sync Health Alert: ${troubledUsers.length} user(s) with repeated failures`;
      const body = [
        `${troubledUsers.length} user(s) hit 3+ sync failures in the last 24 hours:\n`,
        ...lines,
        '\nCheck Firestore > syncErrors collection for full details.',
      ].join('\n');

      // Send admin email
      const adminEmail = 'lebrockmaldonado@gmail.com';
      await emailService.sendEmail(
        adminEmail,
        subject,
        `<pre style="font-family:monospace;white-space:pre-wrap;">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`,
        { type: 'sync_health_alert' }
      );

      // Also send Telegram alert
      await adminAlerts.sendTelegramAlert(
        `🔴 <b>Sync Health Alert</b>\n${body}`
      );

      logger.info(`✅ Sync health alert sent for ${troubledUsers.length} user(s)`);
    } catch (error) {
      logger.error('❌ Sync health check failed:', error);
    }
  }
);
