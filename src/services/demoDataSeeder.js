/**
 * Cloud-based sample data seeding service
 * Seeds sample data directly to Firestore on new user signup
 * This replaces the fragile localStorage-based approach
 */

import { db } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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
    
    // SAFETY CHECK: Verify no real user data exists before adding sample data
    const vendorsRaw = localStorage.getItem('tpprover_vendors');
    const ordersRaw = localStorage.getItem('tpprover_orders');
    const protocolsRaw = localStorage.getItem('tpprover_protocols');
    
    const hasRealData = [vendorsRaw, ordersRaw, protocolsRaw].some(r => {
      try { 
        const data = JSON.parse(r);
        return Array.isArray(data) && data.some(item => !item.isMock);
      } catch { 
        return false 
      }
    });
    
    if (hasRealData) {
      console.log('❌ Cannot add sample data: User has real data that would be affected');
      throw new Error('Cannot add sample data when you have existing data. Please remove your existing data first if you want to start with sample data.');
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
     
     // 🚀 OPTIMISTIC UI: Seed to localStorage FIRST for instant display on reload
     try {
       localStorage.setItem('tpprover_vendors', JSON.stringify(cleanedSampleData.vendors));
       localStorage.setItem('tpprover_orders', JSON.stringify(cleanedSampleData.orders));
       localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(cleanedSampleData.scheduledBuys));
       localStorage.setItem('tpprover_protocols', JSON.stringify(cleanedSampleData.protocols));
       localStorage.setItem('tpprover_supplements', JSON.stringify(cleanedSampleData.supplements));
       localStorage.setItem('tpprover_recon_items', JSON.stringify(cleanedSampleData.reconItems));
       localStorage.setItem('tpprover_metrics', JSON.stringify(cleanedSampleData.metrics));
       localStorage.setItem('tpprover_calendar_notes', JSON.stringify(cleanedSampleData.calendarNotes));
       localStorage.setItem('tpprover_stockpile', JSON.stringify(cleanedSampleData.stockpile));
       localStorage.setItem('tpprover_sample_seeded_at', new Date().toISOString());
       console.log('⚡ Sample data seeded to localStorage for instant display');
     } catch (localError) {
       console.error('❌ Failed to seed to localStorage:', localError);
     }
     
     // Save to Firestore under user's userData collection (for cloud backup)
     const userDataRef = doc(db, 'userData', userId);
     await setDoc(userDataRef, cleanedSampleData, { merge: true });
     
     console.log('✅ Sample data successfully seeded to Firestore (cloud backup)');
     console.log(`📦 Total items: ${Object.values(cleanedSampleData._metadata.itemCount).reduce((a, b) => a + b, 0)}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to seed sample data to Firestore:', error);
    
    // Fallback to localStorage if Firestore fails (offline mode)
    console.log('🔄 Falling back to localStorage seeding...');
    try {
      const { seedInitialData } = await import('../utils/seed');
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

