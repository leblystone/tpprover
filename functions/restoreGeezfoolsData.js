#!/usr/bin/env node
'use strict';

/**
 * One-off script to restore geezfools' KPV stock data from screenshot
 * Usage: node restoreGeezfoolsData.js <userId>
 */

const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Generate a unique ID (mimics the app's ID generation)
 */
function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create KPV stock entries based on the screenshot
 */
function createKPVStockEntries() {
  const baseDate = new Date('2025-10-06').toISOString();
  const now = new Date().toISOString();
  
  return [
    // Entry 1: ZYH, 7 vials, 10/6/2025, 99% purity
    {
      id: generateId(),
      peptideName: 'KPV',
      vendor: 'ZYH',
      vialCount: 7,
      dosePerVial: 10,
      unit: 'mg',
      purity: 99,
      acquiredDate: baseDate,
      createdAt: now,
      updatedAt: now
    },
    // Entry 2: ZYH, 7 vials, 10/6/2025, 99% purity
    {
      id: generateId(),
      peptideName: 'KPV',
      vendor: 'ZYH',
      vialCount: 7,
      dosePerVial: 10,
      unit: 'mg',
      purity: 99,
      acquiredDate: baseDate,
      createdAt: now,
      updatedAt: now
    },
    // Entry 3: ZYH, 7 vials, 10/6/2025, 99% purity
    {
      id: generateId(),
      peptideName: 'KPV',
      vendor: 'ZYH',
      vialCount: 7,
      dosePerVial: 10,
      unit: 'mg',
      purity: 99,
      acquiredDate: baseDate,
      createdAt: now,
      updatedAt: now
    },
    // Entry 4: ZYH, 7 vials, 99% purity
    {
      id: generateId(),
      peptideName: 'KPV',
      vendor: 'ZYH',
      vialCount: 7,
      dosePerVial: 10,
      unit: 'mg',
      purity: 99,
      createdAt: now,
      updatedAt: now
    },
    // Entry 5: ZYH, 7 vials (no extra details)
    {
      id: generateId(),
      peptideName: 'KPV',
      vendor: 'ZYH',
      vialCount: 7,
      dosePerVial: 10,
      unit: 'mg',
      createdAt: now,
      updatedAt: now
    },
    // Entry 6: Low stock indicator, 7 vials
    {
      id: generateId(),
      peptideName: 'KPV',
      vialCount: 7,
      dosePerVial: 10,
      unit: 'mg',
      isLowStock: true,
      createdAt: now,
      updatedAt: now
    }
  ];
}

/**
 * Main function to restore data
 */
async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('Usage: node restoreGeezfoolsData.js <userId>');
    process.exit(1);
  }

  console.log(`\n🔧 Restoring KPV stock data for user: ${userId}\n`);

  try {
    const userDataRef = db.collection('userData').doc(userId);
    const doc = await userDataRef.get();

    if (!doc.exists) {
      console.log('⚠️  User document does not exist. Creating new one...');
    }

    const currentData = doc.data() || {};
    const currentStock = currentData.stock || [];

    // Create new stock entries
    const newStockEntries = createKPVStockEntries();

    console.log(`📦 Adding ${newStockEntries.length} KPV stock entries...`);
    
    // Merge with existing stock
    const updatedStock = [...currentStock, ...newStockEntries];

    // Update Firestore
    await userDataRef.set(
      {
        stock: updatedStock,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    console.log('✅ Successfully restored KPV stock data!');
    console.log(`\nAdded entries:`);
    newStockEntries.forEach((entry, idx) => {
      console.log(`  ${idx + 1}. ${entry.peptideName} - ${entry.vialCount} vials @ ${entry.dosePerVial}${entry.unit} ${entry.vendor ? `(${entry.vendor})` : ''}`);
    });
    console.log(`\n📊 Total stock entries in account: ${updatedStock.length}`);
    
  } catch (error) {
    console.error('❌ Failed to restore data:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

