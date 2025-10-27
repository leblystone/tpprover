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
    cors: true
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
    cors: true
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
    cors: true
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
    cors: true
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
 * Runs daily at 9 AM EST to check for trials ending in 2 days
 */
exports.checkTrialEndingSoon = onSchedule(
  {
    schedule: '0 * * * *', // Run hourly to check all user timezones
    timeZone: 'UTC' // Use UTC as base timezone
  },
  async (event) => {
    logger.info('🔍 Checking for trials ending in 2 days...');
    
    try {
      // Calculate date 2 days from now
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      twoDaysFromNow.setHours(0, 0, 0, 0);
      
      const threeDaysFromNow = new Date(twoDaysFromNow);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 1);

      // Query users whose trial ends in 2 days
      const usersSnapshot = await getDb().collection('users')
        .where('trialEndDate', '>=', twoDaysFromNow)
        .where('trialEndDate', '<', threeDaysFromNow)
        .where('subscriptionStatus', '==', 'trial')
        .get();

      logger.info(`📧 Found ${usersSnapshot.size} users with trials ending in 2 days`);

      const emailPromises = [];
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const userEmail = userData.email;
        
        if (userEmail) {
          logger.info(`📤 Sending trial ending email to ${userEmail}`);
          emailPromises.push(
            emailService.sendTrialEndingEmail(userEmail, 2)
              .then(success => {
                if (success) {
                  // Log the email event
                  return getDb().collection('emailLogs').add({
                    type: 'trial_ending_soon',
                    userEmail,
                    userId: doc.id,
                    daysRemaining: 2,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'sent'
                  });
                }
              })
              .catch(error => {
                logger.error(`❌ Failed to send trial ending email to ${userEmail}:`, error);
              })
          );
        }
      });

      await Promise.all(emailPromises);
      logger.info('✅ Trial ending email check completed');
      
    } catch (error) {
      logger.error('❌ Error in trial ending email check:', error);
    }
  }
);

/**
 * 9. Subscription Renewal Reminder - 3 days before renewal
 * Runs daily at 10 AM EST to check for renewals in 3 days
 */
exports.checkRenewalReminders = onSchedule(
  {
    schedule: '0 15 * * *', // 10 AM EST (15:00 UTC)
    timeZone: 'America/New_York'
  },
  async (event) => {
    logger.info('🔍 Checking for subscription renewals in 3 days...');
    
    try {
      // Calculate date 3 days from now
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(0, 0, 0, 0);
      
      const fourDaysFromNow = new Date(threeDaysFromNow);
      fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 1);

      // Query users whose subscription renews in 3 days
      const usersSnapshot = await getDb().collection('users')
        .where('subscriptionRenewalDate', '>=', threeDaysFromNow)
        .where('subscriptionRenewalDate', '<', fourDaysFromNow)
        .where('subscriptionStatus', 'in', ['active', 'trialing'])
        .get();

      logger.info(`📧 Found ${usersSnapshot.size} users with renewals in 3 days`);

      const emailPromises = [];
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const userEmail = userData.email;
        
        if (userEmail) {
          logger.info(`📤 Sending renewal reminder to ${userEmail}`);
          emailPromises.push(
            emailService.sendRenewalReminderEmail(userEmail, userData.subscriptionPlan || 'Pro Plan')
              .then(success => {
                if (success) {
                  // Log the email event
                  return getDb().collection('emailLogs').add({
                    type: 'renewal_reminder',
                    userEmail,
                    userId: doc.id,
                    subscriptionPlan: userData.subscriptionPlan,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'sent'
                  });
                }
              })
              .catch(error => {
                logger.error(`❌ Failed to send renewal reminder to ${userEmail}:`, error);
              })
          );
        }
      });

      await Promise.all(emailPromises);
      logger.info('✅ Renewal reminder check completed');
      
    } catch (error) {
      logger.error('❌ Error in renewal reminder check:', error);
    }
  }
);

/**
 * 10. Weekly Research Reminder - Every Sunday for active users
 * Runs every Sunday at 11 AM EST
 */
exports.sendWeeklyResearchReminders = onSchedule(
  {
    schedule: '0 16 * * 0', // 11 AM EST every Sunday (16:00 UTC)
    timeZone: 'America/New_York'
  },
  async (event) => {
    logger.info('🔍 Sending weekly research reminders...');
    
    try {
      // Get active users (logged in within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const usersSnapshot = await getDb().collection('users')
        .where('lastLoginDate', '>=', thirtyDaysAgo)
        .where('subscriptionStatus', 'in', ['active', 'trial', 'lifetime'])
        .get();

      logger.info(`📧 Found ${usersSnapshot.size} active users for weekly reminders`);

      const emailPromises = [];
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const userEmail = userData.email;
        
        if (userEmail) {
          logger.info(`📤 Sending weekly reminder to ${userEmail}`);
          emailPromises.push(
            emailService.sendWeeklyResearchReminderEmail(userEmail, userData.firstName || 'Researcher')
              .then(success => {
                if (success) {
                  // Log the email event
                  return getDb().collection('emailLogs').add({
                    type: 'weekly_research_reminder',
                    userEmail,
                    userId: doc.id,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'sent'
                  });
                }
              })
              .catch(error => {
                logger.error(`❌ Failed to send weekly reminder to ${userEmail}:`, error);
              })
          );
        }
      });

      await Promise.all(emailPromises);
      logger.info('✅ Weekly research reminders completed');
      
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
    cors: true
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
        case 'weekly_reminder':
          result = await emailService.sendWeeklyResearchReminderEmail(userEmail, 'Researcher');
          break;
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
    cors: true
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
