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

  // Log that debug functions are available
  console.log('🛠️ TPP Debug functions loaded:');
  console.log('   - debugDashboardData() - Diagnose data issues');
  console.log('   - fixDashboardData() - Clean up mock/demo data (no auto-refresh)');
  console.log('   - fixDashboardData(true) - Clean up mock/demo data with auto-refresh');
  console.log('   - inspectLocalStorage() - View all stored data');
  console.log('   - clearAllTPPData() - Clear all data (with confirmation)');
}

export { diagnoseDashboardData, fixDataInconsistencies };
