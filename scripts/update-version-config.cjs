/**
 * update-version-config.cjs
 *
 * Automatically pushes the current package.json version to Firestore
 * (appConfig/version) after a deploy, replacing the manual Admin Panel step.
 *
 * Requires a one-time setup:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   Save as: functions/serviceAccountKey.json
 *
 * Usage (standalone):
 *   node scripts/update-version-config.cjs
 *   node scripts/update-version-config.cjs --release-notes "One-off dose feature"
 *   node scripts/update-version-config.cjs --release-notes "..." --minimum "2.0.9"
 *
 * Called automatically by deploy:hosting and mobile:ota npm scripts.
 */

const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const serviceAccountPath = path.join(rootDir, 'functions', 'serviceAccountKey.json');

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const releaseNotes = get('--release-notes') || 'Bug fixes and improvements';
const minimumVersion = get('--minimum') || '';
const skipConfirm = args.includes('--yes') || args.includes('-y');

// ── Read package.json version ─────────────────────────────────────────────────
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const latestVersion = pkg.version;

console.log('\n🚀 Auto-updating App Version Manager in Firestore...\n');
console.log(`📱 Latest Version : ${latestVersion}`);
console.log(`🔒 Minimum Version: ${minimumVersion || '(unchanged)'}`);
console.log(`📝 Release Notes  : ${releaseNotes}\n`);

// ── Check serviceAccountKey exists ────────────────────────────────────────────
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Missing: functions/serviceAccountKey.json\n');
  console.error('One-time setup (30 seconds):');
  console.error('  1. Go to Firebase Console → Project Settings → Service Accounts');
  console.error('  2. Click "Generate new private key" → confirm → save the file');
  console.error('  3. Rename / move it to: functions/serviceAccountKey.json\n');
  console.error('After that, this script runs automatically on every deploy!');
  process.exit(0); // exit 0 so it doesn't break the deploy pipeline
}

// ── Init Firebase Admin using functions/node_modules ─────────────────────────
const adminPath = path.join(rootDir, 'functions', 'node_modules', 'firebase-admin');
let admin;
try {
  admin = require(adminPath);
} catch (e) {
  console.error('❌ Could not load firebase-admin from functions/node_modules:', e.message);
  process.exit(0);
}

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = admin.firestore();

// ── Write to Firestore ────────────────────────────────────────────────────────
async function run() {
  try {
    // Load current config to preserve any existing fields (storeUrls etc.)
    const docRef = db.collection('appConfig').doc('version');
    const existing = await docRef.get();
    const current = existing.exists ? existing.data() : {};

    const update = {
      ...current,
      latestVersion,
      releaseNotes,
      updatedAt: new Date().toISOString(),
      ...(minimumVersion ? { minimumVersion } : {}),
    };

    await docRef.set(update, { merge: true });
    console.log('✅ appConfig/version updated in Firestore');

    // Log to version history (mirrors what VersionManager.jsx does)
    await db.collection('versionUpdateHistory').add({
      latestVersion,
      minimumVersion: minimumVersion || null,
      releaseNotes,
      storeUrls: current.storeUrls || {
        android: 'https://play.google.com/store/apps/details?id=com.thepepplanner.app',
        ios: '',
      },
      createdBy: 'deploy-script',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Version history entry added');
    console.log(`\n🎉 App Version Manager is now showing v${latestVersion} — no manual update needed!\n`);
  } catch (err) {
    console.error('❌ Firestore update failed:', err.message);
    // Don't exit 1 — don't break the deploy pipeline over this
  } finally {
    process.exit(0);
  }
}

run();
