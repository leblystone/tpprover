// 🤖 Email Automation System for The Pep Planner
// Handles all automated email triggers and scheduling

const { onCall } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');

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
 * 8. Trial Ending Soon - 2 days before trial ends
 * Runs hourly. Queries trialEndDate on the users doc (where it is actually stored).
 * Subscription status is NOT filtered here because it lives in userSubscriptions subcollection,
 * not on the user doc — we gate on trialEndDate existence instead and dedup via emailLogs.
 *
 * Dedup strategy: one email per userId per trialEndDate value (not per calendar day).
 * This prevents duplicate sends from:
 *   - Two hourly instances straddling UTC midnight (old dateKey vs new dateKey)
 *   - A user extending their trial and then getting a fresh email right away
 *
 * TODO (Research+ launch): expand audience beyond trial users to include active
 * subscribers so they also receive renewal/engagement reminders before their
 * period ends. Gate the active-subscriber branch behind RESEARCH_PLUS_LAUNCHED
 * flag in Firestore remoteConfig so it can be flipped without a redeploy.
 */
exports.checkTrialEndingSoon = onSchedule({
    schedule: '0 * * * *', // Hourly
    timeZone: 'UTC',
    secrets: ['RESEND_API_KEY']
  },
  async (event) => {
    logger.info('🔍 Checking for trials ending in 2 days...');
    
    try {
      const now = new Date();
      const twoDaysFromNow = new Date(now);
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      twoDaysFromNow.setHours(0, 0, 0, 0);
      
      const threeDaysFromNow = new Date(twoDaysFromNow);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 1);

      // trialEndDate IS stored on the user doc — filter only on that field
      const usersSnapshot = await getDb().collection('users')
        .where('trialEndDate', '>=', admin.firestore.Timestamp.fromDate(twoDaysFromNow))
        .where('trialEndDate', '<', admin.firestore.Timestamp.fromDate(threeDaysFromNow))
        .get();

      logger.info(`📧 Found ${usersSnapshot.size} users with trials ending in ~2 days`);

      const pushNotifications = require('./pushNotifications');
      const db = getDb();

      // Check admin panel flag: when RESEARCH_PLUS_EMAILS is ON, also include active subscribers
      let researchPlusEmailsEnabled = false;
      try {
        const flagDoc = await db.collection('config').doc('featureFlags').get();
        researchPlusEmailsEnabled = Boolean(flagDoc.exists() && flagDoc.data()?.RESEARCH_PLUS_EMAILS);
      } catch (_) {}
      logger.info(`📧 RESEARCH_PLUS_EMAILS flag: ${researchPlusEmailsEnabled}`);

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userEmail = userData.email;
        const userId = userDoc.id;

        if (!userEmail) continue;

        // Skip paid subscribers — unless RESEARCH_PLUS_EMAILS is ON, in which case
        // active subscribers are included so they also get renewal reminders.
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
            // Always skip lifetime — they don't have an expiring period
            if (status === 'lifetime') {
              logger.info(`⏭️ Skipping ${userEmail} — lifetime access`);
              continue;
            }
          }
        } catch (_) {}

        // Dedup: one email per userId per trialEndDate value.
        // Using the ISO date string of their trialEndDate as the dedup key prevents:
        //   1. Duplicate sends from two hourly runs straddling UTC midnight
        //   2. Re-sends after a trial extension (new trialEndDate = new email, but only once)
        const trialEndTs = userData.trialEndDate;
        const trialEndIso = trialEndTs?.toDate
          ? trialEndTs.toDate().toISOString().slice(0, 10)
          : (trialEndTs ? new Date(trialEndTs).toISOString().slice(0, 10) : null);

        if (!trialEndIso) continue; // no valid trialEndDate, skip

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

        // Respect notification preferences
        try {
          const notificationSettings = await pushNotifications.getUserNotificationSettings(userId);
          if (notificationSettings?.billing === false) {
            logger.info(`⏭️ Skipping ${userEmail} — billing notifications disabled`);
            continue;
          }
        } catch (_) {}

        logger.info(`📤 Sending trial ending email to ${userEmail} (trialEnd: ${trialEndIso})`);
        try {
          const success = await emailService.sendTrialEndingEmail(userEmail, 2);
          if (success) {
            await db.collection('emailLogs').add({
              type: 'trial_ending_soon',
              userEmail,
              userId,
              daysRemaining: 2,
              trialEndKey: trialEndIso, // stable dedup key per trial period
              dateKey: now.toISOString().slice(0, 10), // kept for audit trail
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              status: 'sent'
            });
          }
        } catch (err) {
          logger.error(`❌ Failed to send trial ending email to ${userEmail}:`, err);
        }
      }

      logger.info('✅ Trial ending email check completed');
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
 * 11. Weekly Research Reminder - Every Sunday for active users
 * Fixed: was querying 'lastLoginDate' (doesn't exist) — field is actually 'lastActive'.
 * Also removed 'subscriptionStatus' filter which is on userSubscriptions, not users doc.
 * We now query on lastActive only and skip users whose subscription is lapsed/none.
 */
exports.sendWeeklyResearchReminders = onSchedule({
    schedule: '0 16 * * 0', // 11 AM EST every Sunday (16:00 UTC)
    timeZone: 'America/New_York',
    secrets: ['RESEND_API_KEY']
  },
  async (event) => {
    logger.info('🔍 Sending weekly research reminders...');

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const db = getDb();
      const weekKey = now.toISOString().slice(0, 10); // dedup per week (Sunday date)

      // Query on lastActive — the field that actually exists on user docs
      const usersSnapshot = await db.collection('users')
        .where('lastActive', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .get();

      logger.info(`📧 Found ${usersSnapshot.size} recently active users for weekly reminders`);
      let sent = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userEmail = userData.email;
        const userId = userDoc.id;

        if (!userEmail) continue;

        // Skip if subscription is lapsed/none (check userSubscriptions)
        try {
          const subDoc = await db.collection('userSubscriptions').doc(userId).get();
          if (subDoc.exists()) {
            const sub = subDoc.data()?.subscription || subDoc.data() || {};
            const status = (sub.status || sub.subscriptionStatus || '').toLowerCase();
            if (['cancelled', 'expired', 'none'].includes(status)) continue;
          }
        } catch (_) {}

        // Dedup — one per user per week
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

        // Fetch userData for personalised digest
        let summary = { ...EMPTY_SUMMARY };
        try {
          const userDataDoc = await db.collection('userData').doc(userId).get();
          if (userDataDoc.exists) {
            const userTimezone = userData.settings?.region?.timeZone || 'America/New_York';
            summary = buildWeeklyResearchSummary(userDataDoc.data(), userTimezone);
          }
        } catch (_) {}

        logger.info(`📤 Sending weekly reminder to ${userEmail} (thisWeek=${summary.thisWeekTotal}, lastWeek=${summary.lastWeekTotal})`);
        try {
          const success = await emailService.sendWeeklyResearchReminderEmail(userEmail, firstName || 'Researcher', summary);
          if (success) {
            await db.collection('emailLogs').add({
              type: 'weekly_research_reminder',
              userEmail,
              userId,
              dateKey: weekKey,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              status: 'sent'
            });
            sent++;
          }
        } catch (err) {
          logger.error(`❌ Failed to send weekly reminder to ${userEmail}:`, err);
        }
      }

      logger.info(`✅ Weekly research reminders completed — ${sent} emails sent`);
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
