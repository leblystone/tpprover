import { fixDataInconsistencies, diagnoseDashboardData } from './dataCleanup.js';

/**
 * Global debug utilities for troubleshooting dashboard data issues
 * These functions are exposed to the browser console for easy debugging
 */

// Expose debug functions globally
if (typeof window !== 'undefined') {
  window.debugDashboardData = () => {
    const diagnosis = diagnoseDashboardData();
    console.log('🔍 Dashboard Data Diagnosis:', diagnosis);
    
    // Pretty print the results
    diagnosis.forEach(issue => {
      if (issue.type === 'error') {
        console.error(`❌ ${issue.message}`);
      } else {
        // Debug info available via devLog if needed
      }
    });
    
    return diagnosis;
  };
  
  window.fixDashboardData = (autoRefresh = false) => {
    const result = fixDataInconsistencies();
    
    if (result.success) {
      
      if (autoRefresh) {
        setTimeout(() => window.location.reload(), 1000);
      } else {
      }
    } else {
      console.error('❌ Failed to fix data:', result.error);
    }
    
    return result;
  };

  // Additional debug utilities
  window.inspectLocalStorage = () => {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('tpprover_'));
    const data = {};
    
    keys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        data[key] = JSON.parse(value);
      } catch (error) {
        data[key] = localStorage.getItem(key); // Keep as string if not JSON
      }
    });
    
    return data;
  };

  window.clearAllTPPData = () => {
    if (confirm('⚠️ This will delete ALL your TPP data. Are you sure?')) {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('tpprover_'));
      keys.forEach(key => localStorage.removeItem(key));
      window.location.reload();
    }
  };

  // Lab Access testing utilities
  window.createLabAccessSubscription = (days = 7) => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + days);
    
    const labAccessSubscription = {
      id: `lab_access_${Date.now()}`,
      plan: 'Pro Monthly (7-Day Lab Access)',
      price: 6.00,
      interval: 'month',
      currency: 'USD',
      status: 'lab_access',
      startedAt: now.toISOString(),
      currentPeriodEnd: end.toISOString(),
      paymentMethod: null,
      subscriptionId: `lab_access_${Date.now()}`
    };
    
    localStorage.setItem('tpprover_subscription', JSON.stringify(labAccessSubscription));
    console.log(`🧪 Created ${days}-day lab access subscription:`, labAccessSubscription);
    
    return labAccessSubscription;
  };

  window.createExpiredLabAccess = () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 8); // Started 8 days ago
    const end = new Date(start);
    end.setDate(end.getDate() + 7); // Ended 1 day ago
    
    const expiredLabAccess = {
      id: `expired_lab_access_${Date.now()}`,
      plan: 'Pro Monthly (7-Day Lab Access)',
      price: 6.00,
      interval: 'month',
      currency: 'USD',
      status: 'lab_access',
      startedAt: start.toISOString(),
      currentPeriodEnd: end.toISOString(),
      paymentMethod: null,
      subscriptionId: `expired_lab_access_${Date.now()}`
    };
    
    localStorage.setItem('tpprover_subscription', JSON.stringify(expiredLabAccess));
    console.log('⏰ Created expired lab access subscription:', expiredLabAccess);
    
    return expiredLabAccess;
  };

  window.clearSubscription = () => {
    localStorage.removeItem('tpprover_subscription');
  };

  window.getCurrentSubscription = () => {
    try {
      const sub = JSON.parse(localStorage.getItem('tpprover_subscription') || 'null');
      console.log('📋 Current subscription:', sub);
      return sub;
    } catch (error) {
      return null;
    }
  };

  // Load PWA notification testing utilities
  import('./notificationTest.js').then(({ verifyPWANotifications, testPWANotifications, requestNotificationPermission, showPWANotification }) => {
    window.verifyPWANotifications = verifyPWANotifications;
    window.testPWANotifications = testPWANotifications;
    window.requestNotificationPermission = requestNotificationPermission;
    window.showPWANotification = showPWANotification;
  }).catch(err => {
    console.warn('Failed to load notification test utilities:', err);
  });

  // Load PWA notification service
  import('../services/pwaNotifications.js').then(({ default: pwaService }) => {
    window.pwaNotificationService = pwaService;
    window.testPWAService = () => pwaService.test();
    window.enablePWANotifications = () => pwaService.enable();
    window.disablePWANotifications = () => pwaService.disable();
    window.getPWAStatus = () => pwaService.getStatus();
  }).catch(err => {
    console.warn('Failed to load PWA notification service:', err);
  });

  // Log that debug functions are available
  console.log('   - debugDashboardData() - Diagnose data issues');
  console.log('   - fixDashboardData() - Clean up mock/demo data (no auto-refresh)');
  console.log('   - fixDashboardData(true) - Clean up mock/demo data with auto-refresh');
  console.log('   - inspectLocalStorage() - View all stored data');
  console.log('   - clearAllTPPData() - Clear all data (with confirmation)');
  console.log('🧪 Lab Access Testing Functions:');
  console.log('   - createLabAccessSubscription(days) - Create a lab access subscription (default 7 days)');
  console.log('   - createExpiredLabAccess() - Create an expired lab access for testing');
  console.log('   - clearSubscription() - Remove current subscription');
  console.log('   - getCurrentSubscription() - View current subscription details');
  console.log('🔔 PWA Notification Testing Functions:');
  console.log('   - verifyPWANotifications() - Test if PWA notifications are working properly');
  console.log('   - testPWANotifications() - Run detailed PWA notification tests');
  console.log('   - requestNotificationPermission() - Request notification permission from user');
  console.log('   - showPWANotification(title, options) - Show a test PWA notification');
  console.log('   - testPWAService() - Test the PWA notification service');
  console.log('   - enablePWANotifications() - Enable PWA notifications');
  console.log('   - disablePWANotifications() - Disable PWA notifications');
  console.log('   - getPWAStatus() - Get current PWA notification status');
}

export { diagnoseDashboardData, fixDataInconsistencies };
