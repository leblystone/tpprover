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
        console.log(`📊 ${issue.type.toUpperCase()}:`, {
          total: issue.total,
          mock: issue.mock,
          real: issue.real,
          ...(issue.active !== undefined && { active: issue.active })
        });
        
        if (issue.details) {
          console.log(`   Mock data:`, issue.details.mockOrders);
          console.log(`   Active orders:`, issue.details.activeOrders);
        }
      }
    });
    
    return diagnosis;
  };
  
  window.fixDashboardData = (autoRefresh = false) => {
    const result = fixDataInconsistencies();
    console.log('🔧 Dashboard Data Fix Result:', result);
    
    if (result.success) {
      console.log('✅ Mock data cleared successfully!');
      
      if (autoRefresh) {
        console.log('🔄 Refreshing page to show updated data...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        console.log('💡 Refresh the page manually to see updated data, or run fixDashboardData(true) to auto-refresh');
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
    
    console.log('🗄️ TPP LocalStorage Data:', data);
    return data;
  };

  window.clearAllTPPData = () => {
    if (confirm('⚠️ This will delete ALL your TPP data. Are you sure?')) {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('tpprover_'));
      keys.forEach(key => localStorage.removeItem(key));
      console.log('🗑️ All TPP data cleared. Refreshing page...');
      window.location.reload();
    }
  };

  // Trial testing utilities
  window.createTrialSubscription = (days = 7) => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + days);
    
    const trialSubscription = {
      id: `trial_${Date.now()}`,
      plan: 'Pro Monthly (7-Day Trial)',
      price: 6.00,
      interval: 'month',
      currency: 'USD',
      status: 'trialing',
      startedAt: now.toISOString(),
      currentPeriodEnd: end.toISOString(),
      paymentMethod: null,
      subscriptionId: `trial_${Date.now()}`
    };
    
    localStorage.setItem('tpprover_subscription', JSON.stringify(trialSubscription));
    console.log(`🎭 Created ${days}-day trial subscription:`, trialSubscription);
    console.log('🔄 Refresh the page to see the trial in action');
    
    return trialSubscription;
  };

  window.createExpiredTrial = () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 8); // Started 8 days ago
    const end = new Date(start);
    end.setDate(end.getDate() + 7); // Ended 1 day ago
    
    const expiredTrial = {
      id: `expired_trial_${Date.now()}`,
      plan: 'Pro Monthly (7-Day Trial)',
      price: 6.00,
      interval: 'month',
      currency: 'USD',
      status: 'trialing',
      startedAt: start.toISOString(),
      currentPeriodEnd: end.toISOString(),
      paymentMethod: null,
      subscriptionId: `expired_trial_${Date.now()}`
    };
    
    localStorage.setItem('tpprover_subscription', JSON.stringify(expiredTrial));
    console.log('⏰ Created expired trial subscription:', expiredTrial);
    console.log('🔄 Refresh the page to see the expired trial state');
    
    return expiredTrial;
  };

  window.clearSubscription = () => {
    localStorage.removeItem('tpprover_subscription');
    console.log('🗑️ Subscription cleared. Refresh the page to see the no-subscription state');
  };

  window.getCurrentSubscription = () => {
    try {
      const sub = JSON.parse(localStorage.getItem('tpprover_subscription') || 'null');
      console.log('📋 Current subscription:', sub);
      return sub;
    } catch (error) {
      console.log('❌ No subscription found or error reading:', error);
      return null;
    }
  };

  // Log that debug functions are available
  console.log('🛠️ TPP Debug functions loaded:');
  console.log('   - debugDashboardData() - Diagnose data issues');
  console.log('   - fixDashboardData() - Clean up mock/demo data (no auto-refresh)');
  console.log('   - fixDashboardData(true) - Clean up mock/demo data with auto-refresh');
  console.log('   - inspectLocalStorage() - View all stored data');
  console.log('   - clearAllTPPData() - Clear all data (with confirmation)');
  console.log('🎭 Trial Testing Functions:');
  console.log('   - createTrialSubscription(days) - Create a trial subscription (default 7 days)');
  console.log('   - createExpiredTrial() - Create an expired trial for testing');
  console.log('   - clearSubscription() - Remove current subscription');
  console.log('   - getCurrentSubscription() - View current subscription details');
}

export { diagnoseDashboardData, fixDataInconsistencies };
