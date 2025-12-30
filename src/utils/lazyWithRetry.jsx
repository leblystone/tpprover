/**
 * Lazy Import with Retry and Cache Busting
 * Handles chunk loading failures gracefully
 */

import { lazy } from 'react';
import { isNative } from './platform';

/**
 * Track failed chunk loads to avoid infinite reload loops
 */
const failedChunks = new Set();
const MAX_RETRIES = 3;

/**
 * Enhanced lazy loading with retry logic and cache busting
 * @param {Function} importFunc - Dynamic import function
 * @param {string} chunkName - Optional name for logging
 * @returns {React.LazyExoticComponent}
 */
export function lazyWithRetry(importFunc, chunkName = 'unknown') {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page_has_been_force_refreshed') || 'false'
    );

    try {
      // Try to import the component
      const component = await importFunc();
      
      // Success! Clear the failed flag if it was set
      if (pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.removeItem('page_has_been_force_refreshed');
      }
      
      return component;
    } catch (error) {
      console.error(`❌ Failed to load chunk: ${chunkName}`, error);

      // Check if this is a chunk loading error
      const isChunkLoadError = 
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.name === 'ChunkLoadError';

      if (isChunkLoadError) {
        console.warn(`🔄 Chunk load error detected for: ${chunkName}`);

        // Skip cache clearing on native apps - they don't use service workers
        // and reloading doesn't help with chunk loading issues on native
        if (isNative()) {
          console.log('📱 Native app detected - skipping cache clear, showing error component');
          // Return error component directly without trying to reload
          return {
            default: () => {
              return (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100vh',
                  padding: '2rem',
                  textAlign: 'center',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                  <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>
                    ⚠️ Error Loading Page
                  </h1>
                  <p style={{ marginBottom: '1.5rem', color: '#64748b', maxWidth: '500px' }}>
                    Failed to load {chunkName}. Please try navigating again or restart the app.
                  </p>
                  <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Error: {error.message}
                  </p>
                </div>
              );
            }
          };
        }

        // If we haven't force refreshed yet, do it once
        if (!pageHasAlreadyBeenForceRefreshed) {
          console.log('🔄 First chunk load failure - attempting cache clear and reload...');
          
          // Mark that we're about to refresh
          window.sessionStorage.setItem('page_has_been_force_refreshed', 'true');
          
          // Clear cache and reload
          await clearCacheAndReload();
          
          // Return a promise that never resolves (we're reloading anyway)
          return new Promise(() => {});
        } else {
          // We already tried reloading - show error to user
          console.error('🚨 Chunk load failed even after reload. Manual refresh needed.');
          
          // Return an error component
          return {
            default: () => {
              return (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100vh',
                  padding: '2rem',
                  textAlign: 'center',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                  <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>
                    ⚠️ Update Required
                  </h1>
                  <p style={{ marginBottom: '1.5rem', color: '#64748b', maxWidth: '500px' }}>
                    The Pep Planner has been updated. Please refresh your browser to load the latest version.
                  </p>
                  <button
                    onClick={() => {
                      window.sessionStorage.removeItem('page_has_been_force_refreshed');
                      window.location.reload();
                    }}
                    style={{
                      padding: '0.75rem 2rem',
                      fontSize: '1rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Refresh Now
                  </button>
                  <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    Error: {chunkName} - {error.message}
                  </p>
                </div>
              );
            }
          };
        }
      }

      // For non-chunk errors, rethrow
      throw error;
    }
  });
}

/**
 * Clear all caches and reload the page
 */
async function clearCacheAndReload() {
  try {
    console.log('🧹 Clearing caches...');
    
    // Clear all cache storage
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log(`🗑️ Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }

    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        console.log('🗑️ Unregistering service worker');
        await registration.unregister();
      }
    }

    console.log('✅ Cache cleared, reloading...');
    
    // Force reload with cache bypass
    setTimeout(() => {
      window.location.reload();
    }, 100);
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    // Fallback to simple reload
    window.location.reload();
  }
}

/**
 * Preload a chunk to catch errors early
 * @param {Function} importFunc - Dynamic import function
 * @returns {Promise}
 */
export async function preloadChunk(importFunc) {
  try {
    await importFunc();
    return true;
  } catch (error) {
    console.error('Failed to preload chunk:', error);
    return false;
  }
}

