#!/usr/bin/env node
'use strict';

/**
 * Quick script to check if any users still have sample data
 * Usage: node checkUsersForSampleData.js [userId]
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Check if an item has sample data markers
 */
function isSampleItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.isMock === true) return true;
  
  const sampleMarkers = ['Sample', 'Demo', 'Mock', 'Example', 'BPC-157', 'Semaglutide', 'Discovery Peptides'];
  const fieldsToCheck = [
    item.name, item.protocolName, item.peptideName, item.peptide,
    item.vendor, item.vendorName, item.title, item.label, item.item
  ].filter(Boolean);

  return fieldsToCheck.some((value) =>
    sampleMarkers.some((marker) =>
      String(value).toLowerCase().includes(marker.toLowerCase())
    )
  );
}

/**
 * Check a user's data for sample content
 */
async function checkUserData(userId) {
  const userDataRef = db.collection('userData').doc(userId);
  const doc = await userDataRef.get();

  if (!doc.exists) {
    return { userId, hasSampleData: false, message: 'No userData document' };
  }

  const data = doc.data() || {};
  const sampleCounts = {};
  let totalSample = 0;

  // Check array fields
  const arrayFields = ['protocols', 'vendors', 'orders', 'supplements', 'reconItems', 'metrics', 'stockpile', 'scheduledBuys', 'stock'];
  
  arrayFields.forEach(field => {
    if (Array.isArray(data[field])) {
      const sampleItems = data[field].filter(isSampleItem);
      if (sampleItems.length > 0) {
        sampleCounts[field] = sampleItems.length;
        totalSample += sampleItems.length;
      }
    }
  });

  // Check calendar notes
  if (data.calendarNotes && typeof data.calendarNotes === 'object') {
    const sampleNotes = Object.values(data.calendarNotes).filter(note => 
      typeof note === 'object' && note !== null && isSampleItem(note)
    ).length;
    if (sampleNotes > 0) {
      sampleCounts.calendarNotes = sampleNotes;
      totalSample += sampleNotes;
    }
  }

  return {
    userId,
    hasSampleData: totalSample > 0,
    sampleCounts,
    totalSample
  };
}

/**
 * Main function
 */
async function main() {
  const userId = process.argv[2];

  if (userId) {
    // Check specific user
    console.log(`🔍 Checking user: ${userId}\n`);
    const result = await checkUserData(userId);
    
    if (result.hasSampleData) {
      console.log('❌ User still has sample data:');
      Object.entries(result.sampleCounts).forEach(([field, count]) => {
        console.log(`   - ${field}: ${count} sample items`);
      });
      console.log(`\n📊 Total sample items: ${result.totalSample}`);
    } else {
      console.log('✅ User has no sample data!');
      if (result.message) console.log(`   ${result.message}`);
    }
  } else {
    // Check all users
    console.log('🔍 Checking all users for sample data...\n');
    
    const usersSnapshot = await db.collection('userData').get();
    const results = [];
    
    for (const doc of usersSnapshot.docs) {
      const result = await checkUserData(doc.id);
      if (result.hasSampleData) {
        results.push(result);
      }
    }

    if (results.length === 0) {
      console.log('✅ All users are clean! No sample data found.');
    } else {
      console.log(`❌ Found ${results.length} users with sample data:\n`);
      results.forEach(result => {
        console.log(`User: ${result.userId}`);
        Object.entries(result.sampleCounts).forEach(([field, count]) => {
          console.log(`  - ${field}: ${count} items`);
        });
        console.log('');
      });
    }
    
    console.log(`\n📊 Summary: ${results.length}/${usersSnapshot.size} users have sample data`);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });

