/**
 * Version Validation Script
 * 
 * This script checks that all version references are consistent.
 * Run before building/deploying to catch version mismatches.
 * 
 * Usage: node scripts/validate-version.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔍 Validating app version consistency...\n');

// Read package.json
const packageJson = JSON.parse(
  readFileSync(join(rootDir, 'package.json'), 'utf8')
);
const packageVersion = packageJson.version;

console.log(`📦 package.json version: ${packageVersion}`);

// Check Android version
try {
  const androidBuildGradle = readFileSync(
    join(rootDir, 'android', 'app', 'build.gradle'),
    'utf8'
  );
  
  const versionNameMatch = androidBuildGradle.match(/versionName\s+"([^"]+)"/);
  const androidVersion = versionNameMatch ? versionNameMatch[1] : 'NOT FOUND';
  
  console.log(`🤖 Android versionName: ${androidVersion}`);
  
  if (androidVersion !== packageVersion) {
    console.error(`❌ MISMATCH: Android version (${androidVersion}) doesn't match package.json (${packageVersion})`);
    console.log(`   Fix: Update versionName in android/app/build.gradle`);
    process.exit(1);
  }
} catch (error) {
  console.warn(`⚠️  Could not validate Android version: ${error.message}`);
}

// Check iOS version (if exists)
try {
  const iosConfigJson = readFileSync(
    join(rootDir, 'ios', 'App', 'App', 'config.json'),
    'utf8'
  );
  const iosConfig = JSON.parse(iosConfigJson);
  const iosVersion = iosConfig.version || 'NOT FOUND';
  
  console.log(`🍎 iOS version: ${iosVersion}`);
  
  if (iosVersion !== packageVersion) {
    console.error(`❌ MISMATCH: iOS version (${iosVersion}) doesn't match package.json (${packageVersion})`);
    console.log(`   Fix: Update version in ios/App/App/config.json`);
    process.exit(1);
  }
} catch (error) {
  console.warn(`⚠️  Could not validate iOS version: ${error.message}`);
}

console.log('\n✅ All versions are consistent!');
console.log(`\n📱 Current app version: ${packageVersion}`);
console.log('\n💡 Reminder: Update Admin Panel → App Version Manager after deploying!\n');
