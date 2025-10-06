// src/utils/cycleReminders.js
import { loadSettings } from '../pages/Settings';
import { getNotificationTemplate, isNotificationEnabled } from './notificationTemplates';

/**
 * Check for upcoming cycle reminders
 */
export function checkCycleReminders(protocols = []) {
  if (!isNotificationEnabled('cycleReminders')) {
    return [];
  }
  
  try {
    const reminders = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    protocols.forEach(protocol => {
      // Check for cycle-based protocols
      if (protocol.peptides && Array.isArray(protocol.peptides)) {
        protocol.peptides.forEach(peptide => {
          if (peptide.frequency?.type === 'cycle') {
            const onDays = Number(peptide.frequency.onDays) || 0;
            const offDays = Number(peptide.frequency.offDays) || 0;
            const cycleLength = onDays + offDays;
            
            if (cycleLength > 0) {
              const protocolStartDate = new Date(protocol.startDate);
              const daysSinceStart = Math.floor((today - protocolStartDate) / (1000 * 60 * 60 * 24));
              const currentCycleDay = daysSinceStart % cycleLength;
              
              // Check if cycle is ending soon (within 3 days)
              if (currentCycleDay >= onDays - 3 && currentCycleDay < onDays) {
                const daysUntilOff = onDays - currentCycleDay;
                reminders.push({
                  type: 'cycleEndReminder',
                  protocol,
                  peptide,
                  daysUntil: daysUntilOff,
                  template: getNotificationTemplate('cycleEndReminder', {
                    protocolName: protocol.protocolName || 'your protocol',
                    daysUntil: daysUntilOff
                  })
                });
              }
              
              // Check if off period is ending soon (within 3 days of next cycle)
              if (currentCycleDay >= onDays && currentCycleDay >= cycleLength - 3) {
                const daysUntilNext = cycleLength - currentCycleDay;
                reminders.push({
                  type: 'cycleReminder',
                  protocol,
                  peptide,
                  daysUntil: daysUntilNext,
                  template: getNotificationTemplate('cycleReminder', {
                    protocolName: protocol.protocolName || 'your protocol',
                    daysUntil: daysUntilNext
                  })
                });
              }
            }
          }
        });
      }
    });
    
    return reminders;
  } catch (error) {
    console.error('Error checking cycle reminders:', error);
    return [];
  }
}

/**
 * Check for washout period reminders
 */
export function checkWashoutReminders(protocols = []) {
  if (!isNotificationEnabled('washoutReminders')) {
    return [];
  }
  
  try {
    const reminders = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    protocols.forEach(protocol => {
      // Check if protocol has ended and washout period should start
      if (protocol.endDate) {
        const endDate = new Date(protocol.endDate);
        const daysSinceEnd = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
        
        // Remind about washout if protocol ended recently (within 7 days)
        if (daysSinceEnd >= 0 && daysSinceEnd <= 7) {
          // Check if there's a washout period defined
          const washoutDays = Number(protocol.washoutDays) || 0;
          
          if (washoutDays > 0) {
            reminders.push({
              type: 'washoutReminder',
              protocol,
              daysAgo: daysSinceEnd,
              washoutDays,
              template: getNotificationTemplate('washoutReminder', {
                protocolName: protocol.protocolName || 'your protocol',
                daysAgo: daysSinceEnd
              })
            });
          }
        }
      }
    });
    
    return reminders;
  } catch (error) {
    console.error('Error checking washout reminders:', error);
    return [];
  }
}

/**
 * Send cycle reminder notification
 */
export async function sendCycleReminder(reminder) {
  try {
    // Import PWA service dynamically
    const { default: pwaService } = await import('../services/pwaNotifications');
    
    if (pwaService.shouldReceivePWANotifications()) {
      await pwaService.sendPWANotification({
        title: reminder.template.title,
        body: reminder.template.body,
        icon: '/tpp-logo.png',
        badge: '/tpp-logo.png',
        tag: `cycle-reminder-${reminder.protocol.id}`,
        data: {
          type: reminder.type,
          protocolId: reminder.protocol.id,
          actionUrl: reminder.template.actionUrl,
          actionText: reminder.template.actionText
        }
      });
    }
    
    // Add to in-app notifications
    addInAppNotification({
      type: reminder.type,
      title: reminder.template.title,
      body: reminder.template.body,
      actionUrl: reminder.template.actionUrl,
      actionText: reminder.template.actionText,
      data: { 
        protocolId: reminder.protocol.id,
        daysUntil: reminder.daysUntil
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error sending cycle reminder:', error);
    return false;
  }
}

/**
 * Send washout reminder notification
 */
export async function sendWashoutReminder(reminder) {
  try {
    // Import PWA service dynamically
    const { default: pwaService } = await import('../services/pwaNotifications');
    
    if (pwaService.shouldReceivePWANotifications()) {
      await pwaService.sendPWANotification({
        title: reminder.template.title,
        body: reminder.template.body,
        icon: '/tpp-logo.png',
        badge: '/tpp-logo.png',
        tag: `washout-reminder-${reminder.protocol.id}`,
        data: {
          type: reminder.type,
          protocolId: reminder.protocol.id,
          actionUrl: reminder.template.actionUrl,
          actionText: reminder.template.actionText
        }
      });
    }
    
    // Add to in-app notifications
    addInAppNotification({
      type: reminder.type,
      title: reminder.template.title,
      body: reminder.template.body,
      actionUrl: reminder.template.actionUrl,
      actionText: reminder.template.actionText,
      data: { 
        protocolId: reminder.protocol.id,
        daysAgo: reminder.daysAgo
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error sending washout reminder:', error);
    return false;
  }
}

/**
 * Add notification to in-app notification system
 */
function addInAppNotification(notification) {
  try {
    const notifications = JSON.parse(localStorage.getItem('tpprover_notifications') || '[]');
    const newNotification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...notification,
      timestamp: Date.now(),
      read: false
    };
    
    notifications.unshift(newNotification);
    
    // Keep only last 50 notifications
    if (notifications.length > 50) {
      notifications.splice(50);
    }
    
    localStorage.setItem('tpprover_notifications', JSON.stringify(notifications));
    
    // Dispatch event to update notification bell
    window.dispatchEvent(new CustomEvent('tpp:notification-added', { 
      detail: newNotification 
    }));
    
    return true;
  } catch (error) {
    console.error('Error adding in-app notification:', error);
    return false;
  }
}

/**
 * Get all active reminders for a user
 */
export function getAllActiveReminders(protocols = [], stockpileItems = []) {
  const cycleReminders = checkCycleReminders(protocols);
  const washoutReminders = checkWashoutReminders(protocols);
  
  return {
    cycle: cycleReminders,
    washout: washoutReminders,
    total: cycleReminders.length + washoutReminders.length
  };
}

/**
 * Check if a reminder was already sent recently (to avoid spam)
 */
export function wasReminderSentRecently(protocolId, reminderType, hoursThreshold = 24) {
  try {
    const notifications = JSON.parse(localStorage.getItem('tpprover_notifications') || '[]');
    const now = Date.now();
    const threshold = hoursThreshold * 60 * 60 * 1000; // Convert to milliseconds
    
    return notifications.some(notification => {
      const timeDiff = now - notification.timestamp;
      return (
        notification.data?.protocolId === protocolId &&
        notification.type === reminderType &&
        timeDiff < threshold
      );
    });
  } catch (error) {
    console.error('Error checking recent reminder:', error);
    return false;
  }
}
