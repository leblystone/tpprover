/**
 * Cloud-based demo data seeding service
 * Seeds demo data directly to Firestore on new user signup
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
 * Seeds demo data directly to Firestore for a new user
 * @param {string} userId - Firebase user ID
 * @param {string} password - User password for encryption
 * @returns {Promise<boolean>} - Success status
 */
export async function seedDemoDataToCloud(userId, password) {
  try {
    console.log('☁️ Seeding demo data (OPTIMISTIC: localStorage + Firestore)');
    
    // Create the demo dataset
    const demoData = {
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
        isDemoData: true,
        seededAt: new Date().toISOString(),
        version: '2.0', // Track demo data version
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
    
    console.log('📊 Demo data prepared:', demoData._metadata.itemCount);
    
    // 🚀 OPTIMISTIC UI: Seed to localStorage FIRST for instant display on reload
    try {
      localStorage.setItem('tpprover_vendors', JSON.stringify(demoData.vendors));
      localStorage.setItem('tpprover_orders', JSON.stringify(demoData.orders));
      localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(demoData.scheduledBuys));
      localStorage.setItem('tpprover_protocols', JSON.stringify(demoData.protocols));
      localStorage.setItem('tpprover_supplements', JSON.stringify(demoData.supplements));
      localStorage.setItem('tpprover_recon_items', JSON.stringify(demoData.reconItems));
      localStorage.setItem('tpprover_metrics', JSON.stringify(demoData.metrics));
      localStorage.setItem('tpprover_calendar_notes', JSON.stringify(demoData.calendarNotes));
      localStorage.setItem('tpprover_stockpile', JSON.stringify(demoData.stockpile));
      localStorage.setItem('tpprover_demo_seeded_at', new Date().toISOString());
      console.log('⚡ Demo data seeded to localStorage for instant display');
    } catch (localError) {
      console.error('❌ Failed to seed to localStorage:', localError);
    }
    
    // Save to Firestore under user's userData collection (for cloud backup)
    const userDataRef = doc(db, 'userData', userId);
    await setDoc(userDataRef, demoData, { merge: true });
    
    console.log('✅ Demo data successfully seeded to Firestore (cloud backup)');
    console.log(`📦 Total items: ${Object.values(demoData._metadata.itemCount).reduce((a, b) => a + b, 0)}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to seed demo data to Firestore:', error);
    
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
 * Check if user has demo data in Firestore
 * @param {string} userId - Firebase user ID
 * @returns {Promise<boolean>} - Whether user has demo data
 */
export async function hasDemoData(userId) {
  try {
    const userDataRef = doc(db, 'userData', userId);
    const snapshot = await getDoc(userDataRef);
    
    if (!snapshot.exists()) return false;
    
    const data = snapshot.data();
    return data._metadata?.isDemoData === true;
  } catch (error) {
    console.error('Error checking for demo data:', error);
    return false;
  }
}

