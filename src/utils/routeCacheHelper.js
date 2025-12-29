/**
 * Route Cache Helper
 * Detects if a 404 is likely due to cache issues and auto-clears cache
 */

// List of valid routes that should always exist
// These match the routes defined in src/routes.jsx
const VALID_APP_ROUTES = [
  '/app',
  '/app/dashboard',
  '/app/calendar',
  '/app/calendar/day',
  '/app/protocols',
  '/app/recon',
  '/app/stockpile',
  '/app/orders',
  '/app/vendors',
  '/app/account',
  '/app/account/profile',
  '/app/account/subscription',
  '/app/account/profile',
  '/app/account/legal',
  '/app/settings',
  '/app/settings/notifications',
  '/app/settings/appearance',
  '/app/settings/preferences',
  '/app/settings/privacy',
  '/app/settings/legal',
  '/app/settings/data',
  '/app/announcements',
  '/app/goals',
  '/app/imports',
  '/app/badges',
  '/app/beta-survey',
  '/app/launch-coming-soon',
];

/**
 * Check if a pathname is a valid route that should exist
 */
export function isValidRoute(pathname) {
  if (!pathname) return false;
  
  // Normalize the pathname (remove query params, hash, and trailing slashes)
  let normalizedPath = pathname.split('?')[0].split('#')[0];
  // Remove trailing slash except for root
  if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1);
  }
  
  // Check exact matches
  if (VALID_APP_ROUTES.includes(normalizedPath)) {
    return true;
  }
  
  // Special case: /app or /app/ should always be valid (redirects to dashboard)
  if (normalizedPath === '/app') {
    return true;
  }
  
  // Check if it starts with a valid app route (for nested routes)
  return VALID_APP_ROUTES.some(route => {
    // Exact match
    if (normalizedPath === route) return true;
    // Starts with route + /
    if (normalizedPath.startsWith(route + '/')) return true;
    return false;
  });
}

/**
 * Clear all caches and reload the page
 * Returns a promise that resolves when cache is cleared
 */
export async function clearCacheAndReload() {
  try {
    console.log('🔄 Detected cache issue - clearing caches automatically...');
    
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
    
    // Force reload with cache bypass by adding a timestamp query param
    const url = new URL(window.location.href);
    url.searchParams.set('_cache_clear', Date.now().toString());
    
    setTimeout(() => {
      window.location.replace(url.toString());
    }, 500);
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    // Fallback to simple reload with cache bypass
    const url = new URL(window.location.href);
    url.searchParams.set('_cache_clear', Date.now().toString());
    window.location.replace(url.toString());
    return false;
  }
}

/**
 * Check if we've already attempted to clear cache for this route
 * Prevents infinite reload loops
 */
export function hasAttemptedCacheClear(pathname) {
  const key = `tpp_cache_clear_attempt_${pathname}`;
  const attempted = sessionStorage.getItem(key);
  return attempted === 'true';
}

/**
 * Mark that we've attempted to clear cache for this route
 */
export function markCacheClearAttempt(pathname) {
  const key = `tpp_cache_clear_attempt_${pathname}`;
  sessionStorage.setItem(key, 'true');
  
  // Clear the flag after 5 minutes to allow retry if needed
  setTimeout(() => {
    sessionStorage.removeItem(key);
  }, 5 * 60 * 1000);
}
