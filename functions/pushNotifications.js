/**
 * TPP Push Notification System
 * Handles push notifications via Firebase Cloud Messaging (FCM)
 */

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Send push notification via FCM
 */
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    if (!fcmToken) {
      return { success: false, error: 'No FCM token' };
    }

    const message = {
      token: fcmToken,
      notification: {
        title,
        body
      },
      data: {
        ...data,
        timestamp: Date.now().toString(),
        click_action: data.clickAction || data.path || 'FLUTTER_NOTIFICATION_CLICK',
        path: data.path || data.appUrl?.replace(/^https?:\/\/[^\/]+/, '') || '/app/dashboard'
      },
      webpush: {
        notification: {
          title,
          body,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: data.tag || 'default',
          requireInteraction: false,
          data: {
            ...data,
            url: data.clickAction || data.path || 'https://thepepplanner.com/app/dashboard',
            path: data.path || data.appUrl?.replace(/^https?:\/\/[^\/]+/, '') || '/app/dashboard'
          }
        },
        fcm_options: {
          link: data.clickAction || data.path || 'https://thepepplanner.com/app/dashboard'
        }
      },
      android: {
        notification: {
          icon: 'ic_stat_notification',
          color: '#A3B18A',
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    await admin.messaging().send(message);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send push notification to ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Check user notification preferences
 */
async function getUserNotificationSettings(userId) {
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    const notificationSettings = userData.notificationSettings || {};
    
    // For researchReminders, check legacy flag OR new AM/PM flags
    const researchRemindersEnabled = 
      notificationSettings.researchReminders === true ||
      notificationSettings.researchRemindersAM === true ||
      notificationSettings.researchRemindersPM === true;
    
    const settings = {
      push: notificationSettings.push === true || notificationSettings.pushEnabled === true, // Check both for backward compatibility
      billing: notificationSettings.billing === true,
      researchReminders: researchRemindersEnabled,
      researchRemindersAM: notificationSettings.researchRemindersAM === true,
      researchRemindersPM: notificationSettings.researchRemindersPM === true,
      groupBuys: notificationSettings.groupBuys === true,
      lowStockAlerts: notificationSettings.lowStockAlerts === true,
      orderStatusUpdates: notificationSettings.orderStatusUpdates === true,
      washoutReminders: notificationSettings.washoutReminders === true,
      cycleReminders: notificationSettings.cycleReminders === true
    };
    
    
    return settings;
  } catch (error) {
    console.error(`❌ Failed to get notification settings for ${userId}:`, error);
    return null;
  }
}

/**
 * Send push notification based on user preferences
 */
async function sendPushNotificationByType(userId, type, notificationData) {
  try {
    const settings = await getUserNotificationSettings(userId);
    if (!settings) {
      return { success: false, error: 'No settings found' };
    }

    // Check if push notifications are enabled and the specific type is enabled
    if (!settings.push || !settings[type]) {
      return { success: false, error: 'Notifications disabled' };
    }

    const { title, body, data = {} } = notificationData;
    return await sendPushNotification(userId, title, body, data);
    
  } catch (error) {
    console.error(`❌ Failed to send push notification to ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to multiple users
 */
async function sendBulkPushNotification(userIds, title, body, data = {}) {
  const results = [];
  
  for (const userId of userIds) {
    const result = await sendPushNotification(userId, title, body, data);
    results.push({ userId, ...result });
  }
  
  const successful = results.filter(r => r.success).length;
  
  return { success: true, results, successful, total: userIds.length };
}

/**
 * Send notification to all users with a specific setting enabled
 */
async function sendNotificationToUsersWithSetting(settingType, title, body, data = {}) {
  try {
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('notificationSettings.push', '==', true)
      .where(`notificationSettings.${settingType}`, '==', true)
      .get();

    const userIds = usersSnapshot.docs.map(doc => doc.id);
    
    if (userIds.length === 0) {
      return { success: true, sent: 0, total: 0 };
    }

    return await sendBulkPushNotification(userIds, title, body, data);
    
  } catch (error) {
    console.error(`❌ Failed to send notification to users with ${settingType}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Default notification templates (mirrors client-side defaults in src/utils/notificationTemplates.js)
 * Used as fallback when Firestore templates haven't been customized
 */
const DEFAULT_TEMPLATES = {
  lowStock: {
    title: "🔬 Stock Running Low!",
    body: "You're down to {count} vials of {peptideName}. Time to reorder?",
    actionUrl: "/app/stockpile"
  },
  orderArrived: {
    title: "📦 Peptide Delivery Alert!",
    body: "Hey there! Did your {peptideName} recently arrive? Don't forget to add it to your stockpile!",
    actionUrl: "/app/stockpile"
  },
  orderStatusUpdate: {
    title: "📋 Order Update!",
    body: "Your {peptideName} order status changed to: {status}. {additionalMessage}",
    actionUrl: "/app/orders"
  },
  washoutReminder: {
    title: "⏰ Washout Period Reminder",
    body: "Your {protocolName} protocol ended {daysAgo} days ago. Time to start your washout period!",
    actionUrl: "/app/protocols"
  },
  cycleReminder: {
    title: "🔄 Cycle Coming Up!",
    body: "Your {protocolName} cycle is starting in {daysUntil} days! Ready to confirm it for your schedule?",
    actionUrl: "/app/protocols"
  },
  cycleEndReminder: {
    title: "🏁 Cycle Ending Soon!",
    body: "Your {protocolName} cycle ends in {daysUntil} days. Time to plan your next phase!",
    actionUrl: "/app/protocols"
  },
  researchReminder: {
    title: "🧪 Research Reminder",
    body: "Time for your {peptideName} dose! You have {taskCount} research task(s) scheduled for today.",
    actionUrl: "/app/dashboard"
  },
  researchReminderAM: {
    title: "☀️ Morning Research Reminder",
    body: "You have {peptideCount} peptide(s) and {supplementCount} supplement(s) scheduled for this morning.",
    actionUrl: "/app/dashboard"
  },
  researchReminderPM: {
    title: "🌙 Evening Research Reminder",
    body: "You have {peptideCount} peptide(s) and {supplementCount} supplement(s) scheduled for this evening.",
    actionUrl: "/app/dashboard"
  },
  trialEnding: {
    title: "⏰ Trial Ending Soon",
    body: "Your 30-day trial ends in {daysLeft} days. Subscribe to keep your research data!",
    actionUrl: "/app/account"
  }
};

/**
 * Load a notification template from Firestore, falling back to hardcoded defaults
 * @param {string} templateType - Template ID (e.g. 'lowStock', 'orderStatusUpdate')
 * @param {Object} variables - Key-value pairs to replace in title/body (e.g. { peptideName: 'BPC-157' })
 * @returns {Object} { title, body, actionUrl } with variables replaced
 */
async function getNotificationTemplate(templateType, variables = {}) {
  let template = DEFAULT_TEMPLATES[templateType] || { title: 'Notification', body: '' };

  try {
    const templateDoc = await admin.firestore()
      .collection('notificationTemplates')
      .doc(templateType)
      .get();

    if (templateDoc.exists) {
      const firestoreTemplate = templateDoc.data();
      template = {
        title: firestoreTemplate.title || template.title,
        body: firestoreTemplate.body || template.body,
        actionUrl: firestoreTemplate.actionUrl || template.actionUrl
      };
    }
  } catch (error) {
    console.warn(`⚠️ Could not load template '${templateType}' from Firestore, using default:`, error.message);
  }

  // Replace variables in title and body
  let processedTitle = template.title || '';
  let processedBody = template.body || '';

  Object.keys(variables).forEach(key => {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    processedTitle = processedTitle.replace(placeholder, String(variables[key] ?? ''));
    processedBody = processedBody.replace(placeholder, String(variables[key] ?? ''));
  });

  return {
    title: processedTitle,
    body: processedBody,
    actionUrl: template.actionUrl || '/app/dashboard'
  };
}

module.exports = {
  sendPushNotification,
  sendPushNotificationByType,
  sendBulkPushNotification,
  sendNotificationToUsersWithSetting,
  getUserNotificationSettings,
  getNotificationTemplate,
  DEFAULT_TEMPLATES
};
