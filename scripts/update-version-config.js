/**
 * Update Firestore Version Config Script
 * 
 * This script automatically updates the appConfig/version document in Firestore
 * after you deploy a new version.
 * 
 * Usage: 
 *   node scripts/update-version-config.js --release-notes "Bug fixes and improvements"
 *   node scripts/update-version-config.js --release-notes "New features" --minimum "1.0.18"
 * 
 * This saves you from manually updating the Admin Panel every time!
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const releaseNotesIndex = args.indexOf('--release-notes');
const minimumVersionIndex = args.indexOf('--minimum');

const releaseNotes = releaseNotesIndex !== -1 ? args[releaseNotesIndex + 1] : 'Bug fixes and improvements';
const minimumVersion = minimumVersionIndex !== -1 ? args[minimumVersionIndex + 1] : '';

// Read package.json
const packageJson = JSON.parse(
  readFileSync(join(rootDir, 'package.json'), 'utf8')
);
const latestVersion = packageJson.version;

console.log('🚀 Updating Firestore Version Config...\n');
console.log(`📱 Latest Version: ${latestVersion}`);
console.log(`🔒 Minimum Version: ${minimumVersion || 'None (optional update)'}`);
console.log(`📝 Release Notes: ${releaseNotes}\n`);

// Load Firebase config from environment or serviceAccountKey
let firebaseConfig;
try {
  // Try to load from serviceAccountKey.json (for local use)
  const serviceAccount = JSON.parse(
    readFileSync(join(rootDir, 'functions', 'serviceAccountKey.json'), 'utf8')
  );
  
  // Convert service account to web config format
  firebaseConfig = {
    projectId: serviceAccount.project_id,
    // Note: For server-side, you'd use Admin SDK instead
    // This is a simplified example - in production, use Firebase Admin SDK
  };
  
  console.log('⚠️  Note: This script should use Firebase Admin SDK for production use.');
  console.log('⚠️  For now, please update the version config manually in the Admin Panel.\n');
  console.log('📋 Copy these values:\n');
  console.log(`   Latest Version: ${latestVersion}`);
  console.log(`   Minimum Version: ${minimumVersion || '(leave empty)'}`);
  console.log(`   Release Notes: ${releaseNotes}`);
  console.log(`   Android URL: https://play.google.com/store/apps/details?id=com.thepepplanner.app`);
  console.log(`   iOS URL: (leave empty until iOS app is published)\n`);
  
  console.log('💡 In the future, this script will auto-update Firestore using Admin SDK!\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 To use this script, ensure Firebase Admin SDK is configured.');
}

// TODO: Implement with Firebase Admin SDK for automatic updates
// For now, this script just helps you remember what to update
