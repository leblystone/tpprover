const {onDocumentUpdated, onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onCall} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {logger} = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('./stripe');
const pushNotifications = require('./pushNotifications');
const emailService = require('./emailService');
const testEmailSystem = require('./testEmailSystem');
const emailAutomation = require('./emailAutomation');
const quickEmailTest = require('./quickEmailTest');
const stripeWebhooks = require('./stripeWebhooks');

admin.initializeApp();

// Import and export the Stripe functions individually
exports.createCheckoutSession = stripe.createCheckoutSession;
exports.createPortalSession = stripe.createPortalSession;
exports.cancelSubscription = stripe.cancelSubscription;
exports.updatePaymentMethod = stripe.updatePaymentMethod;
exports.generateInvoiceReceipt = stripe.generateInvoiceReceipt;
exports.getStripeSubscriptions = stripe.getStripeSubscriptions;

// Scheduled Functions for Notifications - Now runs hourly to check all timezones
exports.scheduledResearchReminders = onSchedule({
  schedule: '0 * * * *',
  timeZone: 'UTC', // Use UTC as base, calculate user-specific times
  secrets: ['SENDGRID_API_KEY']
}, async (event) => {
  logger.info('🔬 Running scheduled research reminders (hourly check)...');
  
  try {
    const now = new Date();
    const currentHourUTC = now.getUTCHours();
    
    // Get all users who have notifications enabled
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('notificationSettings.researchReminders', '==', true)
      .get();

    const promises = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Get user's timezone settings (default to America/New_York if not set)
      const userSettings = userData.settings || {};
      const userTimezone = userSettings.region?.timeZone || 'America/New_York';
      
      // Check if it's 8 AM in the user's timezone
      const userTime = new Date().toLocaleString("en-US", {
        timeZone: userTimezone,
        hour12: false,
        hour: '2-digit'
      });
      
      // Only send reminders if it's 8 AM in user's timezone (allow 8-9 AM window)
      if (userTime !== '08') {
        continue; // Skip this user, not their reminder time yet
      }
      
      logger.info(`⏰ Sending reminder for user ${userId} in timezone ${userTimezone}`);
      
      // Get user's protocols and check for scheduled tasks today
      const protocolsSnapshot = await admin.firestore()
        .collection('userdata')
        .doc(userId)
        .collection('protocols')
        .get();

      const todayTasks = [];
      
      for (const protocolDoc of protocolsSnapshot.docs) {
        const protocol = protocolDoc.data();
        
        // Check if protocol is active today
        if (protocol.startDate && protocol.endDate) {
          const startDate = new Date(protocol.startDate);
          const endDate = new Date(protocol.endDate);
          
          if (today >= startDate && today <= endDate) {
            // Add protocol tasks to today's list
            if (protocol.peptides) {
              protocol.peptides.forEach(peptide => {
                if (peptide.frequency && peptide.frequency.time) {
                  peptide.frequency.time.forEach(time => {
                    todayTasks.push({
                      name: peptide.name || 'Peptide',
                      dose: peptide.dosage?.amount || '',
                      unit: peptide.dosage?.unit || 'mcg',
                      time: time
                    });
                  });
                }
              });
            }
          }
        }
      }

      // Send reminder if there are tasks today
      if (todayTasks.length > 0) {
        const notificationData = {
          title: 'Research Reminder',
          body: `You have ${todayTasks.length} research task(s) scheduled for today`,
          tasks: todayTasks,
          appUrl: 'https://thepepplanner.com/app/dashboard'
        };

        promises.push(
          pushNotifications.sendPushNotificationByType(userId, 'researchReminders', notificationData)
        );
      }
    }

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
    logger.info(`✅ Research reminders sent: ${successful}/${results.length}`);
    return { success: true, sent: successful, total: results.length };
    
  } catch (error) {
    logger.error('❌ Error in scheduled research reminders:', error);
    return { success: false, error: error.message };
  }
});

// Trigger Functions for Real-time Notifications
exports.onOrderStatusChange = onDocumentUpdated('userdata/{userId}/orders/{orderId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const userId = event.params.userId;
  
  if (!before || !after) {
    logger.warn('Missing before/after data in order status change');
    return;
  }
  
  // Check if status changed
  if (before.status !== after.status) {
    logger.info(`📦 Order status changed for user ${userId}: ${before.status} -> ${after.status}`);
    
    const notificationData = {
      title: 'Order Status Update',
      body: `Your order #${after.id || event.params.orderId} status changed to: ${after.status}`,
      orderId: event.params.orderId,
      status: after.status,
      appUrl: 'https://thepepplanner.com/app/orders'
    };

    return pushNotifications.sendPushNotificationByType(userId, 'billing', notificationData);
  }
  
  return null;
});

exports.onSubscriptionChange = onDocumentUpdated('users/{userId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const userId = event.params.userId;
  
  if (!before || !after) {
    logger.warn('Missing before/after data in subscription change');
    return;
  }
  
  // Check if subscription changed
  if (JSON.stringify(before.subscription) !== JSON.stringify(after.subscription)) {
    logger.info(`💳 Subscription changed for user ${userId}`);
    
    const subscription = after.subscription || {};
    const notificationData = {
      title: 'Subscription Update',
      body: `Your subscription has been updated`,
      plan: subscription.plan || 'Unknown',
      status: subscription.status || 'Unknown',
      amount: subscription.price || 0,
      date: new Date().toLocaleDateString(),
      manageUrl: 'https://thepepplanner.com/app/account'
    };

    return pushNotifications.sendPushNotificationByType(userId, 'billing', notificationData);
  }
  
  return null;
});

exports.onGroupBuyUpdate = onDocumentUpdated('userdata/{userId}/scheduledBuys/{buyId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const userId = event.params.userId;
  
  if (!before || !after) {
    logger.warn('Missing before/after data in group buy update');
    return;
  }
  
  // Check if group buy status changed
  if (before.status !== after.status) {
    logger.info(`🛒 Group buy status changed for user ${userId}: ${before.status} -> ${after.status}`);
    
    const notificationData = {
      title: 'Group Buy Update',
      body: `Your group buy "${after.peptide || 'Unknown'}" status changed to: ${after.status}`,
      peptide: after.peptide || 'Unknown',
      vendor: after.vendor || 'Unknown',
      status: after.status,
      expectedDelivery: after.expectedDelivery || 'TBD',
      appUrl: 'https://thepepplanner.com/app/orders'
    };

    return pushNotifications.sendPushNotificationByType(userId, 'groupBuys', notificationData);
  }
  
  return null;
});

// Manual notification trigger (for testing)
exports.sendTestNotification = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new Error('User must be authenticated');
  }

  const userId = request.auth.uid;
  const { type, testData } = request.data;

  logger.info(`🧪 Sending test notification to ${userId}: ${type}`);

  const notificationData = {
    title: `Test ${type} Notification`,
    body: 'This is a test notification from The Pep Planner',
    ...testData
  };

  return pushNotifications.sendPushNotificationByType(userId, type, notificationData);
});

// Admin notification functions
exports.sendAdminNotification = onCall(async (request) => {
  // Verify user is authenticated and is admin
  if (!request.auth) {
    throw new Error('User must be authenticated');
  }

  // Check if user is admin (your email)
  const adminEmail = 'lebrockmaldonado@gmail.com';
  const userEmail = request.auth.token.email;
  
  if (userEmail !== adminEmail) {
    throw new Error('Unauthorized: Admin access required');
  }

  const { 
    targetType, // 'specific', 'all', 'active', 'inactive', 'premium'
    targetEmail, // for specific user targeting
    notification 
  } = request.data;

  logger.info(`🔧 Admin sending notification - Type: ${targetType}, From: ${userEmail}`);

  try {
    let results = [];

    if (targetType === 'specific' && targetEmail) {
      // Send to specific user by email
      const userSnapshot = await admin.firestore()
        .collection('users')
        .where('email', '==', targetEmail.toLowerCase())
        .limit(1)
        .get();

      if (userSnapshot.empty) {
        throw new Error(`User not found: ${targetEmail}`);
      }

      const userDoc = userSnapshot.docs[0];
      const userId = userDoc.id;
      
      const result = await pushNotifications.sendPushNotification(
        userId,
        notification.title,
        notification.body,
        {
          source: 'admin',
          timestamp: Date.now(),
          ...notification.data
        }
      );

      results.push({ userId, email: targetEmail, ...result });

    } else if (targetType === 'test_admin') {
      // Send test notification to admin (you)
      // Try to find admin user by email query first
      let adminSnapshot = await admin.firestore()
        .collection('users')
        .where('email', '==', adminEmail)
        .limit(1)
        .get();
      
      // If not found, try to get the current requesting user's document
      if (adminSnapshot.empty) {
        const adminUserId = request.auth.uid;
        if (adminUserId) {
          const adminDoc = await admin.firestore().collection('users').doc(adminUserId).get();
          if (adminDoc.exists) {
            adminSnapshot = adminDoc;
          }
        }
      }

      if (!adminSnapshot.empty) {
        const adminDoc = Array.isArray(adminSnapshot.docs) ? adminSnapshot.docs[0] : adminSnapshot;
        const adminUserId = adminDoc.id;
        
        const result = await pushNotifications.sendPushNotification(
          adminUserId,
          notification.title,
          notification.body,
          {
            source: 'admin-test',
            timestamp: Date.now(),
            ...notification.data
          }
        );

        results.push({ userId: adminUserId, email: adminEmail, ...result });
      }

    } else if (targetType === 'all') {
      // Send to all users with push notifications enabled
      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('notificationSettings.push', '==', true)
        .get();

      const promises = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        promises.push(
          pushNotifications.sendPushNotification(
            userId,
            notification.title,
            notification.body,
            {
              source: 'admin-broadcast',
              timestamp: Date.now(),
              ...notification.data
            }
          ).then(result => ({ userId, ...result }))
        );
      }

      const allResults = await Promise.allSettled(promises);
      results = allResults.map((result, index) => ({
        userId: usersSnapshot.docs[index].id,
        success: result.status === 'fulfilled' ? result.value.success : false,
        error: result.status === 'rejected' ? result.reason.message : result.value.error
      }));
    }

    const successful = results.filter(r => r.success).length;
    
    logger.info(`✅ Admin notification sent: ${successful}/${results.length} successful`);
    
    return {
      success: true,
      sent: successful,
      total: results.length,
      results: results.slice(0, 10) // Limit returned results for large broadcasts
    };

  } catch (error) {
    logger.error('❌ Admin notification failed:', error);
    throw new Error(`Admin notification failed: ${error.message}`);
  }
});

// Get admin notification stats
exports.getAdminNotificationStats = onCall(async (request) => {
  // Verify user is authenticated and is admin
  if (!request.auth) {
    throw new Error('User must be authenticated');
  }

  const adminEmail = 'lebrockmaldonado@gmail.com';
  const userEmail = request.auth.token.email;
  
  if (userEmail !== adminEmail) {
    throw new Error('Unauthorized: Admin access required');
  }

  try {
    // Get users with push notifications enabled
    const usersWithPushSnapshot = await admin.firestore()
      .collection('users')
      .where('notificationSettings.push', '==', true)
      .get();

    // Get total users
    const totalUsersSnapshot = await admin.firestore()
      .collection('users')
      .get();

    // Get active users (logged in within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeUsersSnapshot = await admin.firestore()
      .collection('users')
      .where('lastLoginAt', '>=', sevenDaysAgo)
      .get();

    return {
      totalUsers: totalUsersSnapshot.size,
      usersWithPushEnabled: usersWithPushSnapshot.size,
      activeUsers: activeUsersSnapshot.size,
      pushEnabledPercentage: Math.round((usersWithPushSnapshot.size / totalUsersSnapshot.size) * 100)
    };

  } catch (error) {
    logger.error('❌ Failed to get admin notification stats:', error);
    throw new Error(`Failed to get stats: ${error.message}`);
  }
});

// Test email system function
exports.testEmailSystem = testEmailSystem.testEmailSystem;

// Quick email test function
exports.quickEmailTest = quickEmailTest.quickEmailTest;

// Email Automation Functions
exports.onSubscriptionConfirmed = emailAutomation.onSubscriptionConfirmed;
exports.onPaymentFailed = emailAutomation.onPaymentFailed;
exports.onPaymentSuccessful = emailAutomation.onPaymentSuccessful;
exports.onSubscriptionCancelled = emailAutomation.onSubscriptionCancelled;
exports.checkTrialEndingSoon = emailAutomation.checkTrialEndingSoon;
exports.checkRenewalReminders = emailAutomation.checkRenewalReminders;
exports.sendWeeklyResearchReminders = emailAutomation.sendWeeklyResearchReminders;
exports.testEmailAutomation = emailAutomation.testEmailAutomation;
exports.getEmailStats = emailAutomation.getEmailStats;

// Stripe Webhook Handler
exports.stripeWebhook = stripeWebhooks.stripeWebhook;

// Custom email verification function
exports.sendCustomVerificationEmail = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY']
  },
  async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new Error('User must be authenticated');
  }

  const { userEmail } = request.data;
  const userId = request.auth.uid;

  logger.info(`📧 Sending custom verification email to: ${userEmail}`);

  try {
    // Generate a custom verification token
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    
    // Store the token in Firestore with expiration (1 hour)
    const tokenRef = admin.firestore().collection('verificationTokens').doc(verificationToken);
    await tokenRef.set({
      userId,
      userEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      used: false
    });

    // Send custom verification email via SendGrid
    await emailService.sendCustomVerificationEmail(userEmail, verificationToken);
    
    logger.info(`✅ Custom verification email sent to: ${userEmail}`);
    return { success: true, message: 'Verification email sent' };
    
  } catch (error) {
    logger.error('❌ Failed to send custom verification email:', error);
    throw new Error('Failed to send verification email');
  }
});

// Verify email with custom token
exports.verifyEmailWithToken = onCall(
  {
    cors: true
  },
  async (request) => {
  const { token } = request.data;

  if (!token) {
    throw new Error('Verification token is required');
  }

  logger.info(`🔍 Verifying email with token: ${token}`);

  try {
    // Get the token from Firestore
    const tokenRef = admin.firestore().collection('verificationTokens').doc(token);
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      throw new Error('Invalid verification token');
    }

    const tokenData = tokenDoc.data();
    
    // Check if token is expired
    if (new Date() > tokenData.expiresAt.toDate()) {
      throw new Error('Verification token has expired');
    }

    // Check if token is already used
    if (tokenData.used) {
      throw new Error('Verification token has already been used');
    }

    // Mark token as used
    await tokenRef.update({ used: true, usedAt: admin.firestore.FieldValue.serverTimestamp() });

    // Update user's email verification status in Firestore
    const userRef = admin.firestore().collection('users').doc(tokenData.userId);
    await userRef.update({ 
      emailVerified: true,
      emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`✅ Email verified for user: ${tokenData.userId}`);
    return { success: true, message: 'Email verified successfully' };
    
  } catch (error) {
    logger.error('❌ Failed to verify email:', error);
    throw error;
  }
});

// 📧 Email Functions

// Send welcome email when new user is created
exports.onUserCreated = onDocumentCreated(
  {
    document: 'users/{userId}',
    secrets: ['SENDGRID_API_KEY']
  },
  async (event) => {
  const userData = event.data.data();
  const userId = event.params.userId;
  
  logger.info(`👋 New user created: ${userId} (${userData.email})`);
  
  try {
    // Send welcome email
    await emailService.sendWelcomeEmail(userData.email, userData.displayName || null);
    logger.info(`✅ Welcome email sent to: ${userData.email}`);
    
    // Send custom verification email
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    
    // Store the token in Firestore with expiration (1 hour)
    const tokenRef = admin.firestore().collection('verificationTokens').doc(verificationToken);
    await tokenRef.set({
      userId,
      userEmail: userData.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      used: false
    });

    // Send custom verification email via SendGrid
    await emailService.sendCustomVerificationEmail(userData.email, verificationToken);
    logger.info(`✅ Custom verification email sent to: ${userData.email}`);
    
  } catch (error) {
    logger.error('❌ Failed to send emails:', error);
    // Don't fail the function if email fails
  }
  
  return null;
});

// Scheduled function to remind users about trial ending - Now timezone-aware
exports.scheduledTrialReminders = onSchedule({
  schedule: '0 * * * *',
  timeZone: 'UTC', // Use UTC as base, calculate user-specific times
  secrets: ['SENDGRID_API_KEY']
}, async (event) => {
  logger.info('🔔 Running scheduled trial ending reminders (hourly check)...');
  
  try {
    // Find all users (we'll filter by timezone later)
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('subscription.status', '==', 'trialing')
      .get();

    const now = new Date();
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    
    const promises = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Get user's timezone settings (default to America/New_York if not set)
      const userSettings = userData.settings || {};
      const userTimezone = userSettings.region?.timeZone || 'America/New_York';
      
      // Check if it's 9 AM in the user's timezone
      const userTime = new Date().toLocaleString("en-US", {
        timeZone: userTimezone,
        hour12: false,
        hour: '2-digit'
      });
      
      // Only send reminders if it's 9 AM in user's timezone
      if (userTime !== '09') {
        continue; // Skip this user, not their reminder time yet
      }
      
      const subscription = userData.subscription || {};
      
      if (subscription.currentPeriodEnd) {
        const endDate = new Date(subscription.currentPeriodEnd);
        const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        // Send reminder if 2 days left
        if (daysLeft === 2) {
          promises.push(
            emailService.sendTrialEndingEmail(userData.email, daysLeft)
          );
        }
      }
    }

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    logger.info(`✅ Trial ending emails sent: ${successful}/${results.length}`);
    return { success: true, sent: successful, total: results.length };
    
  } catch (error) {
    logger.error('❌ Error in scheduled trial reminders:', error);
    return { success: false, error: error.message };
  }
});