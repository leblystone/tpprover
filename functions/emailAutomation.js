// 🤖 Email Automation System for The Pep Planner
// Handles all automated email triggers and scheduling

const { onCall } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');
const {
  getLocalTimeParts,
  localDateKey,
  isLocalHourMatch,
  daysBetweenDateKeys,
  resolveUserTimezone,
  loadTriggerConfig,
} = require('./userTimezone');

// Get Firestore instance (admin is initialized in index.js)
const getDb = () => admin.firestore();

// 🎯 IMMEDIATE TRIGGERS (User Actions)

/**
 * 1. Welcome Email - Triggered when user signs up
 * Already handled by onUserCreated in index.js
 */

/**
 * 2. Email Verification - Triggered when user needs to verify email
 * Already handled by sendCustomVerificationEmail in index.js
 */

/**
 * 3. Password Reset - Triggered when user requests password reset
 * Handled by Firebase Auth automatically
 */

/**
 * 4. Subscription Confirmed - Triggered by Stripe webhook
 */
exports.onSubscriptionConfirmed = onCall(
  {
    cors: true,
    secrets: ['RESEND_API_KEY']
  },
  async (request) => {
    try {
      const { userEmail, planName, customerId } = request.data;
      
      if (!userEmail || !planName) {
        throw new Error('userEmail and planName are required');
      }

      logger.info(`💳 Sending subscription confirmation email to ${userEmail} for ${planName}`);
      
      const success = await emailService.sendSubscriptionConfirmedEmail(userEmail, planName);
      
      if (success) {
        // Log the email event
        await getDb().collection('emailLogs').add({
          type: 'subscription_confirmed',
          userEmail,
          planName,
          customerId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent'
        });
      }

      return { success, message: success ? 'Subscription confirmation email sent' : 'Failed to send email' };
    } catch (error) {
      logger.error('❌ Error sending subscription confirmation email:', error);
      return { success: false, error: error.message };
    }
  }
);

/**
 * 5. Payment Failed - Triggered by Stripe webhook
 */
exports.onPaymentFailed = onCall(
  {
    cors: true,
    secrets: ['RESEND_API_KEY']
  },
  async (request) => {
    try {
      const { userEmail, amount, currency, invoiceUrl, customerId } = request.data;
      
      if (!userEmail) {
        throw new Error('userEmail is required');
      }

      logger.info(`💸 Sending payment failed email to ${userEmail}`);
      
      // Create payment failed email function
      const success = await emailService.sendPaymentFailedEmail(userEmail, amount, currency, invoiceUrl);
      
      if (success) {
        // Log the email event
        await getDb().collection('emailLogs').add({
          type: 'payment_failed',
          userEmail,
          amount,
          currency,
          customerId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent'
        });
      }

      return { success, message: success ? 'Payment failed email sent' : 'Failed to send email' };
    } catch (error) {
      logger.error('❌ Error sending payment failed email:', error);
      return { success: false, error: error.message };
    }
  }
);

/**
 * 6. Payment Successful - Triggered by Stripe webhook
 */
exports.onPaymentSuccessful = onCall(
  {
    cors: true,
    secrets: ['RESEND_API_KEY']
  },
  async (request) => {
    try {
      const { userEmail, amount, currency, receiptUrl, customerId } = request.data;
      
      if (!userEmail) {
        throw new Error('userEmail is required');
      }

      logger.info(`💰 Sending payment successful email to ${userEmail}`);
      
      const success = await emailService.sendPaymentSuccessfulEmail(userEmail, amount, currency, receiptUrl);
      
      if (success) {
        // Log the email event
        await getDb().collection('emailLogs').add({
          type: 'payment_successful',
          userEmail,
          amount,
          currency,
          customerId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent'
        });
      }

      return { success, message: success ? 'Payment successful email sent' : 'Failed to send email' };
    } catch (error) {
      logger.error('❌ Error sending payment successful email:', error);
      return { success: false, error: error.message };
    }
  }
);

/**
 * 7. Subscription Cancelled - Triggered when user cancels
 */
exports.onSubscriptionCancelled = onCall(
  {
    cors: true,
    secrets: ['RESEND_API_KEY']
  },
  async (request) => {
    try {
      const { userEmail, planName, endDate, customerId } = request.data;
      
      if (!userEmail) {
        throw new Error('userEmail is required');
      }

      logger.info(`❌ Sending subscription cancelled email to ${userEmail}`);
      
      const success = await emailService.sendSubscriptionCancelledEmail(userEmail, planName, endDate);
      
      if (success) {
        // Log the email event
        await getDb().collection('emailLogs').add({
          type: 'subscription_cancelled',
          userEmail,
          planName,
          endDate,
          customerId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent'
        });
      }

      return { success, message: success ? 'Subscription cancelled email sent' : 'Failed to send email' };
    } catch (error) {
      logger.error('❌ Error sending subscription cancelled email:', error);
      return { success: false, error: error.message };
    }
  }
);

// 📅 SCHEDULED TRIGGERS (Time-based)

/**
 * 8. Trial Ending Soon - N days before trial ends (default 2)
 * Runs hourly. For each candidate user, sends only when:
 *   - days until trial end (in THEIR timezone) === configured daysBefore
 *   - current local hour matches configured sendTime (default 09:00)
 */
exports.checkTrialEndingSoon = onSchedule({
    schedule: '5 * * * *', // Hourly at :05 UTC — covers all user timezones
    timeZone: 'UTC',
    secrets: ['RESEND_API_KEY']
  },
  async (event) => {
    logger.info('🔍 Checking for trials ending soon (per-user timezone)...');
    
    try {
      const now = new Date();
      const db = getDb();
      const triggerCfg = await loadTriggerConfig(db, 'trialEnding', {
        enabled: true,
        sendTime: '09:00',
        daysBefore: 2,
      });

      if (triggerCfg.enabled === false) {
        logger.info('⏭️ trialEnding trigger disabled in admin config');
        return;
      }

      const daysBefore = Number(triggerCfg.daysBefore) || 2;
      const sendTime = triggerCfg.sendTime || '09:00';

      // Wide UTC window — exact “N local days before” filtered per user below
      const windowStart = new Date(now);
      windowStart.setUTCDate(windowStart.getUTCDate() - 1);
      windowStart.setUTCHours(0, 0, 0, 0);
      const windowEnd = new Date(now);
      windowEnd.setUTCDate(windowEnd.getUTCDate() + daysBefore + 2);
      windowEnd.setUTCHours(23, 59, 59, 999);

      const usersSnapshot = await db.collection('users')
        .where('trialEndDate', '>=', admin.firestore.Timestamp.fromDate(windowStart))
        .where('trialEndDate', '<=', admin.firestore.Timestamp.fromDate(windowEnd))
        .get();

      logger.info(`📧 Found ${usersSnapshot.size} users with trials ending in the next ~${daysBefore + 2} days`);

      const pushNotifications = require('./pushNotifications');

      let researchPlusEmailsEnabled = false;
      try {
        const flagDoc = await db.collection('config').doc('featureFlags').get();
        researchPlusEmailsEnabled = Boolean(flagDoc.exists() && flagDoc.data()?.RESEARCH_PLUS_EMAILS);
      } catch (_) {}
      logger.info(`📧 RESEARCH_PLUS_EMAILS flag: ${researchPlusEmailsEnabled}`);

      let sent = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userEmail = userData.email;
        const userId = userDoc.id;

        if (!userEmail) continue;

        try {
          const subDoc = await db.collection('userSubscriptions').doc(userId).get();
          if (subDoc.exists()) {
            const sub = subDoc.data()?.subscription || subDoc.data() || {};
            const status = (sub.status || sub.subscriptionStatus || '').toLowerCase();
            const isPaid = ['active', 'lifetime'].includes(status);
            if (isPaid && !researchPlusEmailsEnabled) {
              logger.info(`⏭️ Skipping ${userEmail} — paid subscriber (Research+ emails not yet enabled)`);
              continue;
            }
            if (status === 'lifetime') {
              logger.info(`⏭️ Skipping ${userEmail} — lifetime access`);
              continue;
            }
          }
        } catch (_) {}

        const trialEndTs = userData.trialEndDate;
        const trialEndDate = trialEndTs?.toDate
          ? trialEndTs.toDate()
          : (trialEndTs ? new Date(trialEndTs) : null);
        if (!trialEndDate || Number.isNaN(trialEndDate.getTime())) continue;

        const userTimezone = await resolveUserTimezone(db, userId, userData);
        const todayKey = localDateKey(now, userTimezone);
        const trialEndKey = localDateKey(trialEndDate, userTimezone);
        const localDaysUntil = daysBetweenDateKeys(todayKey, trialEndKey);

        if (localDaysUntil !== daysBefore) {
          continue;
        }

        if (!isLocalHourMatch(now, userTimezone, sendTime)) {
          continue;
        }

        const trialEndIso = trialEndKey;

        const dedupSnap = await db.collection('emailLogs')
          .where('type', '==', 'trial_ending_soon')
          .where('userId', '==', userId)
          .where('trialEndKey', '==', trialEndIso)
          .limit(1)
          .get();
        if (!dedupSnap.empty) {
          logger.info(`⏭️ Already sent trial ending email to ${userEmail} for this trial period`);
          continue;
        }

        try {
          const notificationSettings = await pushNotifications.getUserNotificationSettings(userId);
          if (notificationSettings?.billing === false) {
            logger.info(`⏭️ Skipping ${userEmail} — billing notifications disabled`);
            continue;
          }
        } catch (_) {}

        logger.info(`📤 Sending trial ending email to ${userEmail} (tz=${userTimezone}, localDays=${localDaysUntil}, localHour match ${sendTime})`);
        try {
          const success = await emailService.sendTrialEndingEmail(userEmail, daysBefore);
          if (success) {
            await db.collection('emailLogs').add({
              type: 'trial_ending_soon',
              userEmail,
              userId,
              daysRemaining: daysBefore,
              trialEndKey: trialEndIso,
              timezone: userTimezone,
              dateKey: todayKey,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              status: 'sent'
            });
            sent++;
          }
        } catch (err) {
          logger.error(`❌ Failed to send trial ending email to ${userEmail}:`, err);
        }
      }

      logger.info(`✅ Trial ending email check completed — ${sent} sent`);
    } catch (error) {
      logger.error('❌ Error in trial ending email check:', error);
    }
  }
);

/**
 * 9. Subscription Renewal Reminder - DISABLED
 * We are not sending renewal reminder emails. Schedule kept for backward compatibility.
 */
exports.checkRenewalReminders = onSchedule({
    schedule: '0 15 * * *', // 10 AM EST (15:00 UTC)
    timeZone: 'America/New_York',
    secrets: ['RESEND_API_KEY']
  },
  async (event) => {
    logger.info('🔍 Renewal reminder check skipped - renewal reminder emails are disabled');
    return;
  }
);

const {
  EMPTY_SUMMARY,
  buildWeeklyResearchSummary,
  fetchWeeklyPayloadForEmail,
} = require('./weeklyResearchSummary');

/**
 * 11. Weekly Research Reminder — day/time in EACH user's timezone
 * Runs hourly. Sends when local weekday + hour match the trigger config
 * (default: Sunday at 11:00 in the user's settings.region.timeZone).
 */
exports.sendWeeklyResearchReminders = onSchedule({
    schedule: '10 * * * *', // Hourly at :10 UTC
    timeZone: 'UTC',
    secrets: ['RESEND_API_KEY']
  },
  async (event) => {
    logger.info('🔍 Sending weekly research reminders (per-user timezone)...');

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const db = getDb();

      const triggerCfg = await loadTriggerConfig(db, 'weeklyReminder', {
        enabled: true,
        dayOfWeek: 'Sunday',
        time: '11:00',
        sendTime: '11:00',
      });

      if (triggerCfg.enabled === false) {
        logger.info('⏭️ weeklyReminder trigger disabled in admin config');
        return;
      }

      const targetDay = triggerCfg.dayOfWeek || 'Sunday';
      const sendTime = triggerCfg.time || triggerCfg.sendTime || '11:00';

      const usersSnapshot = await db.collection('users')
        .where('lastActive', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .get();

      logger.info(`📧 Scanning ${usersSnapshot.size} recently active users for weekly reminders`);
      let sent = 0;
      let skippedTz = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userEmail = userData.email;
        const userId = userDoc.id;

        if (!userEmail) continue;

        try {
          const subDoc = await db.collection('userSubscriptions').doc(userId).get();
          if (subDoc.exists()) {
            const sub = subDoc.data()?.subscription || subDoc.data() || {};
            const status = (sub.status || sub.subscriptionStatus || '').toLowerCase();
            if (['cancelled', 'expired', 'none'].includes(status)) continue;
          }
        } catch (_) {}

        const userTimezone = await resolveUserTimezone(db, userId, userData);
        const local = getLocalTimeParts(now, userTimezone);

        if (local.weekday !== targetDay) {
          skippedTz++;
          continue;
        }
        if (!isLocalHourMatch(now, userTimezone, sendTime)) {
          skippedTz++;
          continue;
        }

        // Dedup per user per local calendar day of the weekly send
        const weekKey = localDateKey(now, userTimezone);

        const dedupSnap = await db.collection('emailLogs')
          .where('type', '==', 'weekly_research_reminder')
          .where('userEmail', '==', userEmail)
          .where('dateKey', '==', weekKey)
          .limit(1)
          .get();
        if (!dedupSnap.empty) continue;

        const firstName = userData.displayName
          ? userData.displayName.split(' ')[0]
          : (userData.email || '').split('@')[0];

        let summary = { ...EMPTY_SUMMARY };
        try {
          const userDataDoc = await db.collection('userData').doc(userId).get();
          if (userDataDoc.exists) {
            summary = buildWeeklyResearchSummary(userDataDoc.data(), userTimezone);
          }
        } catch (_) {}

        logger.info(`📤 Sending weekly reminder to ${userEmail} (tz=${userTimezone}, ${local.weekday} ${sendTime})`);
        try {
          const success = await emailService.sendWeeklyResearchReminderEmail(userEmail, firstName || 'Researcher', summary);
          if (success) {
            await db.collection('emailLogs').add({
              type: 'weekly_research_reminder',
              userEmail,
              userId,
              dateKey: weekKey,
              timezone: userTimezone,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              status: 'sent'
            });
            sent++;
          }
        } catch (err) {
          logger.error(`❌ Failed to send weekly reminder to ${userEmail}:`, err);
        }
      }

      logger.info(`✅ Weekly research reminders completed — ${sent} sent (${skippedTz} not in local send window)`);
    } catch (error) {
      logger.error('❌ Error in weekly research reminders:', error);
    }
  }
);

// 🔧 UTILITY FUNCTIONS

/**
 * Manual trigger for testing email automation
 */
exports.testEmailAutomation = onCall(
  {
    cors: true,
    secrets: ['RESEND_API_KEY']
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('Authentication required');
    }

    const { emailType, userEmail } = request.data;
    
    if (!emailType || !userEmail) {
      throw new Error('emailType and userEmail are required');
    }

    logger.info(`🧪 Testing email automation: ${emailType} for ${userEmail}`);

    try {
      let result = false;
      
      switch (emailType) {
        case 'subscription_confirmed':
          result = await emailService.sendSubscriptionConfirmedEmail(userEmail, 'Pro Plan');
          break;
        case 'payment_failed':
          result = await emailService.sendPaymentFailedEmail(userEmail, 2999, 'USD', 'https://example.com/invoice');
          break;
        case 'payment_successful':
          result = await emailService.sendPaymentSuccessfulEmail(userEmail, 2999, 'USD', 'https://example.com/receipt');
          break;
        case 'subscription_cancelled':
          result = await emailService.sendSubscriptionCancelledEmail(userEmail, 'Pro Plan', '2024-12-31');
          break;
        case 'renewal_reminder':
          result = await emailService.sendRenewalReminderEmail(userEmail, 'Pro Plan');
          break;
        case 'weekly_reminder': {
          const db = getDb();
          const { firstName, summary } = await fetchWeeklyPayloadForEmail(db, userEmail);
          result = await emailService.sendWeeklyResearchReminderEmail(userEmail, firstName, summary);
          break;
        }
        default:
          throw new Error(`Unknown email type: ${emailType}`);
      }

      return { 
        success: result, 
        message: result ? `${emailType} email sent successfully` : `Failed to send ${emailType} email` 
      };
      
    } catch (error) {
      logger.error(`❌ Error testing ${emailType} email:`, error);
      return { success: false, error: error.message };
    }
  }
);

/**
 * Get email automation statistics
 */
exports.getEmailStats = onCall(
  {
    cors: true,
    secrets: ['RESEND_API_KEY']
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('Authentication required');
    }

    try {
      const { days = 30 } = request.data;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const emailLogsSnapshot = await getDb().collection('emailLogs')
        .where('timestamp', '>=', startDate)
        .get();

      const stats = {
        totalEmails: emailLogsSnapshot.size,
        emailTypes: {},
        dailyStats: {},
        successRate: 0
      };

      let successCount = 0;

      emailLogsSnapshot.forEach((doc) => {
        const data = doc.data();
        const type = data.type;
        const date = data.timestamp.toDate().toDateString();
        const status = data.status;

        // Count by type
        if (!stats.emailTypes[type]) {
          stats.emailTypes[type] = 0;
        }
        stats.emailTypes[type]++;

        // Count by date
        if (!stats.dailyStats[date]) {
          stats.dailyStats[date] = 0;
        }
        stats.dailyStats[date]++;

        // Count successes
        if (status === 'sent') {
          successCount++;
        }
      });

      stats.successRate = stats.totalEmails > 0 ? (successCount / stats.totalEmails * 100).toFixed(2) : 0;

      return { success: true, stats };
      
    } catch (error) {
      logger.error('❌ Error getting email stats:', error);
      return { success: false, error: error.message };
    }
  }
);
