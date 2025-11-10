import { clearMockData } from './seed.js';

/**
 * Diagnose data inconsistencies between dashboard widgets and their data sources
 */
export function diagnoseDashboardData() {
  const issues = [];
  
  try {
    // Check orders data
    const ordersRaw = localStorage.getItem('tpprover_orders');
    const orders = ordersRaw ? JSON.parse(ordersRaw) : [];
    
    const mockOrders = orders.filter(o => o.isMock);
    const realOrders = orders.filter(o => !o.isMock);
    const activeOrders = orders.filter(o => {
      const status = (o.status || '').toLowerCase();
      return !status.includes('delivered');
    });
    
    issues.push({
      type: 'orders',
      total: orders.length,
      mock: mockOrders.length,
      real: realOrders.length,
      active: activeOrders.length,
      details: {
        mockOrders: mockOrders.map(o => ({ id: o.id, status: o.status, items: o.items?.map(i => i.name) })),
        activeOrders: activeOrders.map(o => ({ id: o.id, status: o.status, items: o.items?.map(i => i.name) }))
      }
    });

    // Check vendors data
    const vendorsRaw = localStorage.getItem('tpprover_vendors');
    const vendors = vendorsRaw ? JSON.parse(vendorsRaw) : [];
    
    const mockVendors = vendors.filter(v => v.isMock);
    const realVendors = vendors.filter(v => !v.isMock);
    
    issues.push({
      type: 'vendors',
      total: vendors.length,
      mock: mockVendors.length,
      real: realVendors.length
    });

    // Check stockpile data
    const stockpileRaw = localStorage.getItem('tpprover_stockpile');
    const stockpile = stockpileRaw ? JSON.parse(stockpileRaw) : [];
    
    const mockStockpile = stockpile.filter(s => s.isMock);
    const realStockpile = stockpile.filter(s => !s.isMock);
    
    issues.push({
      type: 'stockpile',
      total: stockpile.length,
      mock: mockStockpile.length,
      real: realStockpile.length
    });

  } catch (error) {
    issues.push({
      type: 'error',
      message: 'Failed to diagnose data: ' + error.message
    });
  }
  
  return issues;
}

/**
 * Clean up data inconsistencies by removing all mock data
 */
export function fixDataInconsistencies() {
  try {
    // First, diagnose the issues
    const beforeIssues = diagnoseDashboardData();
    console.log('🔍 Data before cleanup:', beforeIssues);
    
    // Clear all mock data
    clearMockData();
    
    // Mark that demo data has been cleared to prevent re-seeding
    localStorage.setItem('tpprover_sample_data_cleared', 'true');
    try { localStorage.removeItem('tpprover_demo_data_cleared'); } catch {}
    
    // Diagnose again to confirm cleanup
    const afterIssues = diagnoseDashboardData();
    console.log('✅ Data after cleanup:', afterIssues);
    
    return {
      success: true,
      before: beforeIssues,
      after: afterIssues,
      message: 'Mock data cleared successfully. Dashboard should now show consistent data.'
    };
    
  } catch (error) {
    console.error('❌ Failed to fix data inconsistencies:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if user has mixed mock and real data that could cause confusion
 */
export function hasDataInconsistencies() {
  try {
    const diagnosis = diagnoseDashboardData();
    
    // Look for cases where user has mock data mixed with real data
    return diagnosis.some(issue => 
      issue.type !== 'error' && 
      issue.mock > 0 && 
      issue.real > 0
    );
  } catch (error) {
    return false;
  }
}
