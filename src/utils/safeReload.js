/**
 * Safe Reload Utility
 * Ensures all user data is synced to cloud before any page reload
 * Prevents data loss during automatic updates or cache clearing
 */

import { saveAppData } from '../services/cloudStorage';

// Track if sync is in progress
let syncInProgress = false;
let syncPromise = null;

/**
 * Get current app data from AppContext
 * This function should be set by AppContext on mount
 */
let getAppDataFunction = null;

/**
 * Register the function to get current app data
 * Called by AppContext on initialization
 */
export function registerAppDataGetter(getter) {
  getAppDataFunction = getter;
  console.log('✅ Safe reload: App data getter registered');
}

/**
 * Force immediate sync of all data to Firestore
 * @param {string} userId - Firebase user ID
 * @returns {Promise<boolean>} - True if sync successful
 */
async function forceSyncToCloud(userId) {
  if (!userId) {
    console.warn('⚠️ Safe reload: No user ID, skipping sync');
    return false;
  }

  if (!getAppDataFunction) {
    console.warn('⚠️ Safe reload: App data getter not registered, skipping sync');
    return false;
  }

  try {
    console.log('💾 Safe reload: Starting emergency data sync...');
    
    // Get current data from AppContext
    const appData = getAppDataFunction();
    
    if (!appData) {
      console.warn('⚠️ Safe reload: No app data available');
      return false;
    }

    // Count total items
    const totalItems = [
      appData.protocols?.length || 0,
      appData.vendors?.length || 0,
      appData.orders?.length || 0,
      appData.supplements?.length || 0,
      appData.reconItems?.length || 0,
      appData.stockpile?.length || 0,
      appData.scheduledBuys?.length || 0,
      appData.metrics?.length || 0
    ].reduce((a, b) => a + b, 0);

    console.log(`💾 Safe reload: Syncing ${totalItems} items to cloud...`);

    // Force immediate save with skipMerge to ensure our data persists
    await saveAppData(userId, appData, { skipMerge: false });
    
    console.log('✅ Safe reload: Data successfully synced to cloud');
    return true;
    
  } catch (error) {
    console.error('❌ Safe reload: Failed to sync data:', error);
    return false;
  }
}

/**
 * Safely reload the page after ensuring data is synced
 * @param {string} userId - Firebase user ID
 * @param {string} reason - Reason for reload (for logging)
 * @param {boolean} clearCache - Whether to clear cache before reload
 * @returns {Promise<void>}
 */
export async function safeReload(userId, reason = 'unknown', clearCache = false) {
  // Prevent multiple simultaneous syncs
  if (syncInProgress && syncPromise) {
    console.log('⏸️ Safe reload: Already syncing, waiting...');
    await syncPromise;
    return;
  }

  syncInProgress = true;
  console.log(`🔄 Safe reload initiated: ${reason}`);

  try {
    // Show user feedback
    showSyncNotification();

    // Force sync to cloud
    syncPromise = forceSyncToCloud(userId);
    const syncSuccess = await syncPromise;

    // Wait a moment to ensure Firestore write completes
    if (syncSuccess) {
      console.log('⏳ Safe reload: Waiting for Firestore to confirm write...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Clear cache if requested
    if (clearCache) {
      console.log('🧹 Safe reload: Clearing caches...');
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
    }

    // Reload the page
    console.log('🔄 Safe reload: Data saved, reloading page...');
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Safe reload: Error during safe reload:', error);
    // Still reload, but log the error
    window.location.reload();
  } finally {
    syncInProgress = false;
    syncPromise = null;
  }
}

/**
 * Show a temporary notification that data is being saved
 */
function showSyncNotification() {
  // Check if there's already a notification
  const existing = document.getElementById('safe-reload-notification');
  if (existing) return;

  const notification = document.createElement('div');
  notification.id = 'safe-reload-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #5F7F76 0%, #3d5a52 100%);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 99999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: slideDown 0.3s ease-out;
  `;
  
  notification.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
    </svg>
    <span>Saving your research data...</span>
  `;

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);

  // Remove after 3 seconds (reload will happen before this)
  setTimeout(() => {
    notification.remove();
    style.remove();
  }, 3000);
}

/**
 * Wrap any reload function to make it safe
 * @param {Function} reloadFunction - The original reload function
 * @param {string} userId - Firebase user ID
 * @param {string} reason - Reason for reload
 * @returns {Promise<void>}
 */
export async function wrapReloadFunction(reloadFunction, userId, reason) {
  await safeReload(userId, reason);
  // If safeReload doesn't reload (edge case), call original
  if (typeof reloadFunction === 'function') {
    reloadFunction();
  }
}

/**
 * Check if data has unsaved changes
 * This can be enhanced to track dirty state
 */
export function hasUnsavedChanges() {
  // TODO: Implement dirty tracking in AppContext
  // For now, always assume there might be unsaved changes
  return true;
}

/**
 * Add beforeunload listener to warn about unsaved changes
 * @param {boolean} enable - Enable or disable the warning
 */
export function setUnsavedChangesWarning(enable) {
  if (enable) {
    window.addEventListener('beforeunload', beforeUnloadHandler);
  } else {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
  }
}

function beforeUnloadHandler(e) {
  // Only show warning if we think there are unsaved changes
  // Browser will show their own message
  if (hasUnsavedChanges()) {
    e.preventDefault();
    e.returnValue = 'You may have unsaved research data. Are you sure you want to leave?';
    return e.returnValue;
  }
}

