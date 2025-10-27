// src/utils/triggeredNotificationProcessor.js
import adminNotificationService from '../services/adminNotifications';

/**
 * Triggered Notification Processor
 * 
 * This utility processes and sends triggered notifications based on:
 * - User events (login, actions, etc.)
 * - Data conditions (low stock, etc.)  
 * - Time-based triggers (inactive users, etc.)
 * - Scheduled notifications
 */

class TriggeredNotificationProcessor {
  constructor() {
    this.isProcessing = false;
    this.lastProcessTime = Date.now();
  }

  /**
   * Load triggered notifications from localStorage
   */
  loadTriggeredNotifications() {
    try {
      const saved = localStorage.getItem('tpp_triggered_notifications');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Failed to load triggered notifications:', error);
      return {};
    }
  }

  /**
   * Process user event triggers
   */
  async processUserEvent(eventName, userData = {}) {
    const notifications = this.loadTriggeredNotifications();
    
    for (const notification of Object.values(notifications)) {
      if (!notification.enabled || !notification.scheduling.active) continue;
      
      if (notification.triggers.type === 'user_event' && 
          notification.triggers.event === eventName) {
        
        // Check if user matches targeting criteria
        if (this.matchesTargeting(notification.targeting, userData)) {
          const delay = notification.triggers.delay || 0;
          
          if (delay > 0) {
            // Schedule for later
            setTimeout(() => {
              this.sendNotification(notification, userData);
            }, delay * 60 * 1000); // Convert minutes to milliseconds
          } else {
            // Send immediately
            await this.sendNotification(notification, userData);
          }
        }
      }
    }
  }

  /**
   * Process data condition triggers (called periodically)
   */
  async processDataConditions() {
    const notifications = this.loadTriggeredNotifications();
    
    for (const notification of Object.values(notifications)) {
      if (!notification.enabled || !notification.scheduling.active) continue;
      
      if (notification.triggers.type === 'data_condition') {
        const conditionMet = await this.checkDataCondition(notification.triggers);
        
        if (conditionMet) {
          // Check if we've already sent this notification recently
          const lastSent = this.getLastSentTime(notification.id);
          const now = Date.now();
          const cooldownPeriod = this.getCooldownPeriod(notification.triggers.checkInterval);
          
          if (!lastSent || (now - lastSent) > cooldownPeriod) {
            const userData = this.getUserData();
            if (this.matchesTargeting(notification.targeting, userData)) {
              await this.sendNotification(notification, userData);
              this.setLastSentTime(notification.id, now);
            }
          }
        }
      }
    }
  }

  /**
   * Process time-based triggers
   */
  async processTimeBased() {
    const notifications = this.loadTriggeredNotifications();
    const userData = this.getUserData();
    
    for (const notification of Object.values(notifications)) {
      if (!notification.enabled || !notification.scheduling.active) continue;
      
      if (notification.triggers.type === 'time_based') {
        const shouldTrigger = this.checkTimeBased(notification.triggers, userData);
        
        if (shouldTrigger) {
          const lastSent = this.getLastSentTime(notification.id);
          const now = Date.now();
          const delay = this.getDelayInMs(notification.triggers.delay, notification.triggers.unit);
          
          if (!lastSent || (now - lastSent) > delay) {
            if (this.matchesTargeting(notification.targeting, userData)) {
              await this.sendNotification(notification, userData);
              this.setLastSentTime(notification.id, now);
            }
          }
        }
      }
    }
  }

  /**
   * Check if user matches targeting criteria
   */
  matchesTargeting(targeting, userData) {
    switch (targeting.audience) {
      case 'all_users':
        return true;
      case 'new_users':
        return this.isNewUser(userData);
      case 'active_users':
        return this.isActiveUser(userData);
      case 'inactive_users':
        return !this.isActiveUser(userData);
      case 'premium_users':
        return this.isPremiumUser(userData);
      case 'custom':
        return this.matchesCustomConditions(targeting.conditions, userData);
      default:
        return false;
    }
  }

  /**
   * Check data conditions
   */
  async checkDataCondition(triggers) {
    switch (triggers.condition) {
      case 'stockpile_low':
        return this.checkLowStock(triggers.threshold);
      case 'protocol_complete':
        return this.checkProtocolComplete();
      case 'order_delivered':
        return this.checkOrderDelivered();
      default:
        return false;
    }
  }

  /**
   * Check low stock condition
   */
  checkLowStock(threshold = 3) {
    try {
      const stockpile = JSON.parse(localStorage.getItem('tpprover_stockpile') || '[]');
      return stockpile.some(item => {
        const quantity = Number(item.quantity) || 0;
        return quantity <= threshold && quantity > 0;
      });
    } catch (error) {
      console.error('Error checking low stock:', error);
      return false;
    }
  }

  /**
   * Send the actual notification
   */
  async sendNotification(notification, userData = {}) {
    try {
      // Process variables in the notification
      const processedTitle = this.processVariables(notification.title, userData);
      const processedBody = this.processVariables(notification.body, userData);

      // Check quiet hours
      if (this.isQuietHours(notification.scheduling)) {
        console.log(`Skipping notification ${notification.id} due to quiet hours`);
        return;
      }

      // Send via admin notification service (cross-device to mobile)
      const success = await adminNotificationService.sendTriggeredNotification(notification, userData);

      if (success) {
        console.log(`✅ Triggered notification sent: ${notification.name}`);
        
        // Track notification send
        this.trackNotificationSent(notification.id, userData);
      } else {
        console.warn(`⚠️ Failed to send triggered notification: ${notification.name}`);
      }

      return success;
    } catch (error) {
      console.error('Error sending triggered notification:', error);
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
      userName: userData.name || 'there',
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
   * Helper methods
   */
  isNewUser(userData) {
    const signupDate = userData.signupDate || localStorage.getItem('tpprover_user_signup');
    if (!signupDate) return false;
    
    const daysSinceSignup = (Date.now() - new Date(signupDate)) / (1000 * 60 * 60 * 24);
    return daysSinceSignup <= 7; // New if signed up within 7 days
  }

  isActiveUser(userData) {
    const lastLogin = userData.lastLogin || localStorage.getItem('tpprover_last_login');
    if (!lastLogin) return false;
    
    const daysSinceLogin = (Date.now() - new Date(lastLogin)) / (1000 * 60 * 60 * 24);
    return daysSinceLogin <= 7; // Active if logged in within 7 days
  }

  isPremiumUser(userData) {
    const subscription = userData.subscription || JSON.parse(localStorage.getItem('tpprover_subscription') || '{}');
    return subscription.status === 'active' || subscription.plan === 'premium';
  }

  getUserData() {
    try {
      const user = JSON.parse(localStorage.getItem('tpprover_user') || '{}');
      const lastLogin = localStorage.getItem('tpprover_last_login');
      const signupDate = localStorage.getItem('tpprover_user_signup');
      
      return {
        ...user,
        lastLogin,
        signupDate
      };
    } catch (error) {
      console.error('Error getting user data:', error);
      return {};
    }
  }

  isQuietHours(scheduling) {
    if (!scheduling.quietHours) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes(); // e.g., 1430 for 2:30 PM
    
    const start = this.timeStringToNumber(scheduling.quietHours.start);
    const end = this.timeStringToNumber(scheduling.quietHours.end);
    
    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Quiet hours span midnight
      return currentTime >= start || currentTime <= end;
    }
  }

  timeStringToNumber(timeString) {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes;
  }

  getDelayInMs(delay, unit) {
    const multipliers = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000
    };
    
    return delay * (multipliers[unit] || multipliers.days);
  }

  getCooldownPeriod(interval) {
    switch (interval) {
      case 'hourly': return 60 * 60 * 1000;
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'weekly': return 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  getLastSentTime(notificationId) {
    try {
      const sent = JSON.parse(localStorage.getItem('tpp_notification_sent_times') || '{}');
      return sent[notificationId];
    } catch (error) {
      return null;
    }
  }

  setLastSentTime(notificationId, timestamp) {
    try {
      const sent = JSON.parse(localStorage.getItem('tpp_notification_sent_times') || '{}');
      sent[notificationId] = timestamp;
      localStorage.setItem('tpp_notification_sent_times', JSON.stringify(sent));
    } catch (error) {
      console.error('Error saving notification sent time:', error);
    }
  }

  trackNotificationSent(notificationId, userData) {
    try {
      const stats = JSON.parse(localStorage.getItem('tpp_notification_stats') || '{}');
      if (!stats[notificationId]) {
        stats[notificationId] = { sent: 0, opened: 0 };
      }
      stats[notificationId].sent++;
      localStorage.setItem('tpp_notification_stats', JSON.stringify(stats));
    } catch (error) {
      console.error('Error tracking notification:', error);
    }
  }

  /**
   * Initialize automatic processing
   */
  startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    // Process data conditions every 30 minutes
    setInterval(() => {
      this.processDataConditions();
    }, 30 * 60 * 1000);
    
    // Process time-based triggers every hour
    setInterval(() => {
      this.processTimeBased();
    }, 60 * 60 * 1000);
    
    console.log('🔄 Triggered notification processor started');
  }

  stopProcessing() {
    this.isProcessing = false;
    console.log('⏹️ Triggered notification processor stopped');
  }
}

// Create singleton instance
const triggeredNotificationProcessor = new TriggeredNotificationProcessor();

export default triggeredNotificationProcessor;

// Export methods for manual triggering
export const {
  processUserEvent,
  processDataConditions,
  processTimeBased,
  startProcessing,
  stopProcessing
} = triggeredNotificationProcessor;
