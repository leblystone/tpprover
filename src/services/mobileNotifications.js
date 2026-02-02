/**
 * Mobile Push Notification Service
 * 
 * Handles native mobile push notifications via Capacitor
 * Integrates with PWA notifications for unified notification system
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { db } from '../config/firebase.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

class MobileNotificationService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.isInitialized = false;
    this.fcmToken = null;
    
    console.log('📱 Mobile Notification Service:', {
      isNative: this.isNative,
      platform: Capacitor.getPlatform()
    });
  }

  /**
   * Initialize mobile push notifications
   */
  async initialize() {
    if (!this.isNative || this.isInitialized) {
      return false;
    }

    try {
      console.log('🔧 Initializing mobile push notifications...');

      // Request permission
      const permissionStatus = await this.requestPermission();
      if (permissionStatus !== 'granted') {
        console.warn('📱 Push notification permission not granted');
        return false;
      }

      // Register with FCM
      await this.register();

      // Set up listeners
      this.setupListeners();

      this.isInitialized = true;
      console.log('✅ Mobile push notifications initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize mobile push notifications:', error);
      return false;
    }
  }

  /**
   * Request push notification permission
   */
  async requestPermission() {
    try {
      const result = await PushNotifications.requestPermissions();
      console.log('📱 Permission result:', result);
      return result.receive;
    } catch (error) {
      console.error('❌ Failed to request permission:', error);
      return 'denied';
    }
  }

  /**
   * Register for push notifications and get FCM token
   */
  async register() {
    try {
      await PushNotifications.register();
      console.log('📱 Registered for push notifications');
    } catch (error) {
      console.error('❌ Failed to register for push notifications:', error);
      throw error;
    }
  }

  /**
   * Set up push notification listeners
   */
  setupListeners() {
    // Fired when registration is successful and we have a token
    PushNotifications.addListener('registration', async (token) => {
      console.log('📱 Push registration success, token:', token.value);
      this.fcmToken = token.value;
      
      // Save token to Firebase for server-side notifications
      await this.saveFCMToken(token.value);
      
      // Notify the app that we have a token
      window.dispatchEvent(new CustomEvent('mobile-push-token', {
        detail: { token: token.value }
      }));
    });

    // Fired when registration fails
    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Push registration error:', error);
    });

    // Fired when a notification is received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📱 Push notification received (foreground):', notification);
      
      // Show in-app notification or handle as needed
      this.handleForegroundNotification(notification);
    });

    // Fired when user taps on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('📱 Push notification action performed:', notification);
      
      // Handle notification tap
      this.handleNotificationTap(notification);
    });
  }

  /**
   * Handle notification received while app is in foreground
   */
  handleForegroundNotification(notification) {
    // Show toast or in-app notification
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { 
        type: 'info', 
        message: `📱 ${notification.title}: ${notification.body}` 
      }
    }));

    // You could also show a custom in-app notification here
    this.showInAppNotification(notification);
  }

  /**
   * Handle notification tap
   */
  handleNotificationTap(notification) {
    const data = notification.notification.data;
    
    // Navigate to specific page if data contains a path
    if (data?.path) {
      // Use your app's router to navigate
      window.location.hash = data.path;
    }
    
    // Mark notification as opened
    this.trackNotificationOpened(notification);
  }

  /**
   * Show custom in-app notification
   */
  showInAppNotification(notification) {
    // Create a custom notification banner
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      right: 20px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      padding: 16px;
      z-index: 10000;
      animation: slideDown 0.3s ease-out;
      cursor: pointer;
    `;
    
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 40px; height: 40px; background: #A3B18A; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          📱
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">
            ${notification.title}
          </div>
          <div style="color: #6b7280; font-size: 14px;">
            ${notification.body}
          </div>
        </div>
        <div style="color: #9ca3af; font-size: 24px;">×</div>
      </div>
    `;
    
    // Add click handler
    banner.onclick = () => {
      this.handleNotificationTap({ notification });
      banner.remove();
    };
    
    // Add to page
    document.body.appendChild(banner);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (banner.parentNode) {
        banner.remove();
      }
    }, 5000);
    
    // Add slide animation
    if (!document.querySelector('#notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'notification-styles';
      styles.textContent = `
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styles);
    }
  }

  /**
   * Save FCM token to Firebase for server-side notifications
   */
  async saveFCMToken(token) {
    try {
      // Get current user from localStorage - use uid first (Firestore users collection is keyed by UID)
      const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
      const userId = user?.uid || user?.email?.toLowerCase();
      if (!userId) {
        console.warn('📱 No user found, cannot save FCM token');
        return;
      }

      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        fcmToken: token,
        deviceInfo: {
          platform: Capacitor.getPlatform(),
          isNative: true,
          lastUpdated: serverTimestamp()
        },
        notificationSettings: {
          push: true, // Firebase Functions check for 'push', not 'pushEnabled'
          pushEnabled: true, // Keep for backward compatibility
          lastUpdated: serverTimestamp()
        }
      }, { merge: true });

      console.log('✅ FCM token saved for user:', userId);
    } catch (error) {
      console.error('❌ Failed to save FCM token:', error);
    }
  }

  /**
   * Send test notification (for admin testing)
   */
  async sendTestNotification(title, body, data = {}) {
    try {
      if (!this.isNative) {
        throw new Error('Test notifications only available on mobile');
      }

      // For testing, we can trigger a local notification
      // In production, this would be sent from the server
      console.log('📱 Test notification would be sent:', { title, body, data });
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'info', 
          message: `📱 Test notification: ${title}` 
        }
      }));

      return true;
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
      return false;
    }
  }

  /**
   * Check current notification status
   */
  async getStatus() {
    if (!this.isNative) {
      return {
        supported: false,
        platform: 'web',
        native: false
      };
    }

    try {
      const permission = await PushNotifications.checkPermissions();
      
      return {
        supported: true,
        platform: Capacitor.getPlatform(),
        native: true,
        permission: permission.receive,
        token: this.fcmToken,
        initialized: this.isInitialized
      };
    } catch (error) {
      console.error('❌ Failed to get notification status:', error);
      return {
        supported: false,
        error: error.message
      };
    }
  }

  /**
   * Track notification opened (for analytics)
   */
  trackNotificationOpened(notification) {
    try {
      const stats = JSON.parse(localStorage.getItem('tpp_notification_stats') || '{}');
      const notificationId = notification.notification.data?.notificationId || 'unknown';
      
      if (!stats[notificationId]) {
        stats[notificationId] = { sent: 0, opened: 0 };
      }
      stats[notificationId].opened++;
      
      localStorage.setItem('tpp_notification_stats', JSON.stringify(stats));
      console.log('📊 Notification opened tracked:', notificationId);
    } catch (error) {
      console.error('❌ Failed to track notification:', error);
    }
  }

  /**
   * Get FCM token (for server-side sending)
   */
  getFCMToken() {
    return this.fcmToken;
  }

  /**
   * Check if running on native mobile platform
   */
  isNativePlatform() {
    return this.isNative;
  }
}

// Create singleton instance
const mobileNotificationService = new MobileNotificationService();

export default mobileNotificationService;

// Export individual methods for convenience
export const {
  initialize,
  requestPermission,
  sendTestNotification,
  getStatus,
  getFCMToken,
  isNativePlatform
} = mobileNotificationService;
