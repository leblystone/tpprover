/**
 * Cache Busting Utility
 * Performs one-time cache + service worker refresh when the build version changes.
 * Designed to prevent infinite reload loops by tracking refresh attempts per version.
 */

import pkg from '../../package.json' assert { type: 'json' };

const CURRENT_APP_VERSION = import.meta.env?.VITE_APP_BUILD_VERSION || pkg.version || '0.0.0';
const VERSION_KEY = 'tpp_app_version';
const REFRESH_VERSION_KEY = 'tpp_app_cache_refresh_version';
const REFRESH_TIMESTAMP_KEY = 'tpp_app_cache_refresh_started_at';
const REFRESH_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

function safeGetLocalStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('⚠️ Unable to access localStorage key:', key, error);
    return null;
  }
}

function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('⚠️ Unable to write localStorage key:', key, error);
  }
}

function resetRefreshState() {
  try {
    sessionStorage.removeItem(REFRESH_VERSION_KEY);
    sessionStorage.removeItem(REFRESH_TIMESTAMP_KEY);
  } catch {
    // Ignore sessionStorage failures
  }
}

function clearStaleRefreshState() {
  try {
    const refreshVersion = sessionStorage.getItem(REFRESH_VERSION_KEY);
    const startedAt = Number(sessionStorage.getItem(REFRESH_TIMESTAMP_KEY) || '0');
    if (!refreshVersion) return;

    if (!startedAt || Date.now() - startedAt > REFRESH_TIMEOUT_MS) {
      resetRefreshState();
    }
  } catch {
    // Ignore sessionStorage failures
  }
}

async function clearServiceWorkersAndCaches() {
  const errors = [];

  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(
        registrations.map(async registration => {
          try {
            await registration.unregister();
          } catch (error) {
            errors.push(error);
          }
        })
      );
    } catch (error) {
      errors.push(error);
    }
  }

  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.allSettled(
        cacheNames.map(cacheName =>
          caches.delete(cacheName).catch(error => {
            errors.push(error);
          })
        )
      );
    } catch (error) {
      errors.push(error);
    }
  }

  if ('indexedDB' in window && indexedDB?.databases) {
    try {
      const databases = await indexedDB.databases();
      await Promise.allSettled(
        databases.map(db => {
          if (!db?.name) return Promise.resolve();
          return new Promise(resolve => {
            const deleteRequest = indexedDB.deleteDatabase(db.name);
            deleteRequest.onsuccess = deleteRequest.onerror = deleteRequest.onblocked = () => resolve();
          });
        })
      );
    } catch (error) {
      // IndexedDB cleanup is best-effort; ignore errors
      console.warn('⚠️ IndexedDB cleanup issue:', error);
    }
  }

  if (errors.length) {
    console.warn('⚠️ Issues while clearing caches/service workers:', errors);
  }
}

async function triggerCacheRefresh(version) {
  try {
    const existingRefreshVersion = sessionStorage.getItem(REFRESH_VERSION_KEY);
    const startedAt = Number(sessionStorage.getItem(REFRESH_TIMESTAMP_KEY) || '0');
    if (existingRefreshVersion === version && Date.now() - startedAt < REFRESH_TIMEOUT_MS) {
      console.log('⏭️ Cache refresh already triggered for this version, skipping duplicate.');
      return;
    }

    sessionStorage.setItem(REFRESH_VERSION_KEY, version);
    sessionStorage.setItem(REFRESH_TIMESTAMP_KEY, Date.now().toString());

    await clearServiceWorkersAndCaches();

    // Force reload with cache-busting query parameter
    const url = new URL(window.location.href);
    url.searchParams.set('appVersion', version);
    url.searchParams.set('ts', Date.now().toString());
    setTimeout(() => {
      window.location.replace(url.toString());
    }, 150);
    setTimeout(() => {
      resetRefreshState();
    }, REFRESH_TIMEOUT_MS);
  } catch (error) {
    console.error('❌ Failed to perform cache refresh:', error);
    resetRefreshState();
  }
}

/**
 * Check if the cached assets correspond to the current build.
 * Returns true if a refresh was triggered.
 */
export async function checkAndClearCache() {
  try {
    if (typeof window === 'undefined') return false;

    clearStaleRefreshState();

    if (!CURRENT_APP_VERSION) {
      console.warn('⚠️ CURRENT_APP_VERSION is not defined. Skipping cache validation.');
      return false;
    }

    const storedVersion = safeGetLocalStorage(VERSION_KEY);
    if (storedVersion === CURRENT_APP_VERSION) {
      resetRefreshState();
      return false;
    }

    console.log(`🔄 App version changed (${storedVersion || 'none'} → ${CURRENT_APP_VERSION})`);
    safeSetLocalStorage(VERSION_KEY, CURRENT_APP_VERSION);

    await triggerCacheRefresh(CURRENT_APP_VERSION);
    return true;
  } catch (error) {
    console.error('❌ Error during cache version check:', error);
    return false;
  }
}

/**
 * Force service worker update (manual debug helper)
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
    localStorage.clear();
    sessionStorage.clear();
    triggerCacheRefresh(`emergency-${Date.now()}`);
  } catch (error) {
    console.error('Error in emergency cache clear:', error);
    window.location.reload();
  }
}

/**
 * Initialize cache busting on app load
 */
export function initCacheBusting() {
  if (typeof window === 'undefined') return;

  checkAndClearCache().catch(error => {
    console.error('❌ Cache busting failed:', error);
  });

  window.emergencyCacheClear = emergencyCacheClear;
  console.log('🚨 Emergency cache clear available: window.emergencyCacheClear()');
}
