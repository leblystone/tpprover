#!/usr/bin/env node
/**
 * Script to wipe demo/sample data from a specific user in Firestore
 * 
 * Usage: cd functions && node wipe-demo-data-user.js <userId>
 * 
 * Example: cd functions && node wipe-demo-data-user.js KROrMSV0EkfOlh75km8XwW1qUAS2
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
  
  // Check isMock flag (primary indicator)
  if (item.isMock === true) return true;
  
  // Check _metadata.isSampleData or _metadata.isDemoData
  if (item._metadata?.isSampleData === true || item._metadata?.isDemoData === true) {
    return true;
  }
  
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
    return { cleanedData: data, removedAnything: false, stats: {} };
  }

  let removedAnything = false;
  const cleanedData = {};
  const stats = {};

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
      const removed = original.length - filtered.length;
      
      if (removed > 0) {
        removedAnything = true;
        stats[field] = { before: original.length, after: filtered.length, removed };
        console.log(`  📦 ${field}: ${original.length} → ${filtered.length} (removed ${removed})`);
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
    let totalNotes = 0;

    Object.entries(data.calendarNotes).forEach(([key, value]) => {
      totalNotes++;
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
      stats.calendarNotes = { before: totalNotes, after: totalNotes - removedNotes, removed: removedNotes };
      console.log(`  📅 calendarNotes: ${totalNotes} → ${totalNotes - removedNotes} (removed ${removedNotes})`);
    }

    cleanedData.calendarNotes = cleanedNotes;
  } else if (data.calendarNotes !== undefined) {
    cleanedData.calendarNotes = data.calendarNotes;
  }

  // Remove _metadata if it indicates sample data
  if (data._metadata) {
    if (data._metadata.isSampleData === true || data._metadata.isDemoData === true) {
      // Keep metadata but remove the sample data flags
      cleanedData._metadata = { ...data._metadata };
      delete cleanedData._metadata.isSampleData;
      delete cleanedData._metadata.isDemoData;
      removedAnything = true;
      console.log(`  🏷️  Removed sample data metadata flags`);
    } else {
      cleanedData._metadata = data._metadata;
    }
  }

  // Copy over other fields (but skip if they're sample-related)
  Object.keys(data).forEach(key => {
    if (!arrayFields.includes(key) && key !== 'calendarNotes' && key !== '_metadata' && !(key in cleanedData)) {
      cleanedData[key] = data[key];
    }
  });

  return { cleanedData, removedAnything, stats };
}

/**
 * Main function to wipe demo data for a specific user
 */
async function wipeDemoDataForUser(userId) {
  console.log(`\n🧹 WIPING DEMO DATA FOR USER: ${userId}\n`);
  console.log('='.repeat(60));

  try {
    // Get user document
    const userDataRef = db.collection('userData').doc(userId);
    const userDataSnap = await userDataRef.get();
    
    if (!userDataSnap.exists) {
      console.log(`❌ No user data found for user ID: ${userId}`);
      console.log('   The user may not exist or has no data in Firestore.');
      return { success: false, error: 'User not found' };
    }

    const data = userDataSnap.data();
    console.log('\n📊 Current data summary:');
    console.log(`  Protocols: ${data.protocols?.length || 0}`);
    console.log(`  Orders: ${data.orders?.length || 0}`);
    console.log(`  Vendors: ${data.vendors?.length || 0}`);
    console.log(`  Stockpile: ${data.stockpile?.length || 0}`);
    console.log(`  Supplements: ${data.supplements?.length || 0}`);
    console.log(`  Recon Items: ${data.reconItems?.length || 0}`);
    console.log(`  Metrics: ${data.metrics?.length || 0}`);
    console.log(`  Scheduled Buys: ${data.scheduledBuys?.length || 0}`);
    console.log(`  Calendar Notes: ${Object.keys(data.calendarNotes || {}).length}`);

    // SAFETY: Create backup before modifying data
    // Store backup in backups/{userId}/snapshots/{timestamp} collection
    const backupTimestamp = Date.now();
    const backupId = `${backupTimestamp}_pre-demo-wipe`;
    const backupRef = admin.firestore().doc(`backups/${userId}/snapshots/${backupId}`);
    
    console.log('\n💾 Creating backup before operation...');
    await backupRef.set({
      userId,
      reason: 'pre-demo-wipe',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      timestampMs: backupTimestamp,
      data,
      version: data.version || '1.0',
      metadata: {
        dataTypes: Object.keys(data),
        protocolsCount: data.protocols?.length || 0,
        ordersCount: data.orders?.length || 0,
        stockpileCount: data.stockpile?.length || 0
      }
    });
    console.log(`✅ Backup created: ${backupId}`);

    // Check if user has sample data metadata
    const hasSampleMetadata = data._metadata?.isSampleData === true || data._metadata?.isDemoData === true;
    if (hasSampleMetadata) {
      console.log(`  ⚠️  User has sample data metadata flag`);
    }

    console.log('\n🔍 Removing sample/demo data entries...\n');

    // Strip sample entries
    const { cleanedData, removedAnything, stats } = stripSampleEntries(data);

    if (!removedAnything) {
      console.log('✅ No sample data found - user data is clean!');
      return { success: true, cleaned: false, message: 'No sample data found' };
    }

    // Update Firestore with cleaned data
    console.log('\n💾 Saving cleaned data to Firestore...');
    await userDataRef.set(cleanedData, { merge: true });
    
    console.log('\n✅ SUCCESS! Demo data removed from user account.');
    console.log('\n📊 Final data summary:');
    console.log(`  Protocols: ${cleanedData.protocols?.length || 0}`);
    console.log(`  Orders: ${cleanedData.orders?.length || 0}`);
    console.log(`  Vendors: ${cleanedData.vendors?.length || 0}`);
    console.log(`  Stockpile: ${cleanedData.stockpile?.length || 0}`);
    console.log(`  Supplements: ${cleanedData.supplements?.length || 0}`);
    console.log(`  Recon Items: ${cleanedData.reconItems?.length || 0}`);
    console.log(`  Metrics: ${cleanedData.metrics?.length || 0}`);
    console.log(`  Scheduled Buys: ${cleanedData.scheduledBuys?.length || 0}`);
    console.log(`  Calendar Notes: ${Object.keys(cleanedData.calendarNotes || {}).length}`);

    return { 
      success: true, 
      cleaned: true, 
      stats,
      message: 'Demo data successfully removed'
    };

  } catch (error) {
    console.error(`\n❌ Error wiping demo data:`, error.message);
    console.error('   Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// Run the script
const userId = process.argv[2];

if (!userId) {
  console.error('\n❌ Error: User ID is required');
  console.error('\nUsage: node wipe-demo-data-user.js <userId>');
  console.error('\nExample: node wipe-demo-data-user.js KROrMSV0EkfOlh75km8XwW1qUAS2\n');
  process.exit(1);
}

wipeDemoDataForUser(userId)
  .then((result) => {
    if (result.success) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ Script completed successfully!\n');
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

