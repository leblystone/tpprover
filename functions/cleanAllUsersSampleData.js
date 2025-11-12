#!/usr/bin/env node
'use strict';

/**
 * ONE-TIME SCRIPT: Clean sample data from ALL user accounts in Firestore
 * Run this BEFORE deploying the sample data removal changes
 * 
 * Usage: node cleanAllUsersSampleData.js
 */

const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Known sample data markers to identify demo entries
 */
const SAMPLE_MARKERS = [
  'Research Lab: Discovery Peptides',
  'Discovery Peptides',
  'KPV',
  'Semaglutide',
  'GHRP-2',
  'GHRP-6',
  'BPC-157',
  'Thymalin',
  'Epithalon',
  'Tirzepatide',
  'Mock Order',
  'Mock Order #001',
  'Mock Order #002',
  'ResearchLabs Pro',
  'Peptide Research Co',
  'BioTech Solutions',
  'Elite Bio Research',
  'Upcoming Founder Welcome Webinar',
  'Founder Welcome Webinar',
  'Community Round',
  'Founder Welcome',
  'Group Buy',
  'Sample',
  'Demo',
  'Example'
];

function containsSampleMarker(value) {
  if (value === undefined || value === null) return false;
  const str = String(value).toLowerCase();
  return SAMPLE_MARKERS.some(marker => str.includes(marker.toLowerCase()));
}

/**
 * Check if an item is sample data
 */
function isSampleItem(item) {
  if (item === undefined || item === null) return false;
  
  if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
    return containsSampleMarker(item);
  }

  if (Array.isArray(item)) {
    return item.some(entry => isSampleItem(entry));
  }

  if (typeof item !== 'object') return false;
  
  // Check isMock flag
  if (item.isMock === true) return true;
  
  // Check various fields for sample markers
  const fieldsToCheck = [
    item.name,
    item.protocolName,
    item.peptideName,
    item.peptide,
    item.vendor,
    item.vendorName,
    item.title,
    item.label,
    item.item,
    item.notes
  ].filter(Boolean);

  return fieldsToCheck.some(containsSampleMarker);
}

/**
 * Strip sample entries from user data
 */
function stripSampleEntries(data) {
  if (!data || typeof data !== 'object') {
    return { cleanedData: data, removedAnything: false };
  }

  let removedAnything = false;
  const cleanedData = {};

  // Handle array fields
  const arrayFields = [
    'protocols', 'vendors', 'orders', 'supplements', 
    'reconItems', 'reconHistory', 'metrics', 'stockpile', 
    'scheduledBuys', 'stock'
  ];

  arrayFields.forEach(field => {
    if (Array.isArray(data[field])) {
      const original = data[field];
      const filtered = original.filter(item => !isSampleItem(item));
      
      if (filtered.length < original.length) {
        removedAnything = true;
        console.log(`  - Removed ${original.length - filtered.length} sample ${field}`);
      }
      
      cleanedData[field] = filtered;
    } else if (data[field] !== undefined) {
      cleanedData[field] = data[field];
    }
  });

  // Handle calendarNotes object
  if (data.calendarNotes && typeof data.calendarNotes === 'object') {
    const cleanedNotes = {};
    let removedNotes = 0;

    Object.entries(data.calendarNotes).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (!isSampleItem(value)) {
          cleanedNotes[key] = value;
        } else {
          removedNotes++;
        }
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        if (!containsSampleMarker(value)) {
          cleanedNotes[key] = value;
        } else {
          removedNotes++;
        }
      } else {
        cleanedNotes[key] = value;
      }
    });

    if (removedNotes > 0) {
      removedAnything = true;
      console.log(`  - Removed ${removedNotes} sample calendar notes`);
    }

    cleanedData.calendarNotes = cleanedNotes;
  } else if (data.calendarNotes !== undefined) {
    cleanedData.calendarNotes = data.calendarNotes;
  }

  // Copy over other fields
  Object.keys(data).forEach(key => {
    if (!arrayFields.includes(key) && key !== 'calendarNotes' && !(key in cleanedData)) {
      cleanedData[key] = data[key];
    }
  });

  return { cleanedData, removedAnything };
}

/**
 * Clean a single user's data
 */
async function cleanUserData(doc) {
  const userId = doc.id;
  const data = doc.data() || {};

  console.log(`\n📋 Processing user: ${userId}`);

  // Check if user has any sample data
  const { cleanedData, removedAnything } = stripSampleEntries(data);

  if (!removedAnything) {
    console.log('  ✅ No sample data found - skipping');
    return { cleaned: false, userId };
  }

  // Update Firestore with cleaned data
  try {
    await doc.ref.set(cleanedData, { merge: false });
    console.log('  ✅ Sample data removed and document updated');
    return { cleaned: true, userId };
  } catch (error) {
    console.error(`  ❌ Failed to update document:`, error.message);
    return { cleaned: false, userId, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🧹 CLEANING SAMPLE DATA FROM ALL USERS\n');
  console.log('This will remove sample/demo data from all userData documents in Firestore.\n');

  try {
    // Get all userData documents
    const usersSnapshot = await db.collection('userData').get();
    const totalUsers = usersSnapshot.size;

    console.log(`📊 Found ${totalUsers} user documents\n`);

    if (totalUsers === 0) {
      console.log('No users found. Exiting.');
      return;
    }

    // Process each user
    const results = {
      total: totalUsers,
      cleaned: 0,
      skipped: 0,
      errors: 0
    };

    for (const doc of usersSnapshot.docs) {
      const result = await cleanUserData(doc);
      
      if (result.cleaned) {
        results.cleaned++;
      } else if (result.error) {
        results.errors++;
      } else {
        results.skipped++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total users processed: ${results.total}`);
    console.log(`✅ Cleaned: ${results.cleaned}`);
    console.log(`⏭️  Skipped (no sample data): ${results.skipped}`);
    console.log(`❌ Errors: ${results.errors}`);
    console.log('='.repeat(50));
    console.log('\n✅ Cleanup complete!');

  } catch (error) {
    console.error('\n❌ Fatal error during cleanup:', error);
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

