/**
 * Cache Busting Utility
 * Automatically clears old cached data and forces fresh load
 */

const CURRENT_APP_VERSION = 'beta-fix-v1';

/**
 * Check if app needs cache clearing and perform it
 */
export function checkAndClearCache() {
  try {
    const storedVersion = localStorage.getItem('tpp_app_version');
    
    // If version changed or doesn't exist, clear cache
    if (storedVersion !== CURRENT_APP_VERSION) {
      console.log('🔄 App version changed, clearing cache...');
      clearAllCache();
      localStorage.setItem('tpp_app_version', CURRENT_APP_VERSION);
      
      // Force reload if this is a major version change
      if (storedVersion && !storedVersion.includes('beta-fix')) {
        console.log('🚀 Major version change detected, forcing reload...');
        window.location.reload(true);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking cache version:', error);
    return false;
  }
}

/**
 * Clear all cached data
 */
function clearAllCache() {
  try {
    // Clear localStorage (except essential items)
    const essentialKeys = ['tpp_app_version', 'tpprover_theme'];
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach(key => {
      if (!essentialKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear IndexedDB if it exists
    if ('indexedDB' in window) {
      indexedDB.databases?.().then(databases => {
        databases.forEach(db => {
          indexedDB.deleteDatabase(db.name);
        });
      }).catch(() => {
        // IndexedDB not supported or error
      });
    }
    
    console.log('✅ Cache cleared successfully');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Force service worker update
 */
export function forceServiceWorkerUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister().then(() => {
          console.log('🔄 Service worker unregistered, will re-register on next load');
        });
      });
    });
  }
}

/**
 * Initialize cache busting on app load
 */
export function initCacheBusting() {
  // Check cache version on load
  const needsReload = checkAndClearCache();
  
  // If no reload needed, we're good
  if (!needsReload) {
    console.log('✅ Cache is up to date');
  }
}
