/**
 * PWA Notification Test Utilities
 * 
 * This file provides comprehensive testing for PWA notification functionality
 * to verify that notifications work properly as native browser notifications
 * when the app is installed as a PWA.
 */

/**
 * Check if PWA notifications are properly configured and working
 * @returns {Promise<Object>} Test results with detailed status
 */
export async function testPWANotifications() {
  const results = {
    serviceWorkerSupported: false,
    serviceWorkerActive: false,
    notificationAPISupported: false,
    notificationPermission: 'default',
    canShowNotifications: false,
    pushSupported: false,
    isPWAInstalled: false,
    errors: [],
    recommendations: []
  };

  try {
    // 1. Check Service Worker Support
    results.serviceWorkerSupported = 'serviceWorker' in navigator;
    if (!results.serviceWorkerSupported) {
      results.errors.push('Service Worker not supported in this browser');
      return results;
    }

    // 2. Check if Service Worker is active
    if (navigator.serviceWorker.controller) {
      results.serviceWorkerActive = true;
    } else {
      results.errors.push('Service Worker is not active');
      results.recommendations.push('Refresh the page to activate the service worker');
    }

    // 3. Check Notification API Support
    results.notificationAPISupported = 'Notification' in window;
    if (!results.notificationAPISupported) {
      results.errors.push('Notification API not supported in this browser');
      return results;
    }

    // 4. Check current permission status
    results.notificationPermission = Notification.permission;

    // 5. Check if we can show notifications
    results.canShowNotifications = results.notificationPermission === 'granted';

    // 6. Check Push API support
    results.pushSupported = 'PushManager' in window;

    // 7. Check if app is installed as PWA
    results.isPWAInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                            window.navigator.standalone === true;

    // 8. Test notification display if permission is granted
    if (results.canShowNotifications) {
      try {
        await testNotificationDisplay();
        results.testNotificationShown = true;
      } catch (error) {
        results.errors.push(`Failed to show test notification: ${error.message}`);
      }
    } else {
      results.recommendations.push('Request notification permission to enable PWA notifications');
    }

    // 9. Check service worker registration for push events
    if (results.serviceWorkerActive) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.pushManager) {
          results.pushManagerAvailable = true;
        }
      } catch (error) {
        results.errors.push(`Push manager check failed: ${error.message}`);
      }
    }

  } catch (error) {
    results.errors.push(`Test failed: ${error.message}`);
  }

  return results;
}

/**
 * Test showing a notification to verify it works
 */
async function testNotificationDisplay() {
  return new Promise((resolve, reject) => {
    if (Notification.permission !== 'granted') {
      reject(new Error('Notification permission not granted'));
      return;
    }

    const notification = new Notification('PWA Test Notification', {
      body: 'This is a test notification from The Pep Planner PWA',
      icon: '/tpp-logo.png',
      badge: '/tpp-logo.png',
      tag: 'pwa-test',
      requireInteraction: false,
      silent: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      resolve();
    };

    notification.onerror = (error) => {
      reject(error);
    };

    // Auto-resolve after 3 seconds if no interaction
    setTimeout(() => {
      notification.close();
      resolve();
    }, 3000);
  });
}

/**
 * Request notification permission from user
 * @returns {Promise<string>} The permission result
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission has been denied. Please enable it in browser settings.');
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Show a PWA notification
 * @param {string} title - Notification title
 * @param {Object} options - Notification options
 */
export function showPWANotification(title, options = {}) {
  if (Notification.permission !== 'granted') {
    console.warn('Cannot show notification: permission not granted');
    return null;
  }

  const defaultOptions = {
    icon: '/tpp-logo.png',
    badge: '/tpp-logo.png',
    tag: 'tpp-notification',
    requireInteraction: false,
    silent: false
  };

  const notification = new Notification(title, { ...defaultOptions, ...options });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  return notification;
}

/**
 * Check if notifications are working as PWA notifications
 * This is the main function to call to verify PWA notification functionality
 */
export async function verifyPWANotifications() {
  console.log('🔔 Testing PWA Notification Functionality...');
  
  const results = await testPWANotifications();
  
  console.log('📊 PWA Notification Test Results:', results);
  
  if (results.errors.length > 0) {
    console.error('❌ PWA Notification Issues:', results.errors);
  }
  
  if (results.recommendations.length > 0) {
    console.log('💡 Recommendations:', results.recommendations);
  }

  // Summary
  const isWorking = results.serviceWorkerSupported && 
                   results.notificationAPISupported && 
                   results.canShowNotifications && 
                   results.errors.length === 0;

  if (isWorking) {
    console.log('✅ PWA Notifications are properly configured and working!');
  } else {
    console.log('⚠️ PWA Notifications need attention. See details above.');
  }

  return {
    isWorking,
    results
  };
}

// Make functions available globally for testing
if (typeof window !== 'undefined') {
  window.testPWANotifications = testPWANotifications;
  window.requestNotificationPermission = requestNotificationPermission;
  window.showPWANotification = showPWANotification;
  window.verifyPWANotifications = verifyPWANotifications;
}
