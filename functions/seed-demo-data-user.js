#!/usr/bin/env node
/**
 * Script to seed demo/sample data to a specific user in Firestore for testing
 * 
 * Usage: cd functions && node seed-demo-data-user.js <userId>
 * 
 * Example: cd functions && node seed-demo-data-user.js KROrMSV0EkfOlh75km8XwW1qUAS2
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Try to load .env file if it exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// Get project ID from .firebaserc or env
let projectId = process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) {
  try {
    const firebasercPath = path.join(__dirname, '..', '.firebaserc');
    if (fs.existsSync(firebasercPath)) {
      const firebaserc = JSON.parse(fs.readFileSync(firebasercPath, 'utf8'));
      projectId = firebaserc.projects?.default;
    }
  } catch (error) {
    // Ignore errors reading .firebaserc
  }
}

// Initialize Firebase Admin - use same approach as other scripts
if (!admin.apps.length) {
  // Try to use service account if available
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id
      });
    } catch (error) {
      console.warn('⚠️  Could not load service account from GOOGLE_APPLICATION_CREDENTIALS, trying default init...');
      admin.initializeApp(projectId ? { projectId } : {});
    }
  } else {
    // Use default initialization with project ID if available
    admin.initializeApp(projectId ? { projectId } : {});
  }
}

const db = admin.firestore();

/**
 * Generate mock vendors
 */
function generateMockVendors() {
  return [
    {
      id: 'demo-vendor-1',
      name: 'Research Lab: Discovery Peptides',
      rating: 4.5,
      notes: 'Excellent quality, fast shipping',
      isMock: true
    },
    {
      id: 'demo-vendor-2',
      name: 'ResearchLabs Pro',
      rating: 4.8,
      notes: 'Premium peptides, great customer service',
      isMock: true
    },
    {
      id: 'demo-vendor-3',
      name: 'Peptide Research Co',
      rating: 4.2,
      notes: 'Good prices, reliable',
      isMock: true
    },
    {
      id: 'demo-vendor-4',
      name: 'BioTech Solutions',
      rating: 4.6,
      notes: 'High purity products',
      isMock: true
    }
  ];
}

/**
 * Generate mock orders
 */
function generateMockOrders() {
  const now = new Date();
  return [
    {
      id: 'demo-order-001',
      vendorId: 'demo-vendor-1',
      date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Delivered',
      items: [
        { name: 'KPV', mg: 5, quantity: 2 },
        { name: 'Semaglutide', mg: 5, quantity: 1 }
      ],
      isMock: true
    },
    {
      id: 'demo-order-002',
      vendorId: 'demo-vendor-2',
      date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Delivered',
      items: [
        { name: 'BPC-157', mg: 5, quantity: 3 },
        { name: 'GHRP-2', mg: 5, quantity: 2 }
      ],
      isMock: true
    },
    {
      id: 'demo-order-003',
      vendorId: 'demo-vendor-3',
      date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'In Transit',
      items: [
        { name: 'Tirzepatide', mg: 10, quantity: 1 }
      ],
      isMock: true
    }
  ];
}

/**
 * Generate mock protocols
 */
function generateMockProtocols() {
  return [
    {
      id: 'demo-protocol-1',
      protocolName: 'GHRP-2 / GHRP-6 Peptide Stack',
      peptide: 'GHRP-2',
      dosage: '200mcg',
      frequency: 'Daily',
      isMock: true
    },
    {
      id: 'demo-protocol-2',
      protocolName: 'BPC-157 Recovery Protocol',
      peptide: 'BPC-157',
      dosage: '250mcg',
      frequency: 'Twice daily',
      isMock: true
    },
    {
      id: 'demo-protocol-3',
      protocolName: 'Thymalin + Epithalon',
      peptide: 'Thymalin',
      dosage: '10mg',
      frequency: 'Weekly',
      isMock: true
    }
  ];
}

/**
 * Generate mock supplements
 */
function generateMockSupplements() {
  return [
    {
      id: 'demo-supplement-1',
      name: 'Vitamin D3',
      dosage: '5000 IU',
      frequency: 'Daily',
      isMock: true
    },
    {
      id: 'demo-supplement-2',
      name: 'Magnesium',
      dosage: '400mg',
      frequency: 'Daily',
      isMock: true
    }
  ];
}

/**
 * Generate mock recon items
 */
function generateMockReconItems() {
  return [
    {
      id: 'demo-recon-1',
      item: 'KPV',
      reconDate: new Date().toISOString().split('T')[0],
      isMock: true
    },
    {
      id: 'demo-recon-2',
      item: 'BPC-157',
      reconDate: new Date().toISOString().split('T')[0],
      isMock: true
    }
  ];
}

/**
 * Generate mock metrics
 */
function generateMockMetrics() {
  return [
    {
      id: 'demo-metric-1',
      name: 'Body Weight',
      value: '180',
      unit: 'lbs',
      date: new Date().toISOString().split('T')[0],
      isMock: true
    },
    {
      id: 'demo-metric-2',
      name: 'Body Fat %',
      value: '15',
      unit: '%',
      date: new Date().toISOString().split('T')[0],
      isMock: true
    }
  ];
}

/**
 * Generate mock scheduled buys
 */
function generateMockScheduledBuys() {
  return [
    {
      id: 'demo-buy-1',
      title: 'Upcoming Founder Welcome Webinar',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isMock: true
    },
    {
      id: 'demo-buy-2',
      title: 'Community Round',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isMock: true
    }
  ];
}

/**
 * Generate mock calendar notes
 */
function generateMockCalendarNotes() {
  const today = new Date().toISOString().split('T')[0];
  return {
    [today]: {
      text: 'Demo data demonstrates the power of systematic peptide research tracking. All protocols optimized and documented.',
      isMock: true
    }
  };
}

/**
 * Generate stockpile from orders
 */
function generateStockpileFromOrders(orders) {
  const stockpile = [];
  orders.forEach(order => {
    if ((order.status || '').toLowerCase() === 'delivered') {
      order.items.forEach((item, idx) => {
        stockpile.push({
          id: `demo-stock-${order.id}-${idx}`,
          name: item.name,
          mg: item.mg,
          quantity: item.quantity,
          vendorId: order.vendorId,
          purchaseDate: order.date,
          notes: `From demo order #${order.id}`,
          orderId: order.id,
          isMock: true
        });
      });
    }
  });
  return stockpile;
}

/**
 * Main function to seed demo data for a specific user
 */
async function seedDemoDataForUser(userId) {
  console.log(`\n🌱 SEEDING DEMO DATA FOR USER: ${userId}\n`);
  console.log('='.repeat(60));

  try {
    // Check if user document exists
    const userDataRef = db.collection('userData').doc(userId);
    const userDataSnap = await userDataRef.get();
    
    const existingData = userDataSnap.exists ? userDataSnap.data() : {};
    
    console.log('\n📊 Current data summary:');
    console.log(`  Protocols: ${existingData.protocols?.length || 0}`);
    console.log(`  Orders: ${existingData.orders?.length || 0}`);
    console.log(`  Vendors: ${existingData.vendors?.length || 0}`);
    console.log(`  Stockpile: ${existingData.stockpile?.length || 0}`);

    // Generate demo data
    const mockVendors = generateMockVendors();
    const mockOrders = generateMockOrders();
    const mockProtocols = generateMockProtocols();
    const mockSupplements = generateMockSupplements();
    const mockReconItems = generateMockReconItems();
    const mockMetrics = generateMockMetrics();
    const mockScheduledBuys = generateMockScheduledBuys();
    const mockCalendarNotes = generateMockCalendarNotes();
    const mockStockpile = generateStockpileFromOrders(mockOrders);

    // Merge with existing data (avoid duplicates)
    const mergeArrays = (existing, newItems, keyField = 'id') => {
      if (!existing || !Array.isArray(existing)) return newItems;
      const existingIds = new Set(existing.map(item => item[keyField]));
      const uniqueNewItems = newItems.filter(item => !existingIds.has(item[keyField]));
      return [...existing, ...uniqueNewItems];
    };

    const demoData = {
      vendors: mergeArrays(existingData.vendors, mockVendors),
      orders: mergeArrays(existingData.orders, mockOrders),
      protocols: mergeArrays(existingData.protocols, mockProtocols),
      supplements: mergeArrays(existingData.supplements, mockSupplements),
      reconItems: mergeArrays(existingData.reconItems, mockReconItems),
      metrics: mergeArrays(existingData.metrics, mockMetrics),
      scheduledBuys: mergeArrays(existingData.scheduledBuys, mockScheduledBuys),
      stockpile: mergeArrays(existingData.stockpile, mockStockpile),
      calendarNotes: { ...existingData.calendarNotes, ...mockCalendarNotes },
      _metadata: {
        ...existingData._metadata,
        isSampleData: true,
        isDemoData: true,
        seededAt: new Date().toISOString(),
        version: '2.1',
        itemCount: {
          vendors: mockVendors.length,
          orders: mockOrders.length,
          protocols: mockProtocols.length,
          supplements: mockSupplements.length,
          reconItems: mockReconItems.length,
          metrics: mockMetrics.length
        }
      }
    };

    console.log('\n📦 Demo data prepared:');
    console.log(`  Vendors: ${mockVendors.length}`);
    console.log(`  Orders: ${mockOrders.length}`);
    console.log(`  Protocols: ${mockProtocols.length}`);
    console.log(`  Supplements: ${mockSupplements.length}`);
    console.log(`  Recon Items: ${mockReconItems.length}`);
    console.log(`  Metrics: ${mockMetrics.length}`);
    console.log(`  Scheduled Buys: ${mockScheduledBuys.length}`);
    console.log(`  Stockpile: ${mockStockpile.length}`);
    console.log(`  Calendar Notes: ${Object.keys(mockCalendarNotes).length}`);

    // Save to Firestore
    console.log('\n💾 Saving demo data to Firestore...');
    await userDataRef.set(demoData, { merge: true });
    
    console.log('\n✅ SUCCESS! Demo data seeded to user account.');
    console.log('\n📊 Final data summary:');
    console.log(`  Protocols: ${demoData.protocols.length}`);
    console.log(`  Orders: ${demoData.orders.length}`);
    console.log(`  Vendors: ${demoData.vendors.length}`);
    console.log(`  Stockpile: ${demoData.stockpile.length}`);
    console.log(`  Supplements: ${demoData.supplements.length}`);
    console.log(`  Recon Items: ${demoData.reconItems.length}`);
    console.log(`  Metrics: ${demoData.metrics.length}`);
    console.log(`  Scheduled Buys: ${demoData.scheduledBuys.length}`);
    console.log(`  Calendar Notes: ${Object.keys(demoData.calendarNotes).length}`);

    return { 
      success: true, 
      message: 'Demo data successfully seeded'
    };

  } catch (error) {
    console.error(`\n❌ Error seeding demo data:`, error.message);
    console.error('   Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// Run the script
const userId = process.argv[2];

if (!userId) {
  console.error('\n❌ Error: User ID is required');
  console.error('\nUsage: node seed-demo-data-user.js <userId>');
  console.error('\nExample: node seed-demo-data-user.js KROrMSV0EkfOlh75km8XwW1qUAS2\n');
  process.exit(1);
}

seedDemoDataForUser(userId)
  .then((result) => {
    if (result.success) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ Script completed successfully!\n');
      console.log('💡 You can now test the removal script with:');
      console.log(`   node wipe-demo-data-user.js ${userId}\n`);
      process.exit(0);
    } else {
      console.log('\n' + '='.repeat(60));
      console.log('❌ Script completed with errors\n');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    // Clean up Firebase Admin
    if (admin.apps.length) {
      admin.app().delete().catch(() => {});
    }
  });

