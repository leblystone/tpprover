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
const giftAccess = require('./giftAccess');
const founderOffer = require('./founderOffer');
const manualSyncSubscription = require('./manualSyncSubscription');
// Test webhook email simulation
const testWebhookSimulation = require('./testWebhookSimulation');

admin.initializeApp();

// Import and export the Stripe functions individually
exports.createCheckoutSession = stripe.createCheckoutSession;
exports.createPortalSession = stripe.createPortalSession;
exports.cancelSubscription = stripe.cancelSubscription;
exports.updatePaymentMethod = stripe.updatePaymentMethod;
exports.generateInvoiceReceipt = stripe.generateInvoiceReceipt;
exports.getStripeSubscriptions = stripe.getStripeSubscriptions;
exports.completeGiftFromSession = stripe.completeGiftFromSession;
exports.getFounderOfferStatus = founderOffer.getFounderOfferStatus;

// Admin Functions - Use Admin SDK to bypass client-side security rules
exports.adminGrantLifetimeAccess = onCall(
  {
    cors: true
  },
  async (request) => {
    try {
      // Verify admin password (simple auth check)
      const { adminPassword, userId, email, reason, grantedBy } = request.data;
      
      const ADMIN_PASSWORD = 'j&jm9102';
      if (adminPassword !== ADMIN_PASSWORD) {
        throw new Error('Invalid admin password');
      }
      
      if (!email) {
        throw new Error('email is required');
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      logger.info('🎁 Admin granting lifetime access to:', normalizedEmail, userId || 'no userId (pre-grant)');
      
      // Use Admin SDK to write directly (bypasses security rules)
      const db = admin.firestore();
      
      // If userId is provided, grant access to existing user
      // If userId is not provided, create a pre-grant that will be applied when user signs up
      if (userId) {
        // User exists - grant access immediately
        logger.info('✅ User exists, granting lifetime access immediately');
        
        // Create lifetime access document
        await db.collection('lifetimeAccess').doc(userId).set({
          userId,
          email: normalizedEmail,
          hasLifetimeAccess: true,
          reason: reason || 'Beta tester',
          grantedBy: grantedBy || 'admin',
          grantedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'active',
          metadata: {
            isBetaTester: (reason || '').toLowerCase().includes('beta'),
            isFounder: (reason || '').toLowerCase().includes('founder'),
            isManualGrant: true
          }
        }, { merge: true });
        
        // Update user document
        await db.collection('users').doc(userId).set({
          subscription: {
            hasLifetimeAccess: true,
            lifetimeReason: reason || 'Beta tester',
            lifetimeGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
            plan: 'lifetime',
            status: 'active'
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // CRITICAL: Also write to userSubscriptions collection (where app reads from)
        const subscriptionData = {
          hasLifetimeAccess: true,
          interval: 'lifetime',
          status: 'active',
          plan: 'lifetime',
          lifetimeReason: reason || 'Beta tester',
          lifetimeGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
          currentPeriodEnd: null, // Lifetime has no end date
          currentPeriodStart: admin.firestore.FieldValue.serverTimestamp(),
          userId: userId,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('userSubscriptions').doc(userId).set({
          subscription: subscriptionData
        }, { merge: true });
      } else {
        // User doesn't exist yet - create pre-grant that will be applied on signup
        logger.info('⚠️ User does not exist yet, creating pre-grant for email:', normalizedEmail);
        
        // Create a pre-grant document keyed by email (not userId)
        // This will be checked when the user signs up
        await db.collection('lifetimeAccessPreGrants').doc(normalizedEmail).set({
          email: normalizedEmail,
          hasLifetimeAccess: true,
          reason: reason || 'Beta tester',
          grantedBy: grantedBy || 'admin',
          grantedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'pending', // Will be activated when user signs up
          metadata: {
            isBetaTester: (reason || '').toLowerCase().includes('beta'),
            isFounder: (reason || '').toLowerCase().includes('founder'),
            isManualGrant: true,
            isPreGrant: true
          }
        }, { merge: true });
        
        logger.info('✅ Pre-grant created - will be applied when user signs up');
      }
      
      logger.info('✅ Lifetime access granted successfully');
      
      return { 
        success: true, 
        message: `Lifetime access granted to ${email}` 
      };
    } catch (error) {
      logger.error('❌ Error granting lifetime access:', error);
      throw new Error(`Failed to grant lifetime access: ${error.message}`);
    }
  }
);

exports.adminRevokeLifetimeAccess = onCall(
  {
    cors: true
  },
  async (request) => {
    try {
      const { adminPassword, userId, reason } = request.data;
      
      const ADMIN_PASSWORD = 'j&jm9102';
      if (adminPassword !== ADMIN_PASSWORD) {
        throw new Error('Invalid admin password');
      }
      
      if (!userId) {
        throw new Error('userId is required');
      }
      
      logger.info('🚫 Admin revoking lifetime access for:', userId);
      
      const db = admin.firestore();
      
      // Update lifetime access document
      await db.collection('lifetimeAccess').doc(userId).update({
        hasLifetimeAccess: false,
        status: 'revoked',
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        revokedBy: 'admin',
        revocationReason: reason || 'Manual revocation'
      });
      
      // Update user document
      await db.collection('users').doc(userId).update({
        'subscription.hasLifetimeAccess': false,
        'subscription.status': 'revoked',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      logger.info('✅ Lifetime access revoked successfully');
      
      return { 
        success: true, 
        message: `Lifetime access revoked for user ${userId}` 
      };
    } catch (error) {
      logger.error('❌ Error revoking lifetime access:', error);
      throw new Error(`Failed to revoke lifetime access: ${error.message}`);
    }
  }
);

exports.adminExtendTrialPeriod = onCall(
  {
    cors: true
  },
  async (request) => {
    try {
      const { adminPassword, userId, days, note, adminEmail } = request.data;
      
      const ADMIN_PASSWORD = 'j&jm9102';
      if (adminPassword !== ADMIN_PASSWORD) {
        throw new Error('Invalid admin password');
      }
      
      if (!userId) {
        throw new Error('userId is required');
      }
      
      if (!days || days <= 0) {
        throw new Error('days must be a positive number');
      }
      
      logger.info(`⏰ Admin extending trial for user ${userId} by ${days} days`);
      
      const db = admin.firestore();
      const now = new Date();
      
      // Get existing subscription data
      const userRef = db.collection('users').doc(userId);
      const subscriptionRef = db.collection('userSubscriptions').doc(userId);
      
      const [userDoc, subscriptionDoc] = await Promise.all([
        userRef.get(),
        subscriptionRef.get()
      ]);
      
      const userData = userDoc.data() || {};
      const subscriptionData = subscriptionDoc.data() || {};
      const existingSubscription = subscriptionData.subscription || userData.subscription || {};
      
      // Calculate new end date
      let currentEnd = now;
      if (existingSubscription.currentPeriodEnd) {
        const parsedEnd = new Date(existingSubscription.currentPeriodEnd);
        if (!isNaN(parsedEnd.getTime()) && parsedEnd > now) {
          currentEnd = parsedEnd;
        }
      }
      
      const newEndDate = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);
      const newEndIso = newEndDate.toISOString();
      
      // Create extension history entry
      const extensionEntry = {
        extendedAt: now.toISOString(),
        extendedBy: adminEmail || 'admin@thepepplanner.com',
        addedDays: days,
        note: note || '',
        oldEnd: currentEnd.toISOString(),
        newEnd: newEndIso
      };
      
      // Update subscription
      const updatedSubscription = {
        ...existingSubscription,
        plan: '10-Day Research Trial',
        interval: 'trial',
        status: 'trialing',
        startedAt: existingSubscription.startedAt || existingSubscription.currentPeriodStart || now.toISOString(),
        currentPeriodStart: existingSubscription.currentPeriodStart || existingSubscription.startedAt || now.toISOString(),
        currentPeriodEnd: newEndIso,
        paymentMethod: existingSubscription.paymentMethod || null,
        adminExtended: true,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Get existing history
      const subscriptionHistory = Array.isArray(subscriptionData.trialExtensionHistory)
        ? [...subscriptionData.trialExtensionHistory]
        : [];
      subscriptionHistory.push(extensionEntry);
      
      const userHistory = Array.isArray(userData.trialExtensionHistory)
        ? [...userData.trialExtensionHistory]
        : [];
      userHistory.push(extensionEntry);
      
      // Update both collections
      await Promise.all([
        subscriptionRef.set({
          subscription: updatedSubscription,
          trialExtensionHistory: subscriptionHistory
        }, { merge: true }),
        
        userRef.set({
          subscription: {
            ...(userData.subscription || {}),
            plan: updatedSubscription.plan,
            interval: 'trial',
            status: 'trialing',
            currentPeriodEnd: newEndIso,
            currentPeriodStart: updatedSubscription.currentPeriodStart,
            adminExtended: true,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          },
          trialEndDate: admin.firestore.Timestamp.fromDate(newEndDate),
          trialExtensionHistory: userHistory,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
      ]);
      
      logger.info(`✅ Trial extended successfully. New end date: ${newEndIso}`);
      
      return { 
        success: true, 
        message: `Trial extended by ${days} days`,
        newEndDate: newEndIso,
        extensionEntry
      };
    } catch (error) {
      logger.error('❌ Error extending trial:', error);
      throw new Error(`Failed to extend trial: ${error.message}`);
    }
  }
);

// Manual Subscription Sync - Admin function to resync subscriptions from Stripe
exports.manualSyncSubscription = manualSyncSubscription.manualSyncSubscription;

// Audit Lifetime Access - Read-only function to find conflicting lifetime grants
const auditLifetimeAccess = require('./auditLifetimeAccess');
exports.auditLifetimeAccess = auditLifetimeAccess.auditLifetimeAccess;

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
        
        // Determine notification type based on notification ID or content
        let notificationType = 'push'; // Default to checking main push setting
        if (notification.data?.notificationId) {
          const typeMap = {
            'lowStock': 'lowStockAlerts',
            'researchReminders': 'researchReminders', 
            'groupBuys': 'groupBuys',
            'orderStatusUpdates': 'orderStatusUpdates',
            'washoutReminders': 'washoutReminders',
            'cycleReminders': 'cycleReminders'
          };
          notificationType = typeMap[notification.data.notificationId] || 'push';
        }

        const result = await pushNotifications.sendPushNotificationByType(
          adminUserId,
          notificationType,
          {
            title: notification.title,
            body: notification.body,
            data: {
              source: 'admin-test',
              timestamp: Date.now(),
              ...notification.data
            }
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

// Test SendGrid API key validity
exports.testSendGridConnection = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY']
  },
  async (request) => {
    try {
      const sendgridApiKey = process.env.SENDGRID_API_KEY?.trim().replace(/\r?\n/g, '');
      
      logger.info('🔑 Testing SendGrid API key...');
      logger.info('🔑 API Key length:', sendgridApiKey ? sendgridApiKey.length : 0);
      logger.info('🔑 API Key starts with SG.:', sendgridApiKey ? sendgridApiKey.startsWith('SG.') : false);
      
      if (!sendgridApiKey) {
        throw new Error('SendGrid API key not configured');
      }
      
      if (!sendgridApiKey.startsWith('SG.') || sendgridApiKey.length < 60) {
        throw new Error('Invalid SendGrid API key format');
      }
      
      // Test with a simple API call
      const sgClient = require('@sendgrid/client');
      sgClient.setApiKey(sendgridApiKey);
      
      const testRequest = {
        url: '/v3/user/account',
        method: 'GET'
      };
      
      const [response] = await sgClient.request(testRequest);
      
      logger.info('✅ SendGrid API key is valid');
      logger.info('📊 Account info:', response.body);
      
      return { 
        success: true, 
        message: 'SendGrid API key is valid',
        accountType: response.body.type,
        accountStatus: response.body.status
      };
      
    } catch (error) {
      logger.error('❌ SendGrid API key test failed:', error);
      return { 
        success: false, 
        message: error.message,
        error: error.code || 'Unknown error'
      };
    }
  }
);
exports.checkTrialEndingSoon = emailAutomation.checkTrialEndingSoon;
exports.checkRenewalReminders = emailAutomation.checkRenewalReminders;
exports.checkGiftExpiringSoon = emailAutomation.checkGiftExpiringSoon;
exports.sendWeeklyResearchReminders = emailAutomation.sendWeeklyResearchReminders;
exports.testEmailAutomation = emailAutomation.testEmailAutomation;
exports.getEmailStats = emailAutomation.getEmailStats;

// Stripe Webhook Handler
exports.stripeWebhook = stripeWebhooks.stripeWebhook;

// Test webhook email simulation (safe testing)
exports.testWebhookEmails = testWebhookSimulation.testWebhookEmails;

// Custom password reset function
exports.sendCustomPasswordResetEmail = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY']
  },
  async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const userId = request.auth.uid;
    
    // Get user's email from Firebase Auth
    const userRecord = await admin.auth().getUser(userId);
    const userEmail = userRecord.email;

    logger.info(`🔐 Sending custom password reset email to: ${userEmail}`);

    try {
      // Generate a custom password reset token
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      
      // Store the token in Firestore with expiration (1 hour)
      const tokenRef = admin.firestore().collection('passwordResetTokens').doc(resetToken);
      await tokenRef.set({
        userId,
        userEmail,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        used: false
      });

      // Send custom password reset email via SendGrid
      await emailService.sendCustomPasswordResetEmail(userEmail, resetToken);
      
      logger.info(`✅ Custom password reset email sent to: ${userEmail}`);
      return { success: true, message: 'Password reset email sent' };
      
    } catch (error) {
      logger.error('❌ Failed to send custom password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
);

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

  const userId = request.auth.uid;
  
  // Get user's email from Firebase Auth
  const userRecord = await admin.auth().getUser(userId);
  const userEmail = userRecord.email;

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

    // Update user's email verification status in Firebase Auth (CRITICAL: This is what the frontend checks)
    await admin.auth().updateUser(tokenData.userId, {
      emailVerified: true
    });

    // Update user's email verification status in Firestore (for record keeping)
    const userRef = admin.firestore().collection('users').doc(tokenData.userId);
    await userRef.update({ 
      emailVerified: true,
      emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`✅ Email verified for user: ${tokenData.userId} (Firebase Auth + Firestore updated)`);
    return { success: true, message: 'Email verified successfully' };
    
  } catch (error) {
    logger.error('❌ Failed to verify email:', error);
    throw error;
  }
});

// Verify password reset token
exports.verifyResetToken = onCall(
  {
    cors: true
  },
  async (request) => {
    const { token } = request.data;

    if (!token) {
      throw new Error('Reset token is required');
    }

    logger.info(`🔍 Verifying password reset token: ${token}`);

    try {
      // Get the token from Firestore
      const tokenRef = admin.firestore().collection('passwordResetTokens').doc(token);
      const tokenDoc = await tokenRef.get();

      if (!tokenDoc.exists) {
        throw new Error('Invalid password reset token');
      }

      const tokenData = tokenDoc.data();
      
      // Check if token is expired
      if (new Date() > tokenData.expiresAt.toDate()) {
        throw new Error('Password reset token has expired');
      }

      // Check if token is already used
      if (tokenData.used) {
        throw new Error('Password reset token has already been used');
      }

      logger.info(`✅ Password reset token is valid for user: ${tokenData.userId}`);
      return { success: true, message: 'Token is valid' };
      
    } catch (error) {
      logger.error('❌ Failed to verify password reset token:', error);
      return { success: false, message: error.message };
    }
  }
);

// Reset password with custom token
exports.resetPasswordWithToken = onCall(
  {
    cors: true
  },
  async (request) => {
    const { token, newPassword } = request.data;

    if (!token || !newPassword) {
      throw new Error('Token and new password are required');
    }

    logger.info(`🔐 Resetting password with token: ${token}`);

    try {
      // Get the token from Firestore
      const tokenRef = admin.firestore().collection('passwordResetTokens').doc(token);
      const tokenDoc = await tokenRef.get();

      if (!tokenDoc.exists) {
        throw new Error('Invalid password reset token');
      }

      const tokenData = tokenDoc.data();
      
      // Check if token is expired
      if (new Date() > tokenData.expiresAt.toDate()) {
        throw new Error('Password reset token has expired');
      }

      // Check if token is already used
      if (tokenData.used) {
        throw new Error('Password reset token has already been used');
      }

      // Update user's password using Firebase Admin SDK
      await admin.auth().updateUser(tokenData.userId, {
        password: newPassword
      });

      // Mark token as used
      await tokenRef.update({ 
        used: true, 
        usedAt: admin.firestore.FieldValue.serverTimestamp() 
      });

      logger.info(`✅ Password reset successfully for user: ${tokenData.userId}`);
      return { success: true, message: 'Password reset successfully' };
      
    } catch (error) {
      logger.error('❌ Failed to reset password:', error);
      return { success: false, message: error.message };
    }
  }
);

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
  const userEmail = userData.email?.toLowerCase().trim();
  
  logger.info(`👋 New user created: ${userId} (${userEmail})`);
  
  try {
    // Check for pre-granted lifetime access (granted before user signed up)
    const db = admin.firestore();
    const preGrantRef = db.collection('lifetimeAccessPreGrants').doc(userEmail);
    const preGrantDoc = await preGrantRef.get();
    
    if (preGrantDoc.exists()) {
      const preGrant = preGrantDoc.data();
      logger.info(`🎁 Found pre-granted lifetime access for: ${userEmail}`);
      
      if (preGrant.status === 'pending' && preGrant.hasLifetimeAccess) {
        // Apply the pre-grant to the new user
        logger.info(`✅ Applying pre-granted lifetime access to user: ${userId}`);
        
        // Create lifetime access document
        await db.collection('lifetimeAccess').doc(userId).set({
          userId,
          email: userEmail,
          hasLifetimeAccess: true,
          reason: preGrant.reason || 'Beta tester',
          grantedBy: preGrant.grantedBy || 'admin',
          grantedAt: preGrant.grantedAt || admin.firestore.FieldValue.serverTimestamp(),
          status: 'active',
          metadata: preGrant.metadata || {}
        }, { merge: true });
        
        // Update user document
        await db.collection('users').doc(userId).set({
          subscription: {
            hasLifetimeAccess: true,
            lifetimeReason: preGrant.reason || 'Beta tester',
            lifetimeGrantedAt: preGrant.grantedAt || admin.firestore.FieldValue.serverTimestamp(),
            plan: 'lifetime',
            status: 'active'
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Write to userSubscriptions collection
        const subscriptionData = {
          hasLifetimeAccess: true,
          interval: 'lifetime',
          status: 'active',
          plan: 'lifetime',
          lifetimeReason: preGrant.reason || 'Beta tester',
          lifetimeGrantedAt: preGrant.grantedAt || admin.firestore.FieldValue.serverTimestamp(),
          currentPeriodEnd: null,
          currentPeriodStart: preGrant.grantedAt || admin.firestore.FieldValue.serverTimestamp(),
          userId: userId,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('userSubscriptions').doc(userId).set({
          subscription: subscriptionData
        }, { merge: true });
        
        // Mark pre-grant as applied
        await preGrantRef.update({
          status: 'applied',
          appliedAt: admin.firestore.FieldValue.serverTimestamp(),
          appliedToUserId: userId
        });
        
        logger.info(`✅ Pre-granted lifetime access applied successfully to: ${userId}`);
      }
    }
    
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
  secrets: ['SENDGRID_API_KEY', 'LOGO_URL']
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

// Send custom announcement email (for maintenance, downtime, etc.)
exports.sendCustomAnnouncementEmail = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY']
  },
  async (request) => {
    const { userEmail, userName } = request.data;

    if (!userEmail) {
      throw new Error('userEmail is required');
    }

    logger.info(`📢 Sending custom announcement email to: ${userEmail}`);

    try {
      const emailService = require('./emailService');
      const success = await emailService.sendCustomAnnouncementEmail(userEmail, userName);
      
      if (success) {
        logger.info(`✅ Custom announcement email sent successfully to: ${userEmail}`);
        return { success: true, message: 'Custom announcement email sent successfully' };
      } else {
        logger.warn(`⚠️ Failed to send custom announcement email to: ${userEmail}`);
        return { success: false, message: 'Failed to send email' };
      }
    } catch (error) {
      logger.error(`❌ Error sending custom announcement email: ${error.message}`);
      throw new Error('Failed to send custom announcement email');
    }
  }
);

// Send lifetime access granted email
exports.sendLifetimeAccessEmail = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY', 'LOGO_URL']
  },
  async (request) => {
    const { userEmail, userName, reason } = request.data;

    if (!userEmail) {
      throw new Error('userEmail is required');
    }

    logger.info(`📧 Sending lifetime access email to: ${userEmail}`);
    logger.info(`📧 Email params: userName=${userName}, reason=${reason}`);

    try {
      const emailService = require('./emailService');
      const success = await emailService.sendLifetimeAccessEmail(userEmail, userName, reason);
      
      if (success) {
        logger.info(`✅ Lifetime access email sent successfully to: ${userEmail}`);
        return { success: true, message: 'Lifetime access email sent successfully' };
      } else {
        logger.warn(`⚠️ Failed to send lifetime access email to: ${userEmail}`);
        return { success: false, message: 'Failed to send email' };
      }
    } catch (error) {
      logger.error(`❌ Error sending lifetime access email: ${error.message}`);
      logger.error(`❌ Error stack: ${error.stack}`);
      logger.error(`❌ Full error:`, error);
      // Return error details instead of throwing to avoid INTERNAL error
      return { 
        success: false, 
        message: `Failed to send lifetime access email: ${error.message}`,
        error: error.message
      };
    }
  }
);

// ===== CONTACT FORM FUNCTION =====

// Handle contact form submissions from landing page
exports.submitContactForm = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY']
  },
  async (request) => {
    const { name, email, subject, message } = request.data;

    if (!name || !email || !subject || !message) {
      throw new Error('All fields are required');
    }

    logger.info(`📧 Contact form submission from: ${email} (${name})`);

    try {
      // Escape HTML to prevent XSS
      const escapeHtml = (text) => {
        const map = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
      };

      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safeSubject = escapeHtml(subject);
      const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

      // Format the email HTML
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f0;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #2F3B3A; margin-bottom: 20px;">Contact Form Message Received</h2>
            <div style="margin-bottom: 20px;">
              <p style="color: #6B7D7A; margin: 5px 0;"><strong style="color: #2F3B3A;">From:</strong> ${safeName}</p>
              <p style="color: #6B7D7A; margin: 5px 0;"><strong style="color: #2F3B3A;">Email:</strong> ${safeEmail}</p>
              <p style="color: #6B7D7A; margin: 5px 0;"><strong style="color: #2F3B3A;">Subject:</strong> ${safeSubject}</p>
            </div>
            <div style="background-color: #F5F5F0; padding: 15px; border-radius: 4px; margin-top: 20px;">
              <p style="color: #2F3B3A; margin: 0;">${safeMessage}</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #DDE6DE;">
              <p style="color: #6B7D7A; font-size: 12px; margin: 0;">This message was sent from The Pep Planner contact form.</p>
            </div>
          </div>
        </div>
      `;

      // Send email using the emailService
      const success = await emailService.sendEmail(
        'contact@thepepplanner.com',
        'Contact Form Message Received',
        emailHtml
      );

      if (success) {
        logger.info(`✅ Contact form email sent successfully from: ${email}`);
        return { success: true, message: 'Message sent successfully' };
      } else {
        logger.warn(`⚠️ Failed to send contact form email from: ${email}`);
        return { success: false, message: 'Failed to send email' };
      }
    } catch (error) {
      logger.error(`❌ Error sending contact form email: ${error.message}`);
      throw new Error('Failed to send contact form message');
    }
  }
);

// ===== GIFT ACCESS FUNCTIONS =====

// Create gift access
exports.createGiftAccess = onCall(
  {
    cors: true
  },
  async (request) => {
    const { 
      giftGiverEmail, 
      giftGiverName, 
      recipientEmail, 
      recipientName, 
      giftMessage, 
      subscriptionType, 
      stripePaymentIntentId, 
      pricePaid 
    } = request.data;

    if (!giftGiverEmail || !recipientEmail || !subscriptionType || !stripePaymentIntentId) {
      throw new Error('Missing required fields');
    }

    logger.info(`🎁 Creating gift access: ${subscriptionType} from ${giftGiverEmail} to ${recipientEmail}`);

    try {
      const result = await giftAccess.createGiftAccess(
        giftGiverEmail,
        giftGiverName,
        recipientEmail,
        recipientName,
        giftMessage,
        subscriptionType,
        stripePaymentIntentId,
        pricePaid
      );

      return { success: true, giftData: result };
    } catch (error) {
      logger.error(`❌ Error creating gift access: ${error.message}`);
      throw new Error(`Failed to create gift access: ${error.message}`);
    }
  }
);

// Redeem gift access
exports.redeemGiftAccess = onCall(
  {
    cors: true
  },
  async (request) => {
    const { giftId, userId, userEmail } = request.data;

    if (!giftId || !userId || !userEmail) {
      throw new Error('Missing required fields');
    }

    logger.info(`🎁 Redeeming gift access: ${giftId} by ${userEmail}`);

    try {
      const result = await giftAccess.redeemGiftAccess(giftId, userId, userEmail);
      return { success: true, ...result };
    } catch (error) {
      logger.error(`❌ Error redeeming gift access: ${error.message}`);
      throw new Error(`Failed to redeem gift: ${error.message}`);
    }
  }
);

// Get gift access by ID
exports.getGiftAccess = onCall(
  {
    cors: true
  },
  async (request) => {
    const { giftId } = request.data;

    if (!giftId) {
      throw new Error('Gift ID is required');
    }

    try {
      const giftData = await giftAccess.getGiftAccess(giftId);
      return { success: true, giftData };
    } catch (error) {
      logger.error(`❌ Error getting gift access: ${error.message}`);
      throw new Error(`Failed to get gift: ${error.message}`);
    }
  }
);

// Get gifts sent by user
exports.getGiftsSentByUser = onCall(
  {
    cors: true
  },
  async (request) => {
    const { giftGiverEmail } = request.data;

    if (!giftGiverEmail) {
      throw new Error('Gift giver email is required');
    }

    try {
      const gifts = await giftAccess.getGiftsSentByUser(giftGiverEmail);
      return { success: true, gifts };
    } catch (error) {
      logger.error(`❌ Error getting gifts sent by user: ${error.message}`);
      throw new Error(`Failed to get gifts: ${error.message}`);
    }
  }
);

// Get gifts received by user
exports.getGiftsReceivedByUser = onCall(
  {
    cors: true
  },
  async (request) => {
    const { recipientEmail } = request.data;

    if (!recipientEmail) {
      throw new Error('Recipient email is required');
    }

    try {
      const gifts = await giftAccess.getGiftsReceivedByUser(recipientEmail);
      return { success: true, gifts };
    } catch (error) {
      logger.error(`❌ Error getting gifts received by user: ${error.message}`);
      throw new Error(`Failed to get gifts: ${error.message}`);
    }
  }
);

// Get gift analytics (admin only)
exports.getGiftAnalytics = onCall(
  {
    cors: true
  },
  async (request) => {
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
      const analytics = await giftAccess.getGiftAnalytics();
      return { success: true, analytics };
    } catch (error) {
      logger.error(`❌ Error getting gift analytics: ${error.message}`);
      throw new Error(`Failed to get analytics: ${error.message}`);
    }
  }
);

// Cleanup expired gifts (scheduled function)
exports.cleanupExpiredGifts = onSchedule({
  schedule: '0 2 * * *', // Run daily at 2 AM UTC
  timeZone: 'UTC'
}, async (event) => {
  logger.info('🧹 Running expired gifts cleanup...');
  
  try {
    const result = await giftAccess.cleanupExpiredGifts();
    logger.info(`✅ Cleaned up ${result.cleanedUp} expired gifts`);
    return result;
  } catch (error) {
    logger.error('❌ Error in expired gifts cleanup:', error);
    return { success: false, error: error.message };
  }
});