const {onDocumentUpdated, onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
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
const recoverLifetimePurchases = require('./recoverLifetimePurchases');
const shippo = require('./shippo');
// Test webhook email simulation
const testWebhookSimulation = require('./testWebhookSimulation');
const emailQueue = require('./emailQueue');
const recaptcha = require('./recaptcha');

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

// Shippo Tracking Functions
exports.getTrackingInfo = shippo.getTrackingInfo;

// Email Queue Admin Functions
exports.getEmailQueueStats = onCall(
  {
    cors: true
  },
  async (request) => {
    try {
      const stats = await emailQueue.getQueueStats();
      return { success: true, stats };
    } catch (error) {
      logger.error('Error getting email queue stats:', error);
      return { success: false, error: error.message };
    }
  }
);

exports.processEmailQueueManually = onCall(
  {
    cors: true
  },
  async (request) => {
    try {
      const result = await emailQueue.processEmailQueue();
      return { success: true, ...result };
    } catch (error) {
      logger.error('Error manually processing email queue:', error);
      return { success: false, error: error.message };
    }
  }
);

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
      
      // Send trial extension notification email
      try {
        const userEmail = userData.email;
        const userName = userData.displayName || userData.name || null;
        
        if (userEmail) {
          logger.info(`📧 Sending trial extension email to ${userEmail}`);
          await emailService.sendTrialExtensionEmail(
            userEmail,
            userName,
            days,
            newEndIso,
            note || null
          );
          logger.info(`✅ Trial extension email sent successfully to ${userEmail}`);
        } else {
          logger.warn('⚠️ User email not found, skipping trial extension email');
        }
      } catch (emailError) {
        // Log but don't fail the function if email fails
        logger.error('❌ Failed to send trial extension email:', emailError);
        logger.error('❌ Email error details:', emailError.message);
        // Trial extension still succeeded, email is just a notification
      }
      
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

// Recover Lifetime Purchases - Find and fix users who paid but don't have lifetime access
exports.recoverLifetimePurchases = recoverLifetimePurchases.recoverLifetimePurchases;

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
    
    // Get all users who have push notifications enabled
    // We'll filter for AM/PM reminders in the loop since Firestore doesn't support OR queries
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('notificationSettings.push', '==', true)
      .get();

    const promises = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Get user's timezone settings (default to America/New_York if not set)
      const userSettings = userData.settings || {};
      const userTimezone = userSettings.region?.timeZone || 'America/New_York';
      
      // Get user's custom reminder times (AM and/or PM)
      const reminderTimeAM = userData.notificationSettings?.researchReminderTimeAM || '08:00';
      const reminderTimePM = userData.notificationSettings?.researchReminderTimePM || '18:00';
      const remindersAMEnabled = userData.notificationSettings?.researchRemindersAM === true;
      const remindersPMEnabled = userData.notificationSettings?.researchRemindersPM === true;
      
      // Skip if neither AM nor PM reminders are enabled
      if (!remindersAMEnabled && !remindersPMEnabled) {
        continue;
      }
      
      // Get current time in user's timezone
      const now = new Date();
      const userTimeString = now.toLocaleString("en-US", {
        timeZone: userTimezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      const [currentHour, currentMinute] = userTimeString.split(':').map(Number);
      
      // Check if current time matches AM reminder time
      const [amHour] = reminderTimeAM.split(':').map(Number);
      const matchesAM = remindersAMEnabled && currentHour === amHour;
      
      // Check if current time matches PM reminder time
      const [pmHour] = reminderTimePM.split(':').map(Number);
      const matchesPM = remindersPMEnabled && currentHour === pmHour;
      
      // Only send reminders if it matches one of the user's reminder times (within the same hour)
      // This allows for a 1-hour window (e.g., if set to 8:30, sends between 8:00-8:59)
      if (!matchesAM && !matchesPM) {
        continue; // Skip this user, not their reminder time yet
      }
      
      const reminderType = matchesAM && matchesPM ? 'AM & PM' : (matchesAM ? 'AM' : 'PM');
      const reminderTime = matchesAM ? reminderTimeAM : reminderTimePM;
      logger.info(`⏰ Sending ${reminderType} reminder for user ${userId} at ${reminderTime} in timezone ${userTimezone}`);
      
      // Get user's protocols and check for scheduled tasks today
      const protocolsSnapshot = await admin.firestore()
        .collection('userdata')
        .doc(userId)
        .collection('protocols')
        .get();

      const todayTasks = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for comparison
      
      for (const protocolDoc of protocolsSnapshot.docs) {
        const protocol = protocolDoc.data();
        
        // Check if protocol is active today
        if (protocol.startDate && protocol.endDate) {
          const startDate = new Date(protocol.startDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(protocol.endDate);
          endDate.setHours(23, 59, 59, 999);
          
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

/**
 * Test function to manually trigger research reminders
 * Useful for testing without waiting for the scheduled time
 */
exports.testResearchReminders = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new Error('User must be authenticated');
  }

  // Check if user is admin (optional - remove if you want any user to test)
  const adminEmail = 'lebrockmaldonado@gmail.com';
  const userEmail = request.auth.token.email;
  
  if (userEmail !== adminEmail) {
    throw new Error('Unauthorized: Admin access required');
  }

  logger.info('🧪 Manually triggering research reminders test...');

  try {
    const now = new Date();
    
    // Get all users who have notifications enabled
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('notificationSettings.researchReminders', '==', true)
      .get();

    logger.info(`📋 Found ${usersSnapshot.size} users with research reminders enabled`);

    const promises = [];
    const results = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Get user's timezone settings (default to America/New_York if not set)
      const userSettings = userData.settings || {};
      const userTimezone = userSettings.region?.timeZone || 'America/New_York';
      
      logger.info(`⏰ Checking user ${userId} in timezone ${userTimezone}`);
      
      // Get user's protocols and check for scheduled tasks today
      const protocolsSnapshot = await admin.firestore()
        .collection('userdata')
        .doc(userId)
        .collection('protocols')
        .get();

      const todayTasks = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (const protocolDoc of protocolsSnapshot.docs) {
        const protocol = protocolDoc.data();
        
        // Check if protocol is active today
        if (protocol.startDate && protocol.endDate) {
          const startDate = new Date(protocol.startDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(protocol.endDate);
          endDate.setHours(23, 59, 59, 999);
          
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

      // Send reminder if there are tasks today (skip timezone check for testing)
      if (todayTasks.length > 0) {
        const notificationData = {
          title: 'Research Reminder (Test)',
          body: `You have ${todayTasks.length} research task(s) scheduled for today`,
          tasks: todayTasks,
          appUrl: 'https://thepepplanner.com/app/dashboard'
        };

        const promise = pushNotifications.sendPushNotificationByType(userId, 'researchReminders', notificationData)
          .then(result => ({ userId, success: result.success, tasks: todayTasks.length }))
          .catch(error => ({ userId, success: false, error: error.message }));
        
        promises.push(promise);
      } else {
        results.push({ userId, skipped: true, reason: 'No tasks today' });
      }
    }

    const notificationResults = await Promise.allSettled(promises);
    const successful = notificationResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
    const finalResults = [
      ...results,
      ...notificationResults.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason })
    ];
    
    logger.info(`✅ Test completed: ${successful}/${promises.length} notifications sent`);
    
    return { 
      success: true, 
      sent: successful, 
      total: promises.length,
      usersChecked: usersSnapshot.size,
      results: finalResults
    };
    
  } catch (error) {
    logger.error('❌ Error in test research reminders:', error);
    return { success: false, error: error.message };
  }
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

    // Count users with push notifications enabled by checking multiple fields
    // Some users have notificationSettings.push, others have notificationSettings.pushEnabled
    // Also check if fcmToken exists (which means they have notifications enabled)
    let usersWithPushEnabled = 0;
    
    totalUsersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      const notificationSettings = userData.notificationSettings || {};
      
      // Check various ways notifications might be enabled
      const hasPushEnabled = 
        notificationSettings.push === true ||
        notificationSettings.pushEnabled === true ||
        !!userData.fcmToken ||
        !!userData.pushToken;
      
      if (hasPushEnabled) {
        usersWithPushEnabled++;
      }
    });

    return {
      totalUsers: totalUsersSnapshot.size,
      usersWithPushEnabled: usersWithPushEnabled,
      activeUsers: activeUsersSnapshot.size,
      pushEnabledPercentage: totalUsersSnapshot.size > 0 
        ? Math.round((usersWithPushEnabled / totalUsersSnapshot.size) * 100)
        : 0
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

// Custom password reset function (for authenticated users)
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

// Password reset for unauthenticated users (forgot password flow)
// This uses your custom email templates via SendGrid
exports.requestPasswordReset = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY']
  },
  async (request) => {
    const { email } = request.data;

    if (!email) {
      throw new HttpsError('invalid-argument', 'Email is required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    logger.info(`🔐 Requesting password reset for: ${normalizedEmail}`);

    try {
      // Find user by email using Admin SDK (works even if account is disabled)
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(normalizedEmail);
      } catch (authError) {
        if (authError.code === 'auth/user-not-found') {
          // Don't reveal if user exists - return success anyway for security
          logger.info(`ℹ️ User not found for email: ${normalizedEmail} (returning success for security)`);
          return { success: true, message: 'If an account exists, a password reset email has been sent' };
        }
        throw authError;
      }

      const userId = userRecord.uid;
      logger.info(`✅ Found user for password reset: ${userId}`);

      // Generate a custom password reset token
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      
      // Store the token in Firestore with expiration (1 hour)
      const tokenRef = admin.firestore().collection('passwordResetTokens').doc(resetToken);
      await tokenRef.set({
        userId,
        userEmail: normalizedEmail,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        used: false
      });

      // Send custom password reset email via SendGrid using your email templates
      await emailService.sendCustomPasswordResetEmail(normalizedEmail, resetToken);
      
      logger.info(`✅ Custom password reset email sent to: ${normalizedEmail}`);
      return { success: true, message: 'Password reset email sent' };
      
    } catch (error) {
      logger.error('❌ Failed to send password reset email:', error);
      // Don't reveal if user exists - return success anyway for security
      return { success: true, message: 'If an account exists, a password reset email has been sent' };
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
    throw new HttpsError('unauthenticated', 'User must be authenticated to request a verification email');
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
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw new HttpsError('internal', 'Failed to send verification email. Please try again.');
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
    logger.error('❌ Verification failed: No token provided');
    throw new HttpsError('invalid-argument', 'Verification token is required');
  }

  logger.info(`🔍 Verifying email with token: ${token.substring(0, 8)}...`);

  try {
    // Get the token from Firestore
    const tokenRef = admin.firestore().collection('verificationTokens').doc(token);
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      logger.error(`❌ Verification failed: Token not found in Firestore: ${token.substring(0, 8)}...`);
      throw new HttpsError('not-found', 'Invalid verification token. Please request a new verification email.');
    }

    const tokenData = tokenDoc.data();
    
    if (!tokenData) {
      logger.error(`❌ Verification failed: Token data is null for token: ${token.substring(0, 8)}...`);
      throw new HttpsError('invalid-argument', 'Invalid verification token. Please request a new verification email.');
    }
    
    // Check if token is expired
    if (tokenData.expiresAt) {
      const expiresAt = tokenData.expiresAt.toDate ? tokenData.expiresAt.toDate() : new Date(tokenData.expiresAt);
      if (new Date() > expiresAt) {
        logger.error(`❌ Verification failed: Token expired for user: ${tokenData.userId}`);
        throw new HttpsError('deadline-exceeded', 'Verification link has expired. Please request a new verification email.');
      }
    }

    if (!tokenData.userId) {
      logger.error(`❌ Verification failed: Token missing userId: ${token.substring(0, 8)}...`);
      throw new HttpsError('invalid-argument', 'Invalid verification token. Please request a new verification email.');
    }

    // Check if email is already verified FIRST (before checking if token is used)
    // This allows us to show a friendly "Already Verified" message even if they click a used link
    let userRecord;
    let alreadyVerified = false;
    try {
      userRecord = await admin.auth().getUser(tokenData.userId);
      if (userRecord.emailVerified) {
        alreadyVerified = true;
        logger.info(`ℹ️ Email already verified for user: ${tokenData.userId}`);
      }
    } catch (authError) {
      logger.warn(`⚠️ Could not check verification status:`, authError);
    }

    // Check if token is already used
    if (tokenData.used) {
      // If email is already verified, show friendly message instead of error
      if (alreadyVerified) {
        logger.info(`✅ Email already verified and token was used - showing friendly message`);
        return { 
          success: true, 
          alreadyVerified: true,
          message: 'Your email is already verified. You\'re all set!' 
        };
      }
      // Otherwise, show error for used token
      logger.warn(`⚠️ Verification failed: Token already used for user: ${tokenData.userId}`);
      throw new HttpsError('already-exists', 'This verification link has already been used.');
    }

    // Mark token as used FIRST (before updating user) to prevent race conditions
    await tokenRef.update({ 
      used: true, 
      usedAt: admin.firestore.FieldValue.serverTimestamp() 
    });

    logger.info(`📝 Token marked as used for user: ${tokenData.userId}`);

    // If already verified, return early with a friendly message
    if (alreadyVerified) {
      logger.info(`✅ Email already verified for user: ${tokenData.userId}, returning early`);
      return { 
        success: true, 
        alreadyVerified: true,
        message: 'Your email is already verified. You\'re all set!' 
      };
    }

    // Update user's email verification status in Firebase Auth (CRITICAL: This is what the frontend checks)
    try {
      await admin.auth().updateUser(tokenData.userId, {
        emailVerified: true
      });
      logger.info(`✅ Firebase Auth emailVerified set to true for user: ${tokenData.userId}`);
    } catch (authError) {
      logger.error(`❌ Failed to update Firebase Auth for user ${tokenData.userId}:`, authError);
      // Continue to update Firestore even if Auth update fails
    }

    // Update user's email verification status in Firestore (for record keeping)
    try {
      const userRef = admin.firestore().collection('users').doc(tokenData.userId);
      await userRef.update({ 
        emailVerified: true,
        emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      logger.info(`✅ Firestore emailVerified set to true for user: ${tokenData.userId}`);
    } catch (firestoreError) {
      logger.error(`❌ Failed to update Firestore for user ${tokenData.userId}:`, firestoreError);
      // Don't fail the whole operation if Firestore update fails
    }

    logger.info(`✅ Email verified successfully for user: ${tokenData.userId}`);
    return { success: true, message: 'Email verified successfully' };
    
  } catch (error) {
    // If it's already an HttpsError, re-throw it
    if (error instanceof HttpsError) {
      throw error;
    }
    
    logger.error('❌ Failed to verify email:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Convert to HttpsError for proper client-side handling
    throw new HttpsError('internal', 'Failed to verify email. Please try again or request a new verification email.');
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

// Scheduled function to send survey emails 3 days after trial expires
exports.scheduledTrialExpiredSurvey = onSchedule({
  schedule: '0 * * * *', // Run hourly to check all user timezones
  timeZone: 'UTC',
  secrets: ['SENDGRID_API_KEY', 'LOGO_URL']
}, async (event) => {
  logger.info('📊 Running scheduled trial expired survey check (hourly check)...');
  
  try {
    const emailService = require('./emailService');
    const db = admin.firestore();
    const now = new Date();
    
    // Find all users with expired trials (status is 'trialing' but trial ended)
    const usersSnapshot = await db
      .collection('users')
      .where('subscription.status', '==', 'trialing')
      .get();
    
    let eligibleUsers = 0;
    const promises = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const subscription = userData.subscription || {};
      
      if (subscription.currentPeriodEnd) {
        const trialEndDate = new Date(subscription.currentPeriodEnd);
        
        // Check if trial expired exactly 3 days ago (within 24-hour window)
        const daysSinceExpiration = Math.floor((now - trialEndDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceExpiration === 3 && trialEndDate < now) {
          // Check if we already sent this survey (check emailHistory)
          const emailHistoryQuery = await db
            .collection('emailHistory')
            .where('recipientEmail', '==', userData.email)
            .where('type', '==', 'trialExpiredSurvey')
            .get();
          
          if (emailHistoryQuery.empty) {
            eligibleUsers++;
            promises.push(
              emailService.sendTrialExpiredSurveyEmail(
                userData.email,
                userData.displayName || userData.email?.split('@')[0] || 'there',
                null // Will use default survey link from template
              )
              .then(async (success) => {
                if (success) {
                  // Log to email history
                  await db.collection('emailHistory').add({
                    type: 'trialExpiredSurvey',
                    recipientEmail: userData.email,
                    recipientName: userData.displayName || null,
                    subject: 'Quick Survey: Help Us Improve The Pep Planner 📊',
                    sentAt: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'sent',
                    sentBy: 'scheduled',
                    trialEndDate: trialEndDate,
                    daysSinceExpiration: 3
                  });
                }
                return success;
              })
          );
          }
        }
      }
    }
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    logger.info(`✅ Trial expired survey emails sent: ${successful}/${eligibleUsers} eligible users`);
    return { success: true, sent: successful, eligible: eligibleUsers };
    
  } catch (error) {
    logger.error('❌ Error in scheduled trial expired survey:', error);
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
      
      const db = admin.firestore();
      
      if (success) {
        logger.info(`✅ Custom announcement email sent successfully to: ${userEmail}`);
        
        // Log to email history
        await db.collection('emailHistory').add({
          type: 'announcement',
          recipientEmail: userEmail,
          recipientName: userName || null,
          subject: 'Important Announcement - The Pep Planner',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent',
          sentBy: 'admin'
        });
        
        return { success: true, message: 'Custom announcement email sent successfully' };
      } else {
        logger.warn(`⚠️ Failed to send custom announcement email to: ${userEmail}`);
        
        // Log failed attempt
        await db.collection('emailHistory').add({
          type: 'announcement',
          recipientEmail: userEmail,
          recipientName: userName || null,
          subject: 'Important Announcement - The Pep Planner',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'failed',
          sentBy: 'admin'
        });
        
        return { success: false, message: 'Failed to send email' };
      }
    } catch (error) {
      logger.error(`❌ Error sending custom announcement email: ${error.message}`);
      throw new Error('Failed to send custom announcement email');
    }
  }
);

// Send trial expired survey email (callable from admin panel)
exports.sendTrialExpiredSurveyEmail = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY']
  },
  async (request) => {
    const { userEmail, userName, surveyLink } = request.data;

    if (!userEmail) {
      throw new Error('userEmail is required');
    }

    logger.info(`📊 Sending trial expired survey email to: ${userEmail}`);

    try {
      const emailService = require('./emailService');
      const success = await emailService.sendTrialExpiredSurveyEmail(userEmail, userName, surveyLink);
      
      const db = admin.firestore();
      
      if (success) {
        logger.info(`✅ Trial expired survey email sent successfully to: ${userEmail}`);
        
        // Log to email history
        await db.collection('emailHistory').add({
          type: 'trialExpiredSurvey',
          recipientEmail: userEmail,
          recipientName: userName || null,
          subject: 'Quick Survey: Help Us Improve The Pep Planner 📊',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent',
          sentBy: 'admin'
        });
        
        return { success: true, message: 'Trial expired survey email sent successfully' };
      } else {
        logger.warn(`⚠️ Failed to send trial expired survey email to: ${userEmail}`);
        
        // Log failed attempt
        await db.collection('emailHistory').add({
          type: 'trialExpiredSurvey',
          recipientEmail: userEmail,
          recipientName: userName || null,
          subject: 'Quick Survey: Help Us Improve The Pep Planner 📊',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'failed',
          sentBy: 'admin'
        });
        
        return { success: false, message: 'Failed to send email' };
      }
    } catch (error) {
      logger.error(`❌ Error sending trial expired survey email: ${error.message}`);
      throw new Error('Failed to send trial expired survey email');
    }
  }
);

// Send account deletion email
exports.sendAccountDeletionEmail = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY']
  },
  async (request) => {
    const { userEmail, userName } = request.data;

    if (!userEmail) {
      throw new Error('userEmail is required');
    }

    logger.info(`📧 Sending account deletion email to: ${userEmail}`);

    try {
      const db = admin.firestore();
      const emailService = require('./emailService');
      const success = await emailService.sendAccountDeletionEmail(userEmail, userName);
      
      if (success) {
        logger.info(`✅ Account deletion email sent successfully to: ${userEmail}`);
        
        // Log to email history
        await db.collection('emailHistory').add({
          type: 'account_deletion',
          recipientEmail: userEmail,
          recipientName: userName || null,
          subject: 'Account Deletion Confirmation - The Pep Planner',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent',
          sentBy: 'admin'
        });
        
        return { success: true, message: 'Account deletion email sent successfully' };
      } else {
        logger.warn(`⚠️ Failed to send account deletion email to: ${userEmail}`);
        
        // Log failed attempt
        await db.collection('emailHistory').add({
          type: 'account_deletion',
          recipientEmail: userEmail,
          recipientName: userName || null,
          subject: 'Account Deletion Confirmation - The Pep Planner',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'failed',
          sentBy: 'admin'
        });
        
        return { success: false, message: 'Failed to send email' };
      }
    } catch (error) {
      logger.error(`❌ Error sending account deletion email: ${error.message}`);
      throw new Error('Failed to send account deletion email');
    }
  }
);

// Check and clean up blocked account (for admin use)
// This function can see disabled accounts that client SDK cannot
exports.checkAndCleanBlockedAccount = onCall(
  {
    cors: true
  },
  async (request) => {
    try {
      const { email, adminPassword } = request.data;
      
      // Simple admin auth
      const ADMIN_PASSWORD = 'j&jm9102';
      if (adminPassword !== ADMIN_PASSWORD) {
        throw new Error('Invalid admin password');
      }
      
      if (!email) {
        throw new Error('Email is required');
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      logger.info(`🔍 Checking blocked account for: ${normalizedEmail}`);
      
      let userRecord = null;
      let userId = null;
      
      // Try to find user by email using Admin SDK (can see disabled accounts)
      try {
        userRecord = await admin.auth().getUserByEmail(normalizedEmail);
        userId = userRecord.uid;
        logger.info(`✅ Found user in Firebase Auth: ${userId}`);
        logger.info(`   Disabled: ${userRecord.disabled || false}`);
        logger.info(`   Email verified: ${userRecord.emailVerified || false}`);
        logger.info(`   Created: ${userRecord.metadata.creationTime}`);
        logger.info(`   Last sign in: ${userRecord.metadata.lastSignInTime || 'Never'}`);
      } catch (authError) {
        if (authError.code === 'auth/user-not-found') {
          logger.info('ℹ️ User not found in Firebase Auth');
        } else {
          logger.error('❌ Error checking Firebase Auth:', authError);
          throw authError;
        }
      }
      
      // Check Firestore
      let firestoreDoc = null;
      try {
        const db = admin.firestore();
        const userQuery = await db.collection('users')
          .where('email', '==', normalizedEmail)
          .limit(1)
          .get();
        
        if (!userQuery.empty) {
          firestoreDoc = userQuery.docs[0];
          logger.info(`✅ Found user in Firestore: ${firestoreDoc.id}`);
        } else {
          logger.info('ℹ️ User not found in Firestore');
        }
      } catch (firestoreError) {
        logger.error('❌ Error checking Firestore:', firestoreError);
      }
      
      const result = {
        email: normalizedEmail,
        existsInAuth: !!userRecord,
        existsInFirestore: !!firestoreDoc,
        userId: userId,
        firestoreId: firestoreDoc?.id || null,
        disabled: userRecord?.disabled || false,
        emailVerified: userRecord?.emailVerified || false,
        canDelete: false,
        message: ''
      };
      
      // Determine if we can delete
      if (userRecord && !firestoreDoc) {
        result.canDelete = true;
        result.message = 'Account exists in Auth but not Firestore - can be safely deleted';
      } else if (userRecord && firestoreDoc) {
        result.canDelete = true;
        result.message = 'Account exists in both Auth and Firestore - can be deleted (will remove both)';
      } else if (!userRecord && firestoreDoc) {
        result.canDelete = true;
        result.message = 'Account exists only in Firestore - can be deleted';
      } else {
        result.message = 'Account not found in Auth or Firestore - may be propagation delay';
      }
      
      return result;
    } catch (error) {
      logger.error('❌ Error checking blocked account:', error);
      throw new Error(`Failed to check account: ${error.message}`);
    }
  }
);

// Delete blocked account (for admin use)
exports.deleteBlockedAccount = onCall(
  {
    cors: true
  },
  async (request) => {
    try {
      const { email, adminPassword, deleteFirestore = true } = request.data;
      
      // Simple admin auth
      const ADMIN_PASSWORD = 'j&jm9102';
      if (adminPassword !== ADMIN_PASSWORD) {
        throw new Error('Invalid admin password');
      }
      
      if (!email) {
        throw new Error('Email is required');
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      logger.info(`🗑️ Deleting blocked account for: ${normalizedEmail}`);
      
      const db = admin.firestore();
      let deletedAuth = false;
      let deletedFirestore = false;
      let userId = null;
      
      // Delete from Firebase Auth
      try {
        const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
        userId = userRecord.uid;
        await admin.auth().deleteUser(userId);
        deletedAuth = true;
        logger.info(`✅ Deleted user from Firebase Auth: ${userId}`);
      } catch (authError) {
        if (authError.code === 'auth/user-not-found') {
          logger.info('ℹ️ User not found in Firebase Auth (may already be deleted)');
        } else {
          logger.error('❌ Error deleting from Firebase Auth:', authError);
          throw authError;
        }
      }
      
      // Delete from Firestore
      if (deleteFirestore) {
        try {
          // Try to find by email
          const userQuery = await db.collection('users')
            .where('email', '==', normalizedEmail)
            .limit(1)
            .get();
          
          if (!userQuery.empty) {
            const firestoreId = userQuery.docs[0].id;
            await db.collection('users').doc(firestoreId).delete();
            deletedFirestore = true;
            logger.info(`✅ Deleted user from Firestore: ${firestoreId}`);
          } else if (userId) {
            // Try by UID if we have it
            try {
              await db.collection('users').doc(userId).delete();
              deletedFirestore = true;
              logger.info(`✅ Deleted user from Firestore by UID: ${userId}`);
            } catch (e) {
              logger.info('ℹ️ User not found in Firestore (may already be deleted)');
            }
          } else {
            logger.info('ℹ️ User not found in Firestore');
          }
        } catch (firestoreError) {
          logger.error('❌ Error deleting from Firestore:', firestoreError);
          // Don't throw - Auth deletion is more important
        }
      }
      
      return {
        success: true,
        email: normalizedEmail,
        deletedFromAuth: deletedAuth,
        deletedFromFirestore: deletedFirestore,
        message: `Account deleted successfully. Auth: ${deletedAuth ? 'Yes' : 'No'}, Firestore: ${deletedFirestore ? 'Yes' : 'No'}`
      };
    } catch (error) {
      logger.error('❌ Error deleting blocked account:', error);
      throw new Error(`Failed to delete account: ${error.message}`);
    }
  }
);

// Send account deletion request notification to admin
exports.sendAccountDeletionRequestToAdmin = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY']
  },
  async (request) => {
    const { userEmail, userName, dataSummary } = request.data;

    if (!userEmail) {
      throw new Error('userEmail is required');
    }

    logger.info(`📧 Sending account deletion request notification for: ${userEmail}`);

    try {
      const emailService = require('./emailService');
      const success = await emailService.sendAccountDeletionRequestToAdmin(userEmail, userName, dataSummary);
      
      if (success) {
        logger.info(`✅ Account deletion request notification sent successfully for: ${userEmail}`);
        return { success: true, message: 'Account deletion request notification sent successfully' };
      } else {
        logger.warn(`⚠️ Failed to send account deletion request notification for: ${userEmail}`);
        return { success: false, message: 'Failed to send notification email' };
      }
    } catch (error) {
      logger.error(`❌ Error sending account deletion request notification: ${error.message}`);
      throw new Error('Failed to send account deletion request notification');
    }
  }
);

// Send in-depth request email
exports.sendInDepthRequestEmail = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY']
  },
  async (request) => {
    const { userEmail, userName, customContent } = request.data;

    if (!userEmail) {
      throw new Error('userEmail is required');
    }

    logger.info(`📧 Sending in-depth request email to: ${userEmail}`);

    try {
      const db = admin.firestore();
      const emailService = require('./emailService');
      const success = await emailService.sendInDepthRequestEmail(userEmail, userName, customContent);
      
      const emailSubject = customContent?.subject || 'In-Depth Request - The Pep Planner';
      
      if (success) {
        logger.info(`✅ In-depth request email sent successfully to: ${userEmail}`);
        
        // Log to email history
        await db.collection('emailHistory').add({
          type: 'in_depth_request',
          recipientEmail: userEmail,
          recipientName: userName || null,
          subject: emailSubject,
          customContent: customContent || null,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent',
          sentBy: 'admin'
        });
        
        return { success: true, message: 'In-depth request email sent successfully' };
      } else {
        logger.warn(`⚠️ Failed to send in-depth request email to: ${userEmail}`);
        
        // Log failed attempt
        await db.collection('emailHistory').add({
          type: 'in_depth_request',
          recipientEmail: userEmail,
          recipientName: userName || null,
          subject: emailSubject,
          customContent: customContent || null,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'failed',
          sentBy: 'admin'
        });
        
        return { success: false, message: 'Failed to send email' };
      }
    } catch (error) {
      logger.error(`❌ Error sending in-depth request email: ${error.message}`);
      throw new Error('Failed to send in-depth request email');
    }
  }
);

// Send invite email
exports.sendInviteEmail = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY']
  },
  async (request) => {
    const { userEmail, userName, inviteLink, customContent } = request.data;

    if (!userEmail) {
      throw new Error('userEmail is required');
    }

    logger.info(`📧 Sending invite email to: ${userEmail}`);

    try {
      const db = admin.firestore();
      const emailService = require('./emailService');
      const success = await emailService.sendInviteEmail(userEmail, userName, inviteLink, customContent);
      
      const emailSubject = customContent?.subject || 'You\'re Invited to The Pep Planner! 🎉';
      
      if (success) {
        logger.info(`✅ Invite email sent successfully to: ${userEmail}`);
        
        // Log to email history
        await db.collection('emailHistory').add({
          type: 'invite',
          recipientEmail: userEmail,
          recipientName: userName || null,
          subject: emailSubject,
          inviteLink: inviteLink || null,
          customContent: customContent || null,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent',
          sentBy: 'admin'
        });
        
        return { success: true, message: 'Invite email sent successfully' };
      } else {
        logger.warn(`⚠️ Failed to send invite email to: ${userEmail}`);
        
        // Log failed attempt
        await db.collection('emailHistory').add({
          type: 'invite',
          recipientEmail: userEmail,
          recipientName: userName || null,
          subject: emailSubject,
          inviteLink: inviteLink || null,
          customContent: customContent || null,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'failed',
          sentBy: 'admin'
        });
        
        return { success: false, message: 'Failed to send email' };
      }
    } catch (error) {
      logger.error(`❌ Error sending invite email: ${error.message}`);
      throw new Error('Failed to send invite email');
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
      const db = admin.firestore();
      const emailService = require('./emailService');
      const success = await emailService.sendLifetimeAccessEmail(userEmail, userName, reason);
      
      if (success) {
        logger.info(`✅ Lifetime access email sent successfully to: ${userEmail}`);
        
        // Log to email history
        await db.collection('emailHistory').add({
          type: 'lifetime_access',
          recipientEmail: userEmail,
          recipientName: userName || null,
          subject: 'Lifetime Access Granted - The Pep Planner',
          reason: reason || null,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent',
          sentBy: 'admin'
        });
        
        return { success: true, message: 'Lifetime access email sent successfully' };
      } else {
        logger.warn(`⚠️ Failed to send lifetime access email to: ${userEmail}`);
        
        // Log failed attempt
        await db.collection('emailHistory').add({
          type: 'lifetime_access',
          recipientEmail: userEmail,
          recipientName: userName || null,
          subject: 'Lifetime Access Granted - The Pep Planner',
          reason: reason || null,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'failed',
          sentBy: 'admin'
        });
        
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
    const { name, email, subject, message, recaptchaToken } = request.data;

    if (!name || !email || !subject || !message) {
      throw new Error('All fields are required');
    }

    // Verify reCAPTCHA if token is provided
    if (recaptchaToken) {
      const recaptchaResult = await recaptcha.verifyRecaptchaWithEnforcement(
        recaptchaToken,
        0.5, // Minimum score threshold
        'contact', // Expected action
        request.rawRequest?.ip || null
      );

      if (!recaptchaResult.success) {
        logger.warn(`❌ reCAPTCHA verification failed for contact form: ${recaptchaResult.error}`);
        // In production, you might want to reject the request
        // For now, we'll log and continue (graceful degradation)
      } else {
        logger.info(`✅ reCAPTCHA verified for contact form (score: ${recaptchaResult.score})`);
      }
    } else {
      logger.warn('⚠️ Contact form submitted without reCAPTCHA token');
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

// ===== SUPPORT TICKET SYSTEM =====

// Create a new support ticket
exports.createSupportTicket = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY']
  },
  async (request) => {
    const { userId, userEmail, userName, type, subject, message, metadata } = request.data;

    if (!userEmail || !type || !message) {
      throw new Error('Email, type, and message are required');
    }

    logger.info(`🎫 Creating support ticket from: ${userEmail} (type: ${type})`);

    try {
      const db = admin.firestore();
      const FieldValue = admin.firestore.FieldValue;

      // Get next ticket number atomically
      const counterRef = db.collection('_counters').doc('supportTickets');
      let ticketNumber;
      
      await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let currentCount = 0;
        
        if (counterDoc.exists) {
          currentCount = counterDoc.data().count || 0;
        }
        
        // Increment counter (starting from 4, so first ticket is Z005)
        // If counter is 0, set to 4; otherwise increment
        if (currentCount === 0) {
          currentCount = 4;
        } else {
          currentCount++;
        }
        ticketNumber = `Z${String(currentCount).padStart(3, '0')}`;
        
        // Update counter
        transaction.set(counterRef, {
          count: currentCount,
          lastUpdated: FieldValue.serverTimestamp()
        }, { merge: true });
      });

      logger.info(`🎫 Generated ticket number: ${ticketNumber}`);

      // Create ticket document
      const ticketRef = db.collection('supportTickets').doc();
      const ticketData = {
        ticketId: ticketRef.id,
        ticketNumber: ticketNumber, // Simple number like Z005
        userId: userId || null,
        userEmail: userEmail.toLowerCase().trim(),
        userName: userName || userEmail.split('@')[0],
        type: type, // 'bug', 'suggestion', 'general', 'support'
        subject: subject || `Support Request - ${type}`,
        status: 'new',
        priority: type === 'bug' ? 'high' : 'normal',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastMessageAt: FieldValue.serverTimestamp(),
        metadata: metadata || {}
      };

      await ticketRef.set(ticketData);

      // Create initial message in messages subcollection
      const messageRef = ticketRef.collection('messages').doc();
      await messageRef.set({
        messageId: messageRef.id,
        ticketId: ticketRef.id,
        senderType: 'user',
        senderEmail: userEmail.toLowerCase().trim(),
        senderName: userName || userEmail.split('@')[0],
        message: message,
        createdAt: FieldValue.serverTimestamp(),
        read: false
      });

      // Send email notification to admin
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

      const safeName = escapeHtml(userName || userEmail.split('@')[0]);
      const safeEmail = escapeHtml(userEmail);
      const safeType = escapeHtml(type);
      const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f0;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #2F3B3A; margin-bottom: 20px;">🎫 New Support Request Created</h2>
            <div style="margin-bottom: 20px;">
              <p style="color: #6B7D7A; margin: 5px 0;"><strong style="color: #2F3B3A;">Ticket #:</strong> ${ticketNumber}</p>
              <p style="color: #6B7D7A; margin: 5px 0;"><strong style="color: #2F3B3A;">From:</strong> ${safeName}</p>
              <p style="color: #6B7D7A; margin: 5px 0;"><strong style="color: #2F3B3A;">Email:</strong> ${safeEmail}</p>
              <p style="color: #6B7D7A; margin: 5px 0;"><strong style="color: #2F3B3A;">Type:</strong> ${safeType}</p>
              ${userId ? `<p style="color: #6B7D7A; margin: 5px 0;"><strong style="color: #2F3B3A;">User ID:</strong> ${userId}</p>` : ''}
            </div>
            <div style="background-color: #F5F5F0; padding: 15px; border-radius: 4px; margin-top: 20px;">
              <p style="color: #2F3B3A; margin: 0;">${safeMessage}</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #DDE6DE;">
              <p style="color: #6B7D7A; font-size: 12px; margin: 0;">This is a notification email. Please respond to this ticket in the admin panel.</p>
            </div>
          </div>
        </div>
      `;

      await emailService.sendEmail(
        'contact@thepepplanner.com',
        `🎫 New ${safeType} Request: ${ticketNumber}`,
        emailHtml
      );

      logger.info(`✅ Support ticket created: ${ticketRef.id} (${ticketNumber})`);
      return { 
        success: true, 
        ticketId: ticketRef.id,
        ticketNumber: ticketNumber,
        message: 'Ticket created successfully' 
      };
    } catch (error) {
      logger.error(`❌ Error creating support ticket: ${error.message}`);
      logger.error(`❌ Error stack: ${error.stack}`);
      throw new HttpsError(
        'internal',
        'Failed to create support ticket',
        error.message
      );
    }
  }
);

// Add message to a ticket
exports.addTicketMessage = onCall(
  {
    cors: true,
    secrets: ['SENDGRID_API_KEY']
  },
  async (request) => {
    const { ticketId, senderType, senderEmail, senderName, message } = request.data;

    if (!ticketId || !senderType || !message) {
      throw new Error('Ticket ID, sender type, and message are required');
    }

    logger.info(`💬 Adding message to ticket: ${ticketId} (from: ${senderType})`);

    try {
      const db = admin.firestore();
      const FieldValue = admin.firestore.FieldValue;

      const ticketRef = db.collection('supportTickets').doc(ticketId);
      const ticketDoc = await ticketRef.get();

      if (!ticketDoc.exists) {
        throw new Error('Ticket not found');
      }

      const ticketData = ticketDoc.data();

      // Create message in messages subcollection
      const messageRef = ticketRef.collection('messages').doc();
      await messageRef.set({
        messageId: messageRef.id,
        ticketId: ticketId,
        senderType: senderType, // 'user' or 'admin'
        senderEmail: senderEmail || ticketData.userEmail,
        senderName: senderName || ticketData.userName,
        message: message,
        createdAt: FieldValue.serverTimestamp(),
        read: false
      });

      // Update ticket
      const updateData = {
        updatedAt: FieldValue.serverTimestamp(),
        lastMessageAt: FieldValue.serverTimestamp()
      };

      // Track last admin message time for unread notifications
      if (senderType === 'admin') {
        updateData.lastAdminMessageAt = FieldValue.serverTimestamp();
      }

      // If admin is responding, mark as in-progress if it was new
      if (senderType === 'admin' && ticketData.status === 'new') {
        updateData.status = 'in-progress';
      }

      // If user sends message to a closed ticket (like a thank you), preserve userReadAt
      // so the 24-hour countdown continues (ticket stays marked as read)
      if (senderType === 'user' && (ticketData.status === 'closed' || ticketData.status === 'resolved')) {
        // Don't reset userReadAt - keep it as is so countdown continues
        logger.info(`💬 User sent message to closed ticket ${ticketId} - preserving userReadAt status`);
      }

      await ticketRef.update(updateData);

      // No email notifications for messages - all communication happens in-app
      // Users see the Support Response chip, admins see tickets in the admin panel

      logger.info(`✅ Message added to ticket: ${ticketId}`);
      return { 
        success: true, 
        messageId: messageRef.id,
        message: 'Message sent successfully' 
      };
    } catch (error) {
      logger.error(`❌ Error adding message to ticket: ${error.message}`);
      throw new Error('Failed to add message to ticket');
    }
  }
);

// Update ticket status
exports.updateTicketStatus = onCall(
  {
    cors: true
  },
  async (request) => {
    const { ticketId, status, adminPassword } = request.data;

    if (!ticketId || !status) {
      throw new Error('Ticket ID and status are required');
    }

    // Verify admin password
    const ADMIN_PASSWORD = 'j&jm9102';
    if (adminPassword !== ADMIN_PASSWORD) {
      throw new Error('Invalid admin password');
    }

    logger.info(`🔄 Updating ticket status: ${ticketId} -> ${status}`);

    try {
      const db = admin.firestore();
      const FieldValue = admin.firestore.FieldValue;

      const ticketRef = db.collection('supportTickets').doc(ticketId);
      
      // Get current ticket data to check previous status
      const ticketDoc = await ticketRef.get();
      const currentStatus = ticketDoc.exists ? ticketDoc.data().status : null;
      
      const updateData = {
        status: status,
        updatedAt: FieldValue.serverTimestamp()
      };

      // When ticket is closed/resolved, mark as unread and set closedAt timestamp
      if (status === 'closed' || status === 'resolved') {
        updateData.userReadAt = null; // Mark as unread for user
        updateData.closedAt = FieldValue.serverTimestamp();
        updateData.customerReopened = false; // Clear the reopened tag
        logger.info(`📌 Ticket ${ticketId} marked as closed - user will see unread notification`);
      }
      
      // When admin reopens ticket from closed/resolved to in-progress, clear countdown fields
      if (status === 'in-progress' && (currentStatus === 'closed' || currentStatus === 'resolved')) {
        updateData.userReadAt = null; // Reset read status
        updateData.closedAt = null; // Clear closed timestamp
        updateData.customerReopened = false; // Clear the reopened tag (admin reopened, not customer)
        logger.info(`🔄 Ticket ${ticketId} reopened from closed - countdown fields cleared`);
      }

      await ticketRef.update(updateData);

      logger.info(`✅ Ticket status updated: ${ticketId} -> ${status}`);
      return { 
        success: true, 
        message: 'Ticket status updated successfully' 
      };
    } catch (error) {
      logger.error(`❌ Error updating ticket status: ${error.message}`);
      throw new Error('Failed to update ticket status');
    }
  }
);

// Reopen a closed ticket (user action)
exports.reopenTicket = onCall(
  {
    cors: true
  },
  async (request) => {
    const { ticketId } = request.data;

    if (!ticketId) {
      throw new Error('Ticket ID is required');
    }

    // Ensure user is authenticated
    if (!request.auth) {
      throw new Error('Authentication required');
    }

    logger.info(`🔓 User reopening ticket: ${ticketId}`);

    try {
      const db = admin.firestore();
      const FieldValue = admin.firestore.FieldValue;

      const ticketRef = db.collection('supportTickets').doc(ticketId);
      const ticketDoc = await ticketRef.get();

      if (!ticketDoc.exists) {
        throw new Error('Ticket not found');
      }

      const ticketData = ticketDoc.data();

      // Verify the user owns this ticket
      if (ticketData.userEmail !== request.auth.token.email && 
          ticketData.userId !== request.auth.uid) {
        throw new Error('Not authorized to reopen this ticket');
      }

      // Only allow reopening closed/resolved tickets
      if (ticketData.status !== 'closed' && ticketData.status !== 'resolved') {
        throw new Error('Only closed tickets can be reopened');
      }

      // Reopen the ticket by setting status to 'in-progress' and marking as customer reopened
      await ticketRef.update({
        status: 'in-progress',
        closedAt: null,
        userReadAt: null,
        adminReadAt: null, // Mark as unread for admin
        updatedAt: FieldValue.serverTimestamp(),
        reopenedAt: FieldValue.serverTimestamp(),
        reopenedBy: request.auth.token.email || request.auth.uid,
        customerReopened: true // Tag for admin to see
      });

      logger.info(`✅ Ticket reopened successfully: ${ticketId}`);
      return { 
        success: true, 
        message: 'Ticket reopened successfully' 
      };
    } catch (error) {
      logger.error(`❌ Error reopening ticket: ${error.message}`);
      throw new Error(error.message || 'Failed to reopen ticket');
    }
  }
);

// Mark ticket as read by user
exports.markTicketAsRead = onCall(
  {
    cors: true
  },
  async (request) => {
    const { ticketId } = request.data;

    if (!ticketId) {
      throw new Error('Ticket ID is required');
    }

    logger.info(`👁️ Marking ticket as read: ${ticketId}`);

    try {
      const db = admin.firestore();
      const FieldValue = admin.firestore.FieldValue;

      const ticketRef = db.collection('supportTickets').doc(ticketId);
      await ticketRef.update({
        userReadAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      logger.info(`✅ Ticket marked as read: ${ticketId}`);
      return { 
        success: true, 
        message: 'Ticket marked as read successfully' 
      };
    } catch (error) {
      logger.error(`❌ Error marking ticket as read: ${error.message}`);
      throw new Error('Failed to mark ticket as read');
    }
  }
);

// ===== ADMIN MESSAGES FUNCTIONS =====

// Create admin message (one-way message from admin to user)
exports.createAdminMessage = onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      const { userEmail, message, adminPassword } = request.data || {};

      if (!userEmail || !message || !adminPassword) {
        logger.error('❌ Missing required fields:', { userEmail: !!userEmail, message: !!message, adminPassword: !!adminPassword });
        throw new HttpsError('invalid-argument', 'User email, message, and admin password are required');
      }

      // Verify admin password
      const ADMIN_PASSWORD = 'j&jm9102';
      if (adminPassword !== ADMIN_PASSWORD) {
        logger.error('❌ Invalid admin password');
        throw new HttpsError('permission-denied', 'Invalid admin password');
      }

      logger.info(`📨 Creating admin message for: ${userEmail}`);

      const db = admin.firestore();
      const FieldValue = admin.firestore.FieldValue;

      // Create admin message document
      const messageRef = db.collection('adminMessages').doc();
      const messageData = {
        messageId: messageRef.id,
        userEmail: userEmail.toLowerCase().trim(),
        message: message.trim(),
        createdAt: FieldValue.serverTimestamp(),
        userReadAt: null, // Initially unread
        createdBy: 'admin'
      };

      await messageRef.set(messageData);

      logger.info(`✅ Admin message created: ${messageRef.id}`);
      return { 
        success: true, 
        messageId: messageRef.id,
        message: 'Admin message created successfully' 
      };
    } catch (error) {
      logger.error(`❌ Error creating admin message: ${error.message}`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', `Failed to create admin message: ${error.message}`);
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

// ===== SECURITY MANAGEMENT FUNCTIONS =====

// Get security data (unverified and suspicious accounts)
exports.getSecurityData = onCall(
  {
    cors: true
  },
  async (request) => {
    // Admin check
    const adminEmails = ['lebrockmaldonado@gmail.com', 'contact@thepepplanner.com', 'thepepplanner@gmail.com'];
    const userEmail = request.auth?.token?.email;
    
    if (!userEmail || !adminEmails.includes(userEmail.toLowerCase())) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    try {
      const db = admin.firestore();
      const auth = admin.auth();
      
      // Get all users from Firestore
      const usersSnapshot = await db.collection('users').get();
      const allUsers = [];
      
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        try {
          const authUser = await auth.getUser(doc.id);
          allUsers.push({
            uid: doc.id,
            email: authUser.email,
            emailVerified: authUser.emailVerified,
            disabled: authUser.disabled,
            createdAt: userData.createdAt,
            lastActive: userData.lastActive,
            displayName: userData.displayName || authUser.displayName,
            subscription: userData.subscription
          });
        } catch (error) {
          // User might not exist in Auth
          allUsers.push({
            uid: doc.id,
            email: userData.email,
            emailVerified: false,
            disabled: false,
            createdAt: userData.createdAt,
            lastActive: userData.lastActive,
            displayName: userData.displayName,
            subscription: userData.subscription
          });
        }
      }

      // Filter unverified accounts
      const unverifiedAccounts = allUsers.filter(user => !user.emailVerified && !user.disabled);
      
      // Filter suspicious accounts - ONLY truly suspicious patterns
      const suspiciousAccounts = allUsers.filter(user => {
        if (user.disabled) return false;
        if (user.emailVerified) return false; // Skip verified users
        
        // Check for disposable email (HIGH PRIORITY - definitely suspicious)
        const disposableDomains = [
          'passmail.net', '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 
          'tempmail.com', 'throwaway.email', 'temp-mail.org', 'getnada.com', 
          'mohmal.com', 'yopmail.com', 'maildrop.cc', 'sharklasers.com',
          'grr.la', 'guerrillamailblock.com', 'pokemail.net', 'spam4.me',
          'bccto.me', 'chitthi.in', 'dispostable.com', 'meltmail.com',
          'mintemail.com', 'mytemp.email', 'tempail.com', 'tempr.email',
          'tmpmail.org', 'trashmail.com', 'trashmailer.com', 'emailondeck.com',
          'fakeinbox.com', 'getairmail.com', 'inboxkitten.com', 'mailcatch.com',
          'mailsac.com', 'mytrashmail.com', 'throwawaymail.com', 'tmpmail.net',
          'mailnesia.com', 'melt.li', 'nada.email', 'spamgourmet.com',
          'tempmailo.com', 'zoho.com'
        ];
        const domain = user.email?.split('@')[1]?.toLowerCase();
        if (domain && disposableDomains.includes(domain)) return true;
        
        // Check for bot-like email patterns (contains app name + random numbers)
        const emailLower = user.email?.toLowerCase() || '';
        if (emailLower.includes('thepepplanner') || emailLower.includes('pepplanner')) {
          // If email contains app name with random numbers, it's suspicious
          if (/\d{3,}/.test(emailLower)) return true;
        }
        
        // Only flag as suspicious if:
        // 1. Never logged in AND created more than 14 days ago
        // 2. OR inactive for more than 60 days (not just 7)
        const now = new Date();
        let daysSinceCreation = 0;
        let daysSinceActive = 0;
        
        if (user.createdAt) {
          const created = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
          daysSinceCreation = (now - created) / (1000 * 60 * 60 * 24);
        }
        
        if (user.lastActive) {
          const lastActive = user.lastActive.toDate ? user.lastActive.toDate() : new Date(user.lastActive);
          daysSinceActive = (now - lastActive) / (1000 * 60 * 60 * 24);
        } else {
          // Never active - use creation date
          daysSinceActive = daysSinceCreation;
        }
        
        // Suspicious if: never used AND old (14+ days) OR inactive for 60+ days
        if (!user.lastActive && daysSinceCreation > 14) return true;
        if (daysSinceActive > 60) return true;
        
        return false;
      });

      // Get blocked accounts
      const blockedAccounts = allUsers.filter(user => user.disabled);

      logger.info(`📊 Security data: ${unverifiedAccounts.length} unverified, ${suspiciousAccounts.length} suspicious, ${blockedAccounts.length} blocked`);

      return {
        success: true,
        unverifiedAccounts,
        suspiciousAccounts,
        blockedAccounts
      };
    } catch (error) {
      logger.error(`❌ Error getting security data: ${error.message}`);
      throw new HttpsError('internal', `Failed to get security data: ${error.message}`);
    }
  }
);

// Block a user (disable their account)
exports.blockUser = onCall(
  {
    cors: true
  },
  async (request) => {
    const adminEmails = ['lebrockmaldonado@gmail.com', 'contact@thepepplanner.com', 'thepepplanner@gmail.com'];
    const userEmail = request.auth?.token?.email;
    
    if (!userEmail || !adminEmails.includes(userEmail.toLowerCase())) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, email } = request.data;
    
    if (!userId || !email) {
      throw new HttpsError('invalid-argument', 'User ID and email are required');
    }

    try {
      const auth = admin.auth();
      
      // Disable the user in Firebase Auth
      await auth.updateUser(userId, { disabled: true });
      
      logger.info(`🚫 User blocked: ${email} (${userId})`);
      
      return {
        success: true,
        message: 'User blocked successfully'
      };
    } catch (error) {
      logger.error(`❌ Error blocking user: ${error.message}`);
      throw new HttpsError('internal', `Failed to block user: ${error.message}`);
    }
  }
);

// Terminate a user (permanently delete account)
exports.terminateUser = onCall(
  {
    cors: true
  },
  async (request) => {
    const adminEmails = ['lebrockmaldonado@gmail.com', 'contact@thepepplanner.com', 'thepepplanner@gmail.com'];
    const userEmail = request.auth?.token?.email;
    
    if (!userEmail || !adminEmails.includes(userEmail.toLowerCase())) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, email } = request.data;
    
    if (!userId || !email) {
      throw new HttpsError('invalid-argument', 'User ID and email are required');
    }

    try {
      const auth = admin.auth();
      const db = admin.firestore();
      
      // Delete from Firebase Auth
      await auth.deleteUser(userId);
      
      // Delete from Firestore
      await db.collection('users').doc(userId).delete();
      await db.collection('userdata').doc(userId).delete();
      
      logger.info(`🗑️ User terminated: ${email} (${userId})`);
      
      return {
        success: true,
        message: 'User account terminated successfully'
      };
    } catch (error) {
      logger.error(`❌ Error terminating user: ${error.message}`);
      throw new HttpsError('internal', `Failed to terminate user: ${error.message}`);
    }
  }
);

// Get auto-cleanup settings
exports.getAutoCleanupSettings = onCall(
  {
    cors: true
  },
  async (request) => {
    const adminEmails = ['lebrockmaldonado@gmail.com', 'contact@thepepplanner.com', 'thepepplanner@gmail.com'];
    const userEmail = request.auth?.token?.email;
    
    if (!userEmail || !adminEmails.includes(userEmail.toLowerCase())) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    try {
      const db = admin.firestore();
      const settingsDoc = await db.collection('config').doc('autoCleanup').get();
      
      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        return {
          success: true,
          enabled: data.enabled || false,
          days: data.days || 30
        };
      }
      
      return {
        success: true,
        enabled: false,
        days: 30
      };
    } catch (error) {
      logger.error(`❌ Error getting auto-cleanup settings: ${error.message}`);
      throw new HttpsError('internal', `Failed to get settings: ${error.message}`);
    }
  }
);

// Update auto-cleanup settings
exports.updateAutoCleanupSettings = onCall(
  {
    cors: true
  },
  async (request) => {
    const adminEmails = ['lebrockmaldonado@gmail.com', 'contact@thepepplanner.com', 'thepepplanner@gmail.com'];
    const userEmail = request.auth?.token?.email;
    
    if (!userEmail || !adminEmails.includes(userEmail.toLowerCase())) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { enabled, days } = request.data;
    
    try {
      const db = admin.firestore();
      await db.collection('config').doc('autoCleanup').set({
        enabled: enabled || false,
        days: days || 30,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      logger.info(`⚙️ Auto-cleanup settings updated: enabled=${enabled}, days=${days}`);
      
      return {
        success: true,
        message: 'Settings updated successfully'
      };
    } catch (error) {
      logger.error(`❌ Error updating auto-cleanup settings: ${error.message}`);
      throw new HttpsError('internal', `Failed to update settings: ${error.message}`);
    }
  }
);

// Run auto-cleanup manually
exports.runAutoCleanup = onCall(
  {
    cors: true
  },
  async (request) => {
    const adminEmails = ['lebrockmaldonado@gmail.com', 'contact@thepepplanner.com', 'thepepplanner@gmail.com'];
    const userEmail = request.auth?.token?.email;
    
    if (!userEmail || !adminEmails.includes(userEmail.toLowerCase())) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { days = 30 } = request.data;
    
    try {
      const db = admin.firestore();
      const auth = admin.auth();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // Get all users
      const usersSnapshot = await db.collection('users').get();
      let deletedCount = 0;
      
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        
        // Skip if has lifetime access
        if (userData.subscription?.hasLifetimeAccess) continue;
        
        // Skip if email is verified
        try {
          const authUser = await auth.getUser(doc.id);
          if (authUser.emailVerified) continue;
        } catch (error) {
          // User might not exist in Auth
        }
        
        // Check last active date
        let shouldDelete = false;
        if (userData.lastActive) {
          const lastActive = userData.lastActive.toDate ? userData.lastActive.toDate() : new Date(userData.lastActive);
          if (lastActive < cutoffDate) {
            shouldDelete = true;
          }
        } else if (userData.createdAt) {
          // If never active, use creation date
          const created = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
          if (created < cutoffDate) {
            shouldDelete = true;
          }
        }
        
        if (shouldDelete) {
          try {
            // Delete from Auth (if exists)
            try {
              await auth.deleteUser(doc.id);
            } catch (error) {
              // User might not exist in Auth, that's okay
            }
            
            // Delete from Firestore
            await db.collection('users').doc(doc.id).delete();
            await db.collection('userdata').doc(doc.id).delete();
            
            deletedCount++;
            logger.info(`🧹 Deleted inactive unverified account: ${userData.email || doc.id}`);
          } catch (error) {
            logger.error(`❌ Error deleting user ${doc.id}: ${error.message}`);
          }
        }
      }
      
      logger.info(`✅ Auto-cleanup complete: ${deletedCount} accounts deleted`);
      
      return {
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} inactive unverified accounts`
      };
    } catch (error) {
      logger.error(`❌ Error running auto-cleanup: ${error.message}`);
      throw new HttpsError('internal', `Failed to run cleanup: ${error.message}`);
    }
  }
);

// Cleanup expired gifts (scheduled function)
// Process email queue every hour
exports.processEmailQueue = onSchedule({
  schedule: '0 * * * *', // Every hour
  timeZone: 'UTC',
}, async (event) => {
  logger.info('📧 Processing email queue...');
  try {
    const result = await emailQueue.processEmailQueue();
    logger.info(`✅ Email queue processed: ${result.processed} sent, ${result.failed} failed, ${result.remaining} quota remaining`);
    return result;
  } catch (error) {
    logger.error('❌ Error processing email queue:', error);
    throw error;
  }
});

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