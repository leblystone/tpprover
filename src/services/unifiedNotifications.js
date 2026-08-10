/**
 * Unified Notification Service
 * 
 * Handles both PWA (web) and native mobile notifications
 * Automatically detects platform and uses appropriate method
 */

import { Capacitor } from '@capacitor/core';
import { calculateScheduledTasksForDate } from '../utils/calendarTasks';
import pwaNotificationService from './pwaNotifications';

class UnifiedNotificationService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.platform = Capacitor.getPlatform();

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
        icon: options.icon || '/tpp_logo.png',
        tag: options.tag || 'tpp-notification',
        data: options.data || {}
      });

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

      // Dynamic import to avoid issues on web (same as Settings page)
      const { LocalNotifications } = await import('@capacitor/local-notifications');

      // Check permissions first
      const permission = await LocalNotifications.checkPermissions();

      if (permission.display !== 'granted') {
        console.warn('📱 Local notification permission not granted, requesting...', permission);
        
        // Try to request permission
        const requestResult = await LocalNotifications.requestPermissions();

        if (requestResult.display !== 'granted') {
          console.error('❌ Local notification permission denied after request');
          throw new Error('Local notification permission denied');
        }
      }

      // NOTE: we intentionally do NOT set a `schedule.at` time here. A fixed
      // "now + 1000ms" offset looks safe, but if the native side is busy
      // (e.g. a concurrent PushNotifications.requestPermissions() call, or
      // Firebase Messaging retrying in the background) it can take longer
      // than 1s for Android to actually process the schedule() call. By the
      // time it does, that "1 second from now" timestamp is already in the
      // past, and Android silently drops the notification with
      // "Scheduled time must be after current time" — while our JS promise
      // still resolves successfully, masking the failure. Omitting `schedule`
      // entirely fires the notification immediately with no race condition.
      const notificationData = {
        title,
        body: options.body || '',
        id: Math.floor(Math.random() * 1000000), // Random ID under Java int limit
        sound: 'default',
        // smallIcon must be a monochrome drawable, not the full-color adaptive
        // ic_launcher mipmap — Android silently rejects the latter and falls
        // back to a generic circle-i, which also made largeIcon look duplicated.
        smallIcon: 'ic_stat_notification',
        largeIcon: 'tpp_logo', // Full-color logo shown in the expanded notification body
        attachments: [],
        actionTypeId: '',
        extra: { 
          test: true, 
          timestamp: Date.now(),
          source: 'admin-triggered',
          ...options.data
        }
      };

      // Schedule the notification (EXACT same call as Settings page)
      await LocalNotifications.schedule({
        notifications: [notificationData]
      });

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
   * Send a witty "it works!" confirmation notification the moment a user
   * enables notifications and grants permission. This is a REAL notification
   * (not a toast) so the user sees it land in their notification tray/center,
   * proving delivery actually works end-to-end.
   *
   * Template ('notificationsEnabledConfirmation') is admin-editable in the
   * Notification Template Editor. We read the live Firestore doc at send time
   * (same pattern the server uses for FCM templates) so admin edits apply
   * immediately to every user, even though this notification never goes
   * through a Cloud Function.
   */
  async sendEnabledConfirmation() {
    let template = null;

    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase.js');
      // Hard timeout — this notification must fire fast to prove delivery works.
      // A slow/unreachable Firestore fetch (cold start, flaky network, emulator)
      // should never block or silently swallow the confirmation notification.
      const snap = await Promise.race([
        getDoc(doc(db, 'notificationTemplates', 'notificationsEnabledConfirmation')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore template fetch timed out')), 2500))
      ]);
      if (snap.exists()) {
        const data = snap.data();
        if (data?.title || data?.body) {
          template = { title: data.title, body: data.body };
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load enabled-confirmation template from Firestore, using default:', error?.message);
    }

    if (!template) {
      const { getNotificationTemplate } = await import('../utils/notificationTemplates');
      template = getNotificationTemplate('notificationsEnabledConfirmation');
    }

    console.log('🔔 Sending notifications-enabled confirmation:', template.title);
    const result = await this.sendNotification(template.title, {
      body: template.body,
      tag: 'notifications-enabled-confirmation',
      data: { type: 'confirmation' }
    });
    console.log('🔔 Confirmation send result:', result);
    return result;
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
        if (p.active === false && !p.endType) continue;
        
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
      // Get today's first research task if researchTask variable is used
      const notificationText = (notification.title || '') + ' ' + (notification.body || '');
      const todaysFirstTask = notificationText.includes('{researchTask}') 
        ? this.getTodaysFirstResearchTask() 
        : (userData.researchTask || 'your research task');
      
      // Get cycle name from finished protocols with 3 days washout left if cycleName variable is used
      const cycleNameWith3DaysLeft = notificationText.includes('{cycleName}') 
        ? this.getCycleNameWith3DaysWashoutLeft() 
        : (userData.cycleName || '');
      
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
        researchTask: todaysFirstTask,
        cycleName: cycleNameWith3DaysLeft,
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
  sendEnabledConfirmation,
  isSupported,
  requestPermission,
  getPlatformInfo,
  sendTriggeredNotification
} = unifiedNotificationService;
