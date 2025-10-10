const {onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {onCall} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {logger} = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('./stripe');
const pushNotifications = require('./pushNotifications');

admin.initializeApp();

// Import and export the Stripe functions individually
exports.createCheckoutSession = stripe.createCheckoutSession;
exports.createPortalSession = stripe.createPortalSession;
exports.cancelSubscription = stripe.cancelSubscription;
exports.updatePaymentMethod = stripe.updatePaymentMethod;
exports.generateInvoiceReceipt = stripe.generateInvoiceReceipt;
exports.getStripeSubscriptions = stripe.getStripeSubscriptions;

// Scheduled Functions for Notifications
exports.scheduledResearchReminders = onSchedule('0 8 * * *', {
  timeZone: 'America/New_York',
}, async (event) => {
  logger.info('🔬 Running scheduled research reminders...');
  
  try {
    const today = new Date();
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('notificationSettings.researchReminders', '==', true)
      .get();

    const promises = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
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