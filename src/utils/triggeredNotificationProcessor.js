// src/utils/triggeredNotificationProcessor.js
import adminNotificationService from '../services/adminNotifications';
import { calculateScheduledTasksForDate } from './calendarTasks';

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
   * Get cycle name from finished protocols with 3 days left in washout period
   */
  getCycleNameWith3DaysWashoutLeft() {
    try {
      const protocols = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]');
      
      if (protocols.length === 0) {
        return '';
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Helper to parse date string (same as Calendar.jsx)
      const parseDateString = (dateString) => {
        if (!dateString) return null;
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return null;
          return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        } catch {
          return null;
        }
      };
      
      // Helper to normalize date to midnight
      const normalizeToMidnight = (date) => {
        if (!date) return null;
        try {
          return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        } catch {
          return null;
        }
      };
      
      // Calculate protocol windows (same logic as Calendar.jsx getWindows)
      for (const p of protocols) {
        if (!p?.startDate || !p?.washout?.enabled) continue;
        
        const startDt = parseDateString(p.startDate);
        if (!startDt) continue;
        
        let endDt = null;
        
        // Calculate end date
        if (p.endDate) {
          endDt = parseDateString(p.endDate);
        } else if (p.duration && p.duration.noEnd !== true && Number(p.duration.count) > 0) {
          const cyclePeptide = p.peptides?.find(pep => pep.frequency?.type === 'cycle');
          
          if (cyclePeptide) {
            const onDays = Number(cyclePeptide.frequency.onDays) || 0;
            const offDays = Number(cyclePeptide.frequency.offDays) || 0;
            if (onDays > 0) {
              const durationInDays = (() => {
                const count = Number(p.duration.count);
                const unit = p.duration.unit.toLowerCase();
                if (unit.includes('day')) return count;
                if (unit.includes('week')) return count * 7;
                if (unit.includes('month')) return count * 30;
                return 0;
              })();
              const fullCycles = Math.floor(durationInDays / onDays);
              const remainingOnDays = durationInDays % onDays;
              let totalDays = fullCycles * (onDays + offDays);
              if (remainingOnDays > 0) {
                totalDays += remainingOnDays;
              } else if (fullCycles > 0) {
                totalDays -= offDays;
              }
              endDt = new Date(startDt);
              endDt.setDate(endDt.getDate() + totalDays - 1);
            }
          } else {
            // Fallback for non-cycle protocols
            endDt = new Date(startDt);
            const unit = String(p.duration.unit || 'week').toLowerCase();
            const count = Number(p.duration.count) || 0;
            if (unit.includes('day')) endDt.setDate(endDt.getDate() + count - 1);
            else if (unit.includes('week')) endDt.setDate(endDt.getDate() + (count * 7) - 1);
            else if (unit.includes('month')) {
              endDt.setMonth(endDt.getMonth() + count);
              endDt.setDate(endDt.getDate() - 1);
            }
          }
        }
        
        if (!endDt) continue;
        
        // Normalize dates for comparison
        const endDtNormalized = normalizeToMidnight(endDt);
        if (!endDtNormalized) continue;
        
        // Check if protocol has finished (end date is in the past)
        if (endDtNormalized >= today) continue;
        
        // Calculate washout period
        const washStart = new Date(endDtNormalized.getFullYear(), endDtNormalized.getMonth(), endDtNormalized.getDate() + 1);
        const washEnd = new Date(washStart);
        const wUnit = String(p.washout.unit || 'week').toLowerCase();
        const wCount = Number(p.washout.count) || 0;
        
        if (wCount > 0) {
          if (wUnit === 'day') washEnd.setDate(washEnd.getDate() + wCount - 1);
          else if (wUnit === 'week') washEnd.setDate(washEnd.getDate() + (wCount * 7) - 1);
          else if (wUnit === 'month') {
            washEnd.setMonth(washEnd.getMonth() + wCount);
            washEnd.setDate(washEnd.getDate() - 1);
          }
        } else {
          continue; // No washout period
        }
        
        const washEndNormalized = normalizeToMidnight(washEnd);
        if (!washEndNormalized) continue;
        
        // Calculate days remaining in washout period
        const daysRemaining = Math.floor((washEndNormalized - today) / (1000 * 60 * 60 * 24));
        
        // Check if exactly 3 days left
        if (daysRemaining === 3) {
          return p.protocolName || 'Protocol';
        }
      }
      
      return '';
    } catch (error) {
      console.error('Error getting cycle name with 3 days washout left:', error);
      return '';
    }
  }

  /**
   * Get today's first research task
   */
  getTodaysFirstResearchTask() {
    try {
      const protocols = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]');
      const supplements = JSON.parse(localStorage.getItem('tpprover_supplements') || '[]');
      const reconItems = JSON.parse(localStorage.getItem('tpprover_recon_items') || '[]');
      
      if (protocols.length === 0) {
        return 'your research task';
      }
      
      // Calculate today's scheduled tasks
      const today = new Date();
      const scheduledData = calculateScheduledTasksForDate(today, protocols, supplements, reconItems);
      
      // Get all tasks from all time slots
      const allTasks = [];
      Object.keys(scheduledData.bySlot || {}).forEach(timeSlot => {
        const slot = scheduledData.bySlot[timeSlot];
        if (slot.peptides) {
          slot.peptides.forEach(peptide => {
            allTasks.push({
              name: peptide.name || 'Peptide',
              dose: peptide.dose || '',
              unit: peptide.unit || '',
              time: timeSlot
            });
          });
        }
        if (slot.supplements) {
          slot.supplements.forEach(supplement => {
            allTasks.push({
              name: supplement.name || 'Supplement',
              dose: supplement.dose || '',
              unit: supplement.unit || '',
              time: timeSlot
            });
          });
        }
      });
      
      // Return the first task formatted as a research task name
      if (allTasks.length > 0) {
        const firstTask = allTasks[0];
        if (firstTask.dose) {
          // dose already includes unit if present (e.g., "600 mcg" or "15 units")
          return `${firstTask.name} (${firstTask.dose})`;
        }
        return firstTask.name;
      }
      
      return 'your research task';
    } catch (error) {
      console.error('Error getting today\'s research task:', error);
      return 'your research task';
    }
  }

  /**
   * Process variables in notification text
   */
  processVariables(text, userData = {}) {
    let processed = text;
    
    // Get today's first research task if researchTask variable is used
    const todaysFirstTask = text.includes('{researchTask}') 
      ? this.getTodaysFirstResearchTask() 
      : (userData.researchTask || 'your research task');
    
    // Get cycle name from finished protocols with 3 days washout left if cycleName variable is used
    const cycleNameWith3DaysLeft = text.includes('{cycleName}') 
      ? this.getCycleNameWith3DaysWashoutLeft() 
      : (userData.cycleName || '');
    
    // Default variables
    const variables = {
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
      researchTask: todaysFirstTask,
      cycleName: cycleNameWith3DaysLeft,
      stockpileCount: userData.stockpileCount || 0,
      stockpileItem: userData.stockpileItem || '',
      price: userData.price || '',
      link: userData.link || '',
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
