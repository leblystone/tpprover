// src/utils/lowStockAlerts.js
import { loadSettings } from '../pages/Settings';
import { getNotificationTemplate, isNotificationEnabled, getNotificationVariables } from './notificationTemplates';

/**
 * Check if stockpile items are running low and trigger alerts
 */
export function checkLowStockAlerts(stockpileItems = []) {
  if (!isNotificationEnabled('lowStockAlerts')) {
    return [];
  }
  
  try {
    const settings = loadSettings();
    const threshold = settings?.orders?.lowStockThreshold || 3;
    
    const lowStockItems = stockpileItems.filter(item => {
      const quantity = Number(item.quantity) || 0;
      return quantity <= threshold && quantity > 0; // Only alert if there's still some stock
    });
    
    return lowStockItems.map(item => {
      const template = getNotificationTemplate('lowStock', {
        count: item.quantity,
        peptideName: item.name || 'Unknown Peptide'
      });
      
      return {
        type: 'lowStock',
        item,
        template,
        priority: 'medium',
        timestamp: new Date().toISOString()
      };
    });
  } catch (error) {
    console.error('Error checking low stock alerts:', error);
    return [];
  }
}

/**
 * Send low stock notification via PWA
 */
export async function sendLowStockNotification(item) {
  try {
    const template = getNotificationTemplate('lowStock', {
      count: item.quantity,
      peptideName: item.name || 'Unknown Peptide'
    });
    
    // Import PWA service dynamically to avoid circular dependency
    const { default: pwaService } = await import('../services/pwaNotifications');
    
    if (pwaService.shouldReceivePWANotifications()) {
      await pwaService.sendPWANotification({
        title: template.title,
        body: template.body,
        icon: '/tpp-logo.png',
        badge: '/tpp-logo.png',
        tag: `low-stock-${item.id}`,
        data: {
          type: 'lowStock',
          itemId: item.id,
          actionUrl: template.actionUrl,
          actionText: template.actionText
        }
      });
    }
    
    // Also add to in-app notifications
    addInAppNotification({
      type: 'lowStock',
      title: template.title,
      body: template.body,
      actionUrl: template.actionUrl,
      actionText: template.actionText,
      data: { itemId: item.id }
    });
    
    return true;
  } catch (error) {
    console.error('Error sending low stock notification:', error);
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
 * Check if an item was recently added to stockpile (to avoid duplicate alerts)
 */
export function wasRecentlyAdded(item, hoursThreshold = 24) {
  try {
    const purchaseDate = new Date(item.purchaseDate);
    const now = new Date();
    const hoursDiff = (now - purchaseDate) / (1000 * 60 * 60);
    
    return hoursDiff <= hoursThreshold;
  } catch (error) {
    console.error('Error checking recent addition:', error);
    return false;
  }
}

/**
 * Get low stock items for display in dashboard widget
 */
export function getLowStockItems(stockpileItems = []) {
  try {
    const settings = loadSettings();
    const threshold = settings?.orders?.lowStockThreshold || 3;
    
    return stockpileItems.filter(item => {
      const quantity = Number(item.quantity) || 0;
      return quantity <= threshold && quantity > 0;
    }).sort((a, b) => Number(a.quantity) - Number(b.quantity)); // Sort by quantity (lowest first)
  } catch (error) {
    console.error('Error getting low stock items:', error);
    return [];
  }
}

/**
 * Format low stock alert for display
 */
export function formatLowStockAlert(item) {
  const template = getNotificationTemplate('lowStock', {
    count: item.quantity,
    peptideName: item.name || 'Unknown Peptide'
  });
  
  return {
    title: template.title,
    message: template.body,
    severity: Number(item.quantity) === 1 ? 'critical' : Number(item.quantity) <= 2 ? 'high' : 'medium',
    item,
    actionUrl: template.actionUrl,
    actionText: template.actionText
  };
}
