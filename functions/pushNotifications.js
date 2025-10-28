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
      console.log(`📱 No FCM token for user ${userId} - skipping push notification`);
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
        click_action: data.clickAction || 'FLUTTER_NOTIFICATION_CLICK'
      },
      android: {
        notification: {
          icon: 'ic_notification',
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
    console.log(`✅ Push notification sent to ${userId}: ${title}`);
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
      console.log(`📱 User ${userId} not found in Firestore`);
      return null;
    }

    const userData = userDoc.data();
    const settings = {
      push: userData.notificationSettings?.push === true,
      billing: userData.notificationSettings?.billing === true,
      researchReminders: userData.notificationSettings?.researchReminders === true,
      groupBuys: userData.notificationSettings?.groupBuys === true,
      lowStockAlerts: userData.notificationSettings?.lowStockAlerts === true,
      orderStatusUpdates: userData.notificationSettings?.orderStatusUpdates === true,
      washoutReminders: userData.notificationSettings?.washoutReminders === true,
      cycleReminders: userData.notificationSettings?.cycleReminders === true
    };
    
    console.log(`📱 User ${userId} notification settings:`, settings);
    console.log(`📱 Raw notificationSettings:`, userData.notificationSettings);
    
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
      console.log(`📱 No settings found for user ${userId}`);
      return { success: false, error: 'No settings found' };
    }

    // Check if push notifications are enabled and the specific type is enabled
    if (!settings.push || !settings[type]) {
      console.log(`📱 Push notifications disabled for user ${userId}, type: ${type}`);
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
  console.log(`📱 Bulk notification sent: ${successful}/${userIds.length} successful`);
  
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
      console.log(`📱 No users found with ${settingType} notifications enabled`);
      return { success: true, sent: 0, total: 0 };
    }

    return await sendBulkPushNotification(userIds, title, body, data);
    
  } catch (error) {
    console.error(`❌ Failed to send notification to users with ${settingType}:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
  sendPushNotificationByType,
  sendBulkPushNotification,
  sendNotificationToUsersWithSetting,
  getUserNotificationSettings
};
