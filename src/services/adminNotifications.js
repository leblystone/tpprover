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
      userName: userData.name || userData.userName || 'there',
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
