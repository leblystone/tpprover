/**
 * Cloud-based sample data seeding service
 * Seeds sample data directly to Firestore on new user signup
 * This replaces the fragile localStorage-based approach
 */

import { db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { loadUserState, saveUserState } from './cloudStorage';
import { 
  MOCK_VENDORS, 
  MOCK_ORDERS, 
  MOCK_SCHEDULED_BUYS, 
  MOCK_PROTOCOLS,
  MOCK_SUPPLEMENTS,
  MOCK_RECON_ITEMS,
  MOCK_METRICS,
  MOCK_NOTES
} from '../utils/seed';

/**
 * Seeds sample data directly to Firestore for a new user
 * @param {string} userId - Firebase user ID
 * @param {string} password - User password for encryption
 * @returns {Promise<boolean>} - Success status
 */
export async function seedSampleDataToCloud(userId, password) {
  try {
    console.log('☁️ Adding sample data (OPTIMISTIC: localStorage + Firestore)');
    
    // SAFETY CHECK: Only prevent AUTO-adding sample data if user explicitly cleared it
    // But allow manual seeding from Settings page (flag will be cleared before calling this)
    const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared') === 'true';
    
    if (sampleDataCleared) {
      // User has explicitly cleared sample data - this prevents auto-seeding
      // But if called manually from Settings, the flag should be cleared first
      console.log('ℹ️ Sample data previously cleared by user - skipping auto-seed');
      throw new Error('Sample data was previously removed. Please refresh the page and try again if you want to add sample data.');
    }
    
     // Create the sample dataset - clean any undefined values
     const sampleData = {
       vendors: MOCK_VENDORS,
       orders: MOCK_ORDERS,
       scheduledBuys: MOCK_SCHEDULED_BUYS,
       protocols: MOCK_PROTOCOLS,
       supplements: MOCK_SUPPLEMENTS,
       reconItems: MOCK_RECON_ITEMS,
       reconHistory: [], // Start with empty history
       metrics: MOCK_METRICS,
       calendarNotes: MOCK_NOTES,
       stockpile: generateStockpileFromOrders(MOCK_ORDERS),
       
       // Metadata
       _metadata: {
         isSampleData: true,
         seededAt: new Date().toISOString(),
         version: '2.1', // Track sample data version - streamlined
         itemCount: {
           vendors: MOCK_VENDORS.length,
           orders: MOCK_ORDERS.length,
           protocols: MOCK_PROTOCOLS.length,
           supplements: MOCK_SUPPLEMENTS.length,
           reconItems: MOCK_RECON_ITEMS.length,
           metrics: MOCK_METRICS.length
         }
       }
     };
     
     // Clean any undefined values that could cause Firebase errors
     const cleanData = (obj) => {
       if (obj === null || obj === undefined) return null;
       if (typeof obj !== 'object') return obj;
       if (Array.isArray(obj)) {
         return obj.map(cleanData).filter(item => item !== undefined);
       }
       const cleaned = {};
       for (const [key, value] of Object.entries(obj)) {
         if (value !== undefined) {
           cleaned[key] = cleanData(value);
         }
       }
       return cleaned;
     };
     
     const cleanedSampleData = cleanData(sampleData);
    
     console.log('📊 Sample data prepared:', cleanedSampleData._metadata.itemCount);
     
     // 🚀 OPTIMISTIC UI: Merge sample data with existing data in localStorage
     try {
       // Helper function to merge arrays, avoiding duplicates
       const mergeArrays = (existing, newItems, keyField = 'id') => {
         if (!existing || !Array.isArray(existing)) return newItems;
         const existingIds = new Set(existing.map(item => item[keyField]));
         const uniqueNewItems = newItems.filter(item => !existingIds.has(item[keyField]));
         return [...existing, ...uniqueNewItems];
       };
       
       // Merge vendors
       const existingVendors = JSON.parse(localStorage.getItem('tpprover_vendors') || '[]');
       const mergedVendors = mergeArrays(existingVendors, cleanedSampleData.vendors);
       localStorage.setItem('tpprover_vendors', JSON.stringify(mergedVendors));
       
       // Merge orders
       const existingOrders = JSON.parse(localStorage.getItem('tpprover_orders') || '[]');
       const mergedOrders = mergeArrays(existingOrders, cleanedSampleData.orders);
       localStorage.setItem('tpprover_orders', JSON.stringify(mergedOrders));
       
       // Merge scheduled buys
       const existingScheduledBuys = JSON.parse(localStorage.getItem('tpprover_scheduled_buys') || '[]');
       const mergedScheduledBuys = mergeArrays(existingScheduledBuys, cleanedSampleData.scheduledBuys);
       localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(mergedScheduledBuys));
       
       // Merge protocols
       const existingProtocols = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]');
       const mergedProtocols = mergeArrays(existingProtocols, cleanedSampleData.protocols);
       localStorage.setItem('tpprover_protocols', JSON.stringify(mergedProtocols));
       
       // Merge supplements
       const existingSupplements = JSON.parse(localStorage.getItem('tpprover_supplements') || '[]');
       const mergedSupplements = mergeArrays(existingSupplements, cleanedSampleData.supplements);
       localStorage.setItem('tpprover_supplements', JSON.stringify(mergedSupplements));
       
       // Merge recon items
       const existingReconItems = JSON.parse(localStorage.getItem('tpprover_recon_items') || '[]');
       const mergedReconItems = mergeArrays(existingReconItems, cleanedSampleData.reconItems);
       localStorage.setItem('tpprover_recon_items', JSON.stringify(mergedReconItems));
       
       // Merge metrics
       const existingMetrics = JSON.parse(localStorage.getItem('tpprover_metrics') || '[]');
       const mergedMetrics = mergeArrays(existingMetrics, cleanedSampleData.metrics);
       localStorage.setItem('tpprover_metrics', JSON.stringify(mergedMetrics));
       
       // Merge calendar notes (object merge)
       const existingCalendarNotes = JSON.parse(localStorage.getItem('tpprover_calendar_notes') || '{}');
       const mergedCalendarNotes = { ...existingCalendarNotes, ...cleanedSampleData.calendarNotes };
       localStorage.setItem('tpprover_calendar_notes', JSON.stringify(mergedCalendarNotes));
       
       // Merge stockpile
       const existingStockpile = JSON.parse(localStorage.getItem('tpprover_stockpile') || '[]');
       const mergedStockpile = mergeArrays(existingStockpile, cleanedSampleData.stockpile);
       localStorage.setItem('tpprover_stockpile', JSON.stringify(mergedStockpile));
       
       localStorage.setItem('tpprover_sample_seeded_at', new Date().toISOString());
       console.log('⚡ Sample data merged with existing data in localStorage');
     } catch (localError) {
       console.error('❌ Failed to seed to localStorage:', localError);
     }
     
     // Save to Firestore under user's userData collection (for cloud backup)
     const userDataRef = doc(db, 'userData', userId);
     await setDoc(userDataRef, cleanedSampleData, { merge: true });
     
    console.log('✅ Sample data successfully seeded to Firestore (cloud backup)');
    console.log(`📦 Total items: ${Object.values(cleanedSampleData._metadata.itemCount).reduce((a, b) => a + b, 0)}`);

    try {
      const statusTimestamp = new Date().toISOString();
      try { localStorage.removeItem('tpprover_sample_data_cleared'); } catch {}
      try { localStorage.setItem('tpprover_sample_data_cleared_at', statusTimestamp); } catch {}
      try { localStorage.removeItem('tpprover_demo_data_cleared'); } catch {}
      const currentState = await loadUserState(userId) || {};
      await saveUserState(userId, { 
        ...currentState, 
        sampleDataCleared: false, 
        sampleDataClearedAt: statusTimestamp 
      });
      console.log('☁️ Sample data status reset to active in cloud state');
    } catch (stateError) {
      console.warn('⚠️ Sample data seeded but failed to update state metadata:', stateError);
    }
    
    return true;
  } catch (error) {
    // Expected error if user cleared sample data - only log as warning
    if (error.message.includes('previously removed')) {
      console.log('ℹ️ Sample data seeding skipped (user preference)');
    } else {
      console.warn('⚠️ Failed to seed sample data to Firestore:', error.message);
    }
    
    // Fallback to localStorage if Firestore fails (offline mode)
    console.log('🔄 Falling back to localStorage seeding...');
    try {
      const { seedInitialData } = await import('../utils/seed');
      const fallbackTimestamp = new Date().toISOString();
      try { localStorage.removeItem('tpprover_sample_data_cleared'); } catch {}
      try { localStorage.setItem('tpprover_sample_data_cleared_at', fallbackTimestamp); } catch {}
      try { localStorage.removeItem('tpprover_demo_data_cleared'); } catch {}
      seedInitialData();
      return true;
    } catch (fallbackError) {
      console.error('❌ Fallback seeding also failed:', fallbackError);
      return false;
    }
  }
}

/**
 * Generate stockpile items from delivered orders
 * @param {Array} orders - Array of order objects
 * @returns {Array} - Array of stockpile items
 */
function generateStockpileFromOrders(orders) {
  const stockpile = [];
  
  orders.forEach(order => {
    if ((order.status || '').toLowerCase() === 'delivered') {
      const newItems = (order.items || []).map((item, idx) => ({
        id: `demo-stock-${order.id}-${idx}`,
        name: item.name,
        mg: item.mg,
        quantity: item.quantity,
        vendorId: order.vendorId,
        purchaseDate: order.date,
        notes: `From demo order #${order.id}`,
        orderId: order.id,
        isMock: true,
      }));
      stockpile.push(...newItems);
    }
  });
  
  console.log(`📦 Generated ${stockpile.length} stockpile items from ${orders.length} orders`);
  return stockpile;
}

/**
 * Check if user has sample data in Firestore
 * @param {string} userId - Firebase user ID
 * @returns {Promise<boolean>} - Whether user has sample data
 */
export async function hasSampleData(userId) {
  try {
    const userDataRef = doc(db, 'userData', userId);
    const snapshot = await getDoc(userDataRef);
    
    if (!snapshot.exists()) return false;
    
    const data = snapshot.data();
    return data._metadata?.isSampleData === true;
  } catch (error) {
    console.error('Error checking for sample data:', error);
    return false;
  }
}

/**
 * Alias for seedSampleDataToCloud for backward compatibility
 * @param {string} userId - Firebase user ID
 * @param {string} password - User password for encryption
 * @returns {Promise<boolean>} - Success status
 */
export const seedDemoDataToCloud = seedSampleDataToCloud;

