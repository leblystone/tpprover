/**
 * Version Checker for The Pep Planner
 * Checks if user is running an outdated app version
 */

import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Current app version (matches package.json and android/ios builds)
export const APP_VERSION = '1.0.18';

// Local storage keys
const VERSION_CHECK_KEY = 'tpp_version_check';
const DISMISSAL_KEY = 'tpp_update_dismissal';

/**
 * Parse version string into comparable object
 * @param {string} version - Version string like "1.0.4"
 * @returns {object} - { major, minor, patch }
 */
export function parseVersion(version) {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number);
  return { major, minor, patch };
}

/**
 * Compare two versions
 * @param {string} current - Current version
 * @param {string} required - Required version
 * @returns {number} - -1 if current < required, 0 if equal, 1 if current > required
 */
export function compareVersions(current, required) {
  const c = parseVersion(current);
  const r = parseVersion(required);
  
  if (c.major !== r.major) return c.major - r.major;
  if (c.minor !== r.minor) return c.minor - r.minor;
  return c.patch - r.patch;
}

/**
 * Determine update urgency based on version difference
 * @param {string} current - Current version
 * @param {string} latest - Latest version
 * @returns {string} - 'critical', 'recommended', or 'optional'
 */
export function getUpdateUrgency(current, latest) {
  const c = parseVersion(current);
  const l = parseVersion(latest);
  
  // Major version behind = critical
  if (c.major < l.major) return 'critical';
  
  // Minor version behind = recommended
  if (c.minor < l.minor) return 'recommended';
  
  // Patch version behind = optional
  if (c.patch < l.patch) return 'optional';
  
  return 'none';
}

/**
 * Check if update prompt was recently dismissed
 * @returns {boolean} - True if dismissed within last 5 days
 */
export function wasRecentlyDismissed() {
  try {
    const dismissal = localStorage.getItem(DISMISSAL_KEY);
    if (!dismissal) return false;
    
    const { timestamp, version } = JSON.parse(dismissal);
    const now = Date.now();
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    
    // If dismissed version matches current version and within 5 days, don't show
    return version === APP_VERSION && (now - timestamp) < fiveDaysMs;
  } catch (error) {
    console.error('Error checking dismissal:', error);
    return false;
  }
}

/**
 * Record that user dismissed the update prompt
 */
export function recordDismissal() {
  try {
    localStorage.setItem(DISMISSAL_KEY, JSON.stringify({
      version: APP_VERSION,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error recording dismissal:', error);
  }
}

/**
 * Clear dismissal (useful when user updates)
 */
export function clearDismissal() {
  try {
    localStorage.removeItem(DISMISSAL_KEY);
  } catch (error) {
    console.error('Error clearing dismissal:', error);
  }
}

/**
 * Fetch version config from Firestore
 * @returns {Promise<object>} - Version config from Firestore
 */
export async function fetchVersionConfig() {
  try {
    const versionDoc = await getDoc(doc(db, 'appConfig', 'version'));
    
    if (!versionDoc.exists()) {
      console.warn('⚠️ Version config not found in Firestore');
      return null;
    }
    
    return versionDoc.data();
  } catch (error) {
    // Suppress permission errors in development (expected when version config isn't public)
    if (error.code === 'permission-denied' && (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost')) {
      // Silently handle permission errors in dev - version checking is optional
      return null;
    }
    // Only log non-permission errors
    if (error.code !== 'permission-denied') {
    console.error('❌ Error fetching version config:', error);
    }
    return null;
  }
}

/**
 * Main version check function
 * @returns {Promise<object|null>} - Update info if update available, null otherwise
 * 
 * IMPORTANT: This function ONLY checks for updates on native apps (Android/iOS)
 * - Native apps: Returns update info if new version available → Shows UpdatePromptModal
 * - PWA users: Returns null → Never shows UpdatePromptModal (they get automatic updates)
 * - PWA users only see FeatureAnnouncementModal (What's New style modal)
 */
export async function checkForUpdates() {
  try {
    // CRITICAL: Only check for updates on native apps (Android/iOS)
    // PWA users get instant updates automatically via service worker, so no need to check
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
    if (!isNative) {
      console.log('ℹ️ PWA user detected - no update check needed (automatic updates enabled)');
      return null; // PWA users NEVER see UpdatePromptModal
    }
    
    // Skip if recently dismissed
    if (wasRecentlyDismissed()) {
      console.log('✅ Update check: Recently dismissed');
      return null;
    }
    
    // Fetch version config from Firestore
    const config = await fetchVersionConfig();
    
    if (!config || !config.latestVersion) {
      // Only warn in production - in dev, missing config is expected
      if (process.env.NODE_ENV === 'production' && window.location.hostname !== 'localhost') {
      console.warn('⚠️ No version config available');
      }
      return null;
    }
    
    const { latestVersion, minimumVersion, releaseNotes, storeUrls } = config;
    
    // Compare versions
    const comparison = compareVersions(APP_VERSION, latestVersion);
    
    if (comparison >= 0) {
      // Current version is up to date or newer
      console.log('✅ App is up to date:', APP_VERSION);
      return null;
    }
    
    // Determine urgency
    const urgency = getUpdateUrgency(APP_VERSION, latestVersion);
    
    // Check if update is required (below minimum version)
    const isRequired = minimumVersion && compareVersions(APP_VERSION, minimumVersion) < 0;
    
    console.log(`📱 Update available: ${APP_VERSION} → ${latestVersion} (${urgency}${isRequired ? ', REQUIRED' : ''})`);
    
    return {
      currentVersion: APP_VERSION,
      latestVersion,
      minimumVersion,
      urgency: isRequired ? 'critical' : urgency,
      isRequired,
      releaseNotes: releaseNotes || 'Bug fixes and improvements',
      storeUrls: storeUrls || {}
    };
    
  } catch (error) {
    console.error('❌ Error checking for updates:', error);
    return null;
  }
}

/**
 * Get store URL for current platform
 * @param {object} storeUrls - Store URLs from config
 * @returns {string} - Store URL for current platform
 */
export function getStoreUrl(storeUrls = {}) {
  const userAgent = navigator.userAgent || '';
  
  // Check if running as native app
  const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
  
  if (isNative) {
    const platform = window.Capacitor.getPlatform();
    if (platform === 'ios' && storeUrls.ios) {
      return storeUrls.ios;
    }
    if (platform === 'android' && storeUrls.android) {
      return storeUrls.android;
    }
  }
  
  // Fallback: detect from user agent
  if (/iPad|iPhone|iPod/.test(userAgent) && storeUrls.ios) {
    return storeUrls.ios;
  }
  
  if (/Android/.test(userAgent) && storeUrls.android) {
    return storeUrls.android;
  }
  
  // Default to Play Store (most common)
  return storeUrls.android || 'https://play.google.com/store/apps/details?id=com.thepepplanner.app';
}

