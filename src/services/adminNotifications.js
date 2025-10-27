/**
 * Admin Notification Service
 * 
 * Handles sending notifications from the admin panel via Firebase Cloud Functions
 * This enables cross-device notifications: Desktop Admin → Firebase → Mobile Device
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../config/firebase.js';

const functions = getFunctions();

class AdminNotificationService {
  constructor() {
    this.sendAdminNotification = httpsCallable(functions, 'sendAdminNotification');
    this.getAdminNotificationStats = httpsCallable(functions, 'getAdminNotificationStats');
  }

  /**
   * Send notification to yourself (admin) for testing
   */
  async sendTestToAdmin(notification) {
    try {
      console.log('📱 Sending test notification to admin via Firebase...', notification);

      const result = await this.sendAdminNotification({
        targetType: 'test_admin',
        notification: {
          title: notification.title,
          body: notification.body,
          data: {
            source: 'admin-test',
            testType: notification.testType || 'general'
          }
        }
      });

      console.log('✅ Admin test notification sent successfully:', result.data);
      return result.data;

    } catch (error) {
      console.error('❌ Failed to send admin test notification:', error);
      throw new Error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Send notification to specific user by email
   */
  async sendToUser(targetEmail, notification) {
    try {
      console.log('📱 Sending notification to user:', targetEmail, notification);

      const result = await this.sendAdminNotification({
        targetType: 'specific',
        targetEmail,
        notification: {
          title: notification.title,
          body: notification.body,
          data: {
            source: 'admin-targeted',
            ...notification.data
          }
        }
      });

      console.log('✅ User notification sent successfully:', result.data);
      return result.data;

    } catch (error) {
      console.error('❌ Failed to send user notification:', error);
      throw new Error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Send notification to all users
   */
  async sendToAllUsers(notification) {
    try {
      console.log('📱 Sending notification to all users:', notification);

      const result = await this.sendAdminNotification({
        targetType: 'all',
        notification: {
          title: notification.title,
          body: notification.body,
          data: {
            source: 'admin-broadcast',
            ...notification.data
          }
        }
      });

      console.log('✅ Broadcast notification sent successfully:', result.data);
      return result.data;

    } catch (error) {
      console.error('❌ Failed to send broadcast notification:', error);
      throw new Error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Send triggered notification (from triggered notification system)
   */
  async sendTriggeredNotification(notification, userData = {}) {
    try {
      console.log('📱 Sending triggered notification via Firebase:', notification);

      // Process variables in notification
      const processedTitle = this.processVariables(notification.title, userData);
      const processedBody = this.processVariables(notification.body, userData);

      // Send to admin for testing (in production, this would target actual users)
      const result = await this.sendAdminNotification({
        targetType: 'test_admin',
        notification: {
          title: processedTitle,
          body: processedBody,
          data: {
            source: 'triggered',
            notificationId: notification.id,
            triggeredAt: new Date().toISOString(),
            ...notification.data
          }
        }
      });

      console.log('✅ Triggered notification sent successfully:', result.data);
      return result.data.success;

    } catch (error) {
      console.error('❌ Failed to send triggered notification:', error);
      return false;
    }
  }

  /**
   * Process variables in notification text
   */
  processVariables(text, userData = {}) {
    let processed = text;
    
    // Default variables
    const variables = {
      userName: userData.name || userData.userName || 'there',
      count: userData.count || 0,
      peptideName: userData.peptideName || 'your peptide',
      days: userData.days || 0,
      protocolName: userData.protocolName || 'your protocol',
      ...userData.variables
    };

    // Replace variables
    Object.keys(variables).forEach(key => {
      const placeholder = `{${key}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), variables[key]);
    });

    return processed;
  }

  /**
   * Get notification statistics
   */
  async getStats() {
    try {
      const result = await this.getAdminNotificationStats();
      return result.data;
    } catch (error) {
      console.error('❌ Failed to get notification stats:', error);
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }

  /**
   * Check if user is authenticated admin
   */
  isAuthenticated() {
    const user = auth.currentUser;
    return user && user.email === 'lebrockmaldonado@gmail.com';
  }

  /**
   * Send test notification with sample data for different types
   */
  async sendTestNotification(type = 'general') {
    const testNotifications = {
      general: {
        title: '🧪 Admin Test Notification',
        body: 'This is a test notification from the admin panel. Cross-device notifications are working!',
        testType: 'general'
      },
      lowStock: {
        title: '🔬 Stock Running Low!',
        body: 'You have 2 vials of BPC-157 remaining. Time to reorder?',
        testType: 'lowStock'
      },
      welcome: {
        title: '🎉 Welcome to The Pep Planner!',
        body: 'Thanks for joining! Get started by exploring your dashboard.',
        testType: 'welcome'
      },
      reminder: {
        title: '⏰ Research Reminder',
        body: 'Time for your BPC-157 dose! You have 3 research tasks scheduled for today.',
        testType: 'reminder'
      },
      triggered: {
        title: '🔄 Triggered Notification Test',
        body: 'This triggered notification was sent from the admin panel to your mobile device!',
        testType: 'triggered'
      }
    };

    const notification = testNotifications[type] || testNotifications.general;
    return await this.sendTestToAdmin(notification);
  }
}

// Create singleton instance
const adminNotificationService = new AdminNotificationService();

export default adminNotificationService;

// Export individual methods for convenience
export const {
  sendTestToAdmin,
  sendToUser,
  sendToAllUsers,
  sendTriggeredNotification,
  sendTestNotification,
  getStats,
  isAuthenticated
} = adminNotificationService;
