/**
 * Cache Busting Utility
 * Automatically clears old cached data and forces fresh load
 */

const CURRENT_APP_VERSION = 'beta-fix-v2-force';

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
      
      // Force reload for any version change during beta fix
      if (storedVersion !== CURRENT_APP_VERSION) {
        console.log('🚀 Version change detected, forcing reload...');
        setTimeout(() => {
          window.location.reload(true);
        }, 100);
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
 * Force clear all cache immediately - emergency function
 */
export function emergencyCacheClear() {
  try {
    console.log('🚨 EMERGENCY CACHE CLEAR - Starting...');
    
    // Clear all localStorage
    localStorage.clear();
    
    // Clear all sessionStorage
    sessionStorage.clear();
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
          console.log('🗑️ Deleted cache:', cacheName);
        });
      });
    }
    
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
          console.log('🗑️ Unregistered service worker');
        });
      });
    }
    
    console.log('🚨 EMERGENCY CACHE CLEAR - Complete, reloading...');
    
    // Force reload
    setTimeout(() => {
      window.location.href = window.location.href.split('?')[0] + '?cache_bust=' + Date.now();
    }, 500);
    
  } catch (error) {
    console.error('Error in emergency cache clear:', error);
    // Fallback - just reload
    window.location.reload(true);
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
  
  // Add emergency cache clear to window for debugging
  if (typeof window !== 'undefined') {
    window.emergencyCacheClear = emergencyCacheClear;
    console.log('🚨 Emergency cache clear available: window.emergencyCacheClear()');
  }
}
