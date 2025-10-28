// src/utils/orderStatusNotifications.js
import { loadSettings } from '../pages/Settings';
import { getNotificationTemplate, isNotificationEnabled } from './notificationTemplates';

/**
 * Check for order status changes that should trigger notifications
 */
export function checkOrderStatusNotifications(orders = []) {
  if (!isNotificationEnabled('orderStatusUpdates')) {
    return [];
  }
  
  try {
    const notifications = [];
    const today = new Date();
    
    orders.forEach(order => {
      // Check for recently delivered orders (within last 7 days)
      if (order.status === 'Delivered' && order.date) {
        const deliveryDate = new Date(order.date);
        const daysSinceDelivery = Math.floor((today - deliveryDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceDelivery <= 7 && daysSinceDelivery >= 0) {
          // Check if we've already sent a notification for this order
          if (!wasNotificationSentRecently(`order-arrived-${order.id}`)) {
            notifications.push({
              type: 'orderArrived',
              order,
              daysSinceDelivery,
              template: getNotificationTemplate('orderArrived', {
                peptideName: getOrderPeptideNames(order)
              })
            });
          }
        }
      }
      
      // Check for other status changes (shipped, processing, etc.)
      if (order.status && order.status !== 'Delivered' && order.status !== 'Cancelled') {
        // Check if status changed recently (within last 24 hours)
        const lastStatusCheck = getLastStatusCheck(order.id);
        if (!lastStatusCheck || (today - new Date(lastStatusCheck)) > 24 * 60 * 60 * 1000) {
          notifications.push({
            type: 'orderStatusUpdate',
            order,
            template: getNotificationTemplate('orderStatusUpdate', {
              peptideName: getOrderPeptideNames(order),
              status: order.status,
              additionalMessage: getStatusMessage(order.status)
            })
          });
          
          // Update last status check
          setLastStatusCheck(order.id, today.toISOString());
        }
      }
    });
    
    return notifications;
  } catch (error) {
    console.error('Error checking order status notifications:', error);
    return [];
  }
}

/**
 * Send order arrived notification
 */
export async function sendOrderArrivedNotification(notification) {
  try {
    // Import PWA service dynamically
    const { default: pwaService } = await import('../services/pwaNotifications');
    
    if (pwaService.shouldReceivePWANotifications()) {
      await pwaService.sendPWANotification({
        title: notification.template.title,
        body: notification.template.body,
        icon: '/tpp_logo.png',
        badge: '/tpp_logo.png',
        tag: `order-arrived-${notification.order.id}`,
        data: {
          type: notification.type,
          orderId: notification.order.id,
          actionUrl: notification.template.actionUrl,
          actionText: notification.template.actionText
        }
      });
    }
    
    // Add to in-app notifications
    addInAppNotification({
      type: notification.type,
      title: notification.template.title,
      body: notification.template.body,
      actionUrl: notification.template.actionUrl,
      actionText: notification.template.actionText,
      data: { 
        orderId: notification.order.id,
        daysSinceDelivery: notification.daysSinceDelivery
      }
    });
    
    // Mark as sent to avoid duplicates
    markNotificationSent(`order-arrived-${notification.order.id}`);
    
    return true;
  } catch (error) {
    console.error('Error sending order arrived notification:', error);
    return false;
  }
}

/**
 * Send order status update notification
 */
export async function sendOrderStatusNotification(notification) {
  try {
    // Import PWA service dynamically
    const { default: pwaService } = await import('../services/pwaNotifications');
    
    if (pwaService.shouldReceivePWANotifications()) {
      await pwaService.sendPWANotification({
        title: notification.template.title,
        body: notification.template.body,
        icon: '/tpp_logo.png',
        badge: '/tpp_logo.png',
        tag: `order-status-${notification.order.id}`,
        data: {
          type: notification.type,
          orderId: notification.order.id,
          actionUrl: notification.template.actionUrl,
          actionText: notification.template.actionText
        }
      });
    }
    
    // Add to in-app notifications
    addInAppNotification({
      type: notification.type,
      title: notification.template.title,
      body: notification.template.body,
      actionUrl: notification.template.actionUrl,
      actionText: notification.template.actionText,
      data: { 
        orderId: notification.order.id,
        status: notification.order.status
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error sending order status notification:', error);
    return false;
  }
}

/**
 * Get peptide names from order items
 */
function getOrderPeptideNames(order) {
  try {
    if (order.items && Array.isArray(order.items)) {
      const names = order.items.map(item => item.name).filter(Boolean);
      if (names.length > 0) {
        return names.length === 1 ? names[0] : `${names.length} peptides`;
      }
    }
    return order.peptide || 'your peptide';
  } catch (error) {
    console.error('Error getting peptide names:', error);
    return 'your peptide';
  }
}

/**
 * Get friendly status message
 */
function getStatusMessage(status) {
  const statusMessages = {
    'Processing': 'Your order is being prepared!',
    'Shipped': 'Your order is on the way!',
    'In Transit': 'Your order is traveling to you!',
    'Out for Delivery': 'Your order is almost there!',
    'Delivered': 'Your order has arrived!',
    'Cancelled': 'Your order was cancelled.',
    'Refunded': 'Your order was refunded.'
  };
  
  return statusMessages[status] || '';
}

/**
 * Check if notification was sent recently
 */
function wasNotificationSentRecently(key, hoursThreshold = 168) { // 7 days default
  try {
    const sentNotifications = JSON.parse(localStorage.getItem('tpp_sent_notifications') || '{}');
    const sentTime = sentNotifications[key];
    
    if (!sentTime) return false;
    
    const hoursSinceSent = (Date.now() - sentTime) / (1000 * 60 * 60);
    return hoursSinceSent < hoursThreshold;
  } catch (error) {
    console.error('Error checking sent notification:', error);
    return false;
  }
}

/**
 * Mark notification as sent
 */
function markNotificationSent(key) {
  try {
    const sentNotifications = JSON.parse(localStorage.getItem('tpp_sent_notifications') || '{}');
    sentNotifications[key] = Date.now();
    localStorage.setItem('tpp_sent_notifications', JSON.stringify(sentNotifications));
  } catch (error) {
    console.error('Error marking notification sent:', error);
  }
}

/**
 * Get last status check time for an order
 */
function getLastStatusCheck(orderId) {
  try {
    const statusChecks = JSON.parse(localStorage.getItem('tpp_order_status_checks') || '{}');
    return statusChecks[orderId];
  } catch (error) {
    console.error('Error getting last status check:', error);
    return null;
  }
}

/**
 * Set last status check time for an order
 */
function setLastStatusCheck(orderId, timestamp) {
  try {
    const statusChecks = JSON.parse(localStorage.getItem('tpp_order_status_checks') || '{}');
    statusChecks[orderId] = timestamp;
    localStorage.setItem('tpp_order_status_checks', JSON.stringify(statusChecks));
  } catch (error) {
    console.error('Error setting last status check:', error);
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
 * Get all order-related notifications
 */
export function getAllOrderNotifications(orders = []) {
  return checkOrderStatusNotifications(orders);
}

/**
 * Process all order notifications and send them
 */
export async function processOrderNotifications(orders = []) {
  const notifications = checkOrderStatusNotifications(orders);
  
  for (const notification of notifications) {
    if (notification.type === 'orderArrived') {
      await sendOrderArrivedNotification(notification);
    } else if (notification.type === 'orderStatusUpdate') {
      await sendOrderStatusNotification(notification);
    }
  }
  
  return notifications.length;
}
