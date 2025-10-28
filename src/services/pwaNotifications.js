/**
 * PWA Notification Service
 * 
 * Handles all PWA notification functionality including:
 * - Permission requests
 * - Push subscriptions
 * - Notification display
 * - Integration with existing notification system
 */

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { db } from '../config/firebase.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

class PWANotificationService {
  constructor() {
    this.permissionStatus = 'default';
    this.isSupported = false;
    this.serviceWorkerRegistration = null;
    this.pushSubscription = null;
    this.messaging = null;
    
    this.init();
  }

  async init() {
    // Check if notifications are supported
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    
    if (!this.isSupported) {
      console.warn('PWA notifications not supported in this browser');
      return;
    }

    // Get current permission status
    this.permissionStatus = Notification.permission;
    
    // Get service worker registration
    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.getRegistration();
    } catch (error) {
      console.error('Failed to get service worker registration:', error);
    }

    // Initialize Firebase messaging if available
    try {
      this.messaging = getMessaging();
      this.setupFirebaseMessaging();
    } catch (error) {

    }

  }

  setupFirebaseMessaging() {
    if (!this.messaging) return;

    // Handle foreground messages
    onMessage(this.messaging, (payload) => {

      // Show notification even when app is in foreground
      this.showNotification(
        payload.notification?.title || 'New Update',
        {
          body: payload.notification?.body || 'You have a new notification',
          icon: payload.notification?.icon || '/tpp_logo.png',
          data: payload.data
        }
      );
    });
  }

  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Notifications not supported in this browser');
    }

    if (this.permissionStatus === 'granted') {
      return 'granted';
    }

    if (this.permissionStatus === 'denied') {
      throw new Error('Notification permission has been denied. Please enable it in browser settings.');
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      this.permissionStatus = permission;
      
      if (permission === 'granted') {
        // Try to set up push notifications if Firebase is available
        await this.setupPushSubscription();
        
        // Show a welcome notification
        this.showNotification('Notifications Enabled!', {
          body: 'You\'ll now receive important updates from The Pep Planner',
          icon: '/tpp_logo.png',
          tag: 'permission-granted'
        });
      }
      
      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      throw error;
    }
  }

  /**
   * Set up push subscription for Firebase messaging
   */
  async setupPushSubscription() {
    if (!this.messaging || !this.serviceWorkerRegistration) {
      return null;
    }

    try {
      // Get FCM token
      const token = await getToken(this.messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || 'your-vapid-key-here'
      });

      if (token) {

        this.pushSubscription = { token };
        
        // Store token in user's document for server-side notifications
        await this.savePushToken(token);
        
        return token;
      } else {

        return null;
      }
    } catch (error) {
      console.error('Failed to set up push subscription:', error);
      return null;
    }
  }

  /**
   * Save push token to user's document in Firebase
   */
  async savePushToken(token) {
    try {
      // Get current user email from localStorage (since we're using email as user ID)
      const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
      if (!user?.email) {
        console.warn('No user email found, cannot save push token');
        return;
      }

      const userRef = doc(db, 'users', user.email.toLowerCase());
      await setDoc(userRef, {
        fcmToken: token, // Change from pushToken to fcmToken for consistency
        pushToken: token, // Keep for backward compatibility
        notificationSettings: {
          pushEnabled: true,
          lastUpdated: serverTimestamp()
        }
      }, { merge: true });

    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  /**
   * Show a PWA notification
   */
  async showNotification(title, options = {}) {
    if (!this.isSupported || this.permissionStatus !== 'granted') {
      console.warn('Cannot show notification: not supported or permission not granted');
      return null;
    }

    // Check user notification preferences
    const userSettings = await this.getUserNotificationSettings();
    if (!userSettings.push) {
      console.log('📱 PWA notification blocked: user has disabled push notifications');
      return null;
    }

    // Check specific notification type if provided
    if (options.notificationType && !userSettings[options.notificationType]) {
      console.log(`📱 PWA notification blocked: user has disabled ${options.notificationType} notifications`);
      return null;
    }

    const defaultOptions = {
      icon: '/tpp_logo.png',
      badge: '/tpp_logo.png',
      tag: 'tpp-notification',
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    };

    const notification = new Notification(title, { ...defaultOptions, ...options });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Navigate to specific page if data is provided
      if (options.data?.path) {
        window.location.href = options.data.path;
      }
    };

    // Auto-close after 5 seconds if not interacted with
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }

  /**
   * Get user notification settings from localStorage
   */
  async getUserNotificationSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
      return {
        push: settings.notifications?.push === true,
        researchReminders: settings.notifications?.researchReminders === true,
        groupBuys: settings.notifications?.groupBuys === true,
        lowStockAlerts: settings.notifications?.lowStockAlerts === true,
        orderStatusUpdates: settings.notifications?.orderStatusUpdates === true,
        washoutReminders: settings.notifications?.washoutReminders === true,
        cycleReminders: settings.notifications?.cycleReminders === true
      };
    } catch (error) {
      console.error('Failed to get user notification settings:', error);
      return {
        push: false,
        researchReminders: false,
        groupBuys: false,
        lowStockAlerts: false,
        orderStatusUpdates: false,
        washoutReminders: false,
        cycleReminders: false
      };
    }
  }

  /**
   * Enable PWA notifications
   */
  async enable() {
    try {
      const permission = await this.requestPermission();
      
      if (permission === 'granted') {
        // Update user settings
        await this.updateNotificationSettings(true);
        
        // Dispatch custom event for UI updates
        window.dispatchEvent(new CustomEvent('pwa-notifications-enabled', {
          detail: { permission, pushToken: this.pushSubscription?.token }
        }));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to enable PWA notifications:', error);
      throw error;
    }
  }

  /**
   * Disable PWA notifications
   */
  async disable() {
    try {
      // Update user settings
      await this.updateNotificationSettings(false);
      
      // Clear push token
      if (this.pushSubscription?.token) {
        await this.removePushToken(this.pushSubscription.token);
      }
      
      // Dispatch custom event for UI updates
      window.dispatchEvent(new CustomEvent('pwa-notifications-disabled'));
      
      return true;
    } catch (error) {
      console.error('Failed to disable PWA notifications:', error);
      throw error;
    }
  }

  /**
   * Update notification settings in user document
   */
  async updateNotificationSettings(enabled) {
    try {
      const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
      if (!user?.email) {

        return;
      }

      const userRef = doc(db, 'users', user.email.toLowerCase());
      await setDoc(userRef, {
        notificationSettings: {
          pushEnabled: enabled,
          lastUpdated: serverTimestamp()
        }
      }, { merge: true });

    } catch (error) {
      console.warn('⚠️ Failed to update notification settings in Firebase, using localStorage fallback:', error.message);
      
      // Fallback to localStorage for offline/local development
      try {
        const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
        settings.notifications = settings.notifications || {};
        settings.notifications.push = enabled;
        localStorage.setItem('tpprover_settings', JSON.stringify(settings));

      } catch (fallbackError) {
        console.error('❌ Failed to save to localStorage fallback:', fallbackError);
      }
    }
  }

  /**
   * Remove push token from user document
   */
  async removePushToken(token) {
    try {
      const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
      if (!user?.email) return;

      const userRef = doc(db, 'users', user.email.toLowerCase());
      await setDoc(userRef, {
        pushToken: null,
        notificationSettings: {
          pushEnabled: false,
          lastUpdated: serverTimestamp()
        }
      }, { merge: true });

    } catch (error) {
      console.error('Failed to remove push token:', error);
    }
  }

  /**
   * Get current notification status
   */
  getStatus() {
    return {
      supported: this.isSupported,
      permission: this.permissionStatus,
      enabled: this.permissionStatus === 'granted',
      serviceWorker: !!this.serviceWorkerRegistration,
      firebase: !!this.messaging,
      pushToken: this.pushSubscription?.token
    };
  }

  /**
   * Test PWA notifications
   */
  async test() {
    if (!this.isSupported) {
      throw new Error('PWA notifications not supported');
    }

    if (this.permissionStatus !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    return this.showNotification('PWA Test Notification', {
      body: 'This is a test notification from The Pep Planner PWA',
      tag: 'pwa-test'
    });
  }

  /**
   * Send a notification from the existing notification system as a PWA notification
   * This integrates with the existing Firebase notification system
   */
  async sendPWANotification(notification) {
    if (!this.isSupported || this.permissionStatus !== 'granted') {
      return false;
    }

    try {
      // Show as PWA notification
      this.showNotification(notification.title, {
        body: notification.message,
        tag: `notification-${notification.id}`,
        data: {
          notificationId: notification.id,
          url: '/app',
          path: '/app'
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to send PWA notification:', error);
      return false;
    }
  }

  /**
   * Check if user has notifications enabled and should receive PWA notifications
   */
  shouldReceivePWANotifications() {
    // Check if PWA notifications are supported and enabled
    if (!this.isSupported || this.permissionStatus !== 'granted') {
      return false;
    }

    // Check user settings
    try {
      const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
      return settings.notifications?.push === true;
    } catch (error) {
      console.error('Failed to check notification settings:', error);
      return false;
    }
  }
}

// Create singleton instance
const pwaNotificationService = new PWANotificationService();

export default pwaNotificationService;

// Export individual functions for convenience
export const {
  requestPermission,
  showNotification,
  enable,
  disable,
  getStatus,
  test
} = pwaNotificationService;
