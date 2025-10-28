/**
 * Unified Notification Service
 * 
 * Handles both PWA (web) and native mobile notifications
 * Automatically detects platform and uses appropriate method
 */

import { Capacitor } from '@capacitor/core';
import pwaNotificationService from './pwaNotifications';

class UnifiedNotificationService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.platform = Capacitor.getPlatform();
    
    console.log('🔔 Unified Notification Service initialized:', {
      isNative: this.isNative,
      platform: this.platform
    });
  }

  /**
   * Send notification using appropriate method for current platform
   */
  async sendNotification(title, options = {}) {
    try {
      if (this.isNative) {
        return await this.sendMobileNotification(title, options);
      } else {
        return await this.sendPWANotification(title, options);
      }
    } catch (error) {
      console.error('❌ Failed to send unified notification:', error);
      return false;
    }
  }

  /**
   * Send PWA notification (for web browsers)
   */
  async sendPWANotification(title, options = {}) {
    try {
      const notification = pwaNotificationService.showNotification(title, {
        body: options.body,
        icon: options.icon || '/tpp-logo.png',
        tag: options.tag || 'tpp-notification',
        data: options.data || {}
      });
      
      console.log('✅ PWA notification sent:', title);
      return !!notification;
    } catch (error) {
      console.error('❌ PWA notification failed:', error);
      return false;
    }
  }

  /**
   * Send native mobile notification (using local notifications)
   * Uses EXACT same method as working Settings page
   */
  async sendMobileNotification(title, options = {}) {
    try {
      console.log('🔧 DEBUG: Starting mobile notification send...', { title, options });
      
      // Dynamic import to avoid issues on web (same as Settings page)
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      console.log('🔧 DEBUG: LocalNotifications imported successfully');
      
      // Check permissions first
      const permission = await LocalNotifications.checkPermissions();
      console.log('🔧 DEBUG: Permission check result:', permission);
      
      if (permission.display !== 'granted') {
        console.warn('📱 Local notification permission not granted, requesting...', permission);
        
        // Try to request permission
        const requestResult = await LocalNotifications.requestPermissions();
        console.log('🔧 DEBUG: Permission request result:', requestResult);
        
        if (requestResult.display !== 'granted') {
          console.error('❌ Local notification permission denied after request');
          throw new Error('Local notification permission denied');
        }
      }

      // Use EXACT same structure as working Settings page
      const notificationData = {
        title,
        body: options.body || '',
        id: Math.floor(Math.random() * 1000000), // Random ID under Java int limit
        schedule: { at: new Date(Date.now() + 1000) }, // 1 second delay (same as Settings)
        sound: 'default',
        smallIcon: 'ic_launcher', // Use app icon as notification icon
        largeIcon: 'tpp-logo', // Use app logo for large icon in Android
        attachments: [],
        actionTypeId: '',
        extra: { 
          test: true, 
          timestamp: Date.now(),
          source: 'admin-triggered',
          ...options.data
        }
      };

      console.log('🔧 DEBUG: About to schedule notification:', notificationData);

      // Schedule the notification (EXACT same call as Settings page)
      await LocalNotifications.schedule({
        notifications: [notificationData]
      });

      console.log('✅ Mobile notification scheduled successfully:', title);
      return true;
      
    } catch (error) {
      console.error('❌ Mobile notification failed with error:', error);
      console.error('❌ Error details:', error.message, error.stack);
      
      // Show error to user for debugging
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'error', 
          message: `Mobile notification failed: ${error.message}` 
        }
      }));
      
      return false;
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification(type = 'general') {
    const testNotifications = {
      general: {
        title: '🧪 Test from The Pep Planner!',
        body: `This is a test ${this.isNative ? 'mobile' : 'PWA'} notification. Everything is working correctly!`
      },
      lowStock: {
        title: '🔬 Stock Running Low!',
        body: 'You have 2 vials of BPC-157 remaining. Time to reorder?'
      },
      welcome: {
        title: '🎉 Welcome to The Pep Planner!',
        body: 'Thanks for joining! Get started by exploring your dashboard.'
      },
      reminder: {
        title: '⏰ Research Reminder',
        body: 'Time for your BPC-157 dose! You have 3 research tasks scheduled for today.'
      }
    };

    const notification = testNotifications[type] || testNotifications.general;
    
    return await this.sendNotification(notification.title, {
      body: notification.body,
      tag: `test-${type}`,
      data: { test: true, type }
    });
  }

  /**
   * Check if notifications are supported on current platform
   */
  async isSupported() {
    if (this.isNative) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const permission = await LocalNotifications.checkPermissions();
        return {
          supported: true,
          platform: 'mobile',
          permission: permission.display
        };
      } catch (error) {
        return {
          supported: false,
          platform: 'mobile',
          error: error.message
        };
      }
    } else {
      const pwaStatus = pwaNotificationService.getStatus();
      return {
        supported: pwaStatus.supported,
        platform: 'web',
        permission: pwaStatus.permission
      };
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermission() {
    if (this.isNative) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const result = await LocalNotifications.requestPermissions();
        return result.display;
      } catch (error) {
        console.error('❌ Failed to request mobile notification permission:', error);
        return 'denied';
      }
    } else {
      return await pwaNotificationService.requestPermission();
    }
  }

  /**
   * Get platform info
   */
  getPlatformInfo() {
    return {
      isNative: this.isNative,
      platform: this.platform,
      type: this.isNative ? 'mobile' : 'web'
    };
  }

  /**
   * Process notification template with variables
   */
  processTemplate(template, variables = {}) {
    let title = template.title;
    let body = template.body;

    // Replace variables
    Object.keys(variables).forEach(key => {
      const placeholder = `{${key}}`;
      title = title.replace(new RegExp(placeholder, 'g'), variables[key] || '');
      body = body.replace(new RegExp(placeholder, 'g'), variables[key] || '');
    });

    return { title, body };
  }

  /**
   * Send notification from triggered notification data
   */
  async sendTriggeredNotification(notification, userData = {}) {
    try {
      // Process variables in notification
      const processed = this.processTemplate(notification, {
        userName: userData.name || 'there',
        count: userData.count || 0,
        peptideName: userData.peptideName || 'your peptide',
        days: userData.days || 0,
        protocolName: userData.protocolName || 'your protocol',
        orderId: userData.orderId || '',
        orderStatus: userData.orderStatus || '',
        vendorName: userData.vendorName || '',
        date: userData.date || new Date().toLocaleDateString(),
        time: userData.time || new Date().toLocaleTimeString(),
        researchTask: userData.researchTask || 'your research task',
        cycleName: userData.cycleName || '',
        stockpileCount: userData.stockpileCount || 0,
        stockpileItem: userData.stockpileItem || '',
        price: userData.price || '',
        link: userData.link || '',
        ...userData.variables
      });

      return await this.sendNotification(processed.title, {
        body: processed.body,
        tag: `triggered-${notification.id}`,
        data: {
          notificationId: notification.id,
          triggeredAt: new Date().toISOString(),
          source: 'triggered'
        }
      });
    } catch (error) {
      console.error('❌ Failed to send triggered notification:', error);
      return false;
    }
  }
}

// Create singleton instance
const unifiedNotificationService = new UnifiedNotificationService();

export default unifiedNotificationService;

// Export individual methods for convenience
export const {
  sendNotification,
  sendTestNotification,
  isSupported,
  requestPermission,
  getPlatformInfo,
  sendTriggeredNotification
} = unifiedNotificationService;
