// __SW_BUILD_VERSION__ is replaced at build time so every deploy gets a new SW
const SW_BUILD_VERSION = '__SW_BUILD_VERSION__';
const CACHE_NAME = 'tpp-cache-' + SW_BUILD_VERSION;
const STATIC_CACHE = 'tpp-static-' + SW_BUILD_VERSION;
const DYNAMIC_CACHE = 'tpp-dynamic-' + SW_BUILD_VERSION;

// Essential assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/tpp_logo.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(STATIC_ASSETS);
        self.skipWaiting(); // Activate immediately
      } catch (error) {
        console.error('❌ Service Worker: Failed to cache static assets:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter(name => name !== CACHE_NAME && name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map(name => caches.delete(name));
        
        await Promise.all(deletePromises);
        
        // Take control of all clients immediately
        await self.clients.claim();
      } catch (error) {
        console.error('❌ Service Worker: Activation failed:', error);
      }
    })()
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // CRITICAL FIX: Network-first strategy for better WiFi compatibility
        // Try network first, fall back to cache if network fails
        
        // BYPASS SERVICE WORKER FOR FIREBASE - Let Firebase handle its own requests
        // Firebase Auth and Firestore need direct network access, no caching
        if (url.hostname.includes('firebase') || 
            url.hostname.includes('firebaseapp') ||
            url.hostname.includes('googleapis.com')) {
          // Return direct fetch without any caching or interception
          return fetch(request);
        }
        
        // CRITICAL FIX: NEVER cache JavaScript chunks - always fetch from network
        // This prevents stale chunk errors when new deployments happen
        if (url.pathname.includes('/assets/') && 
            (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
          try {
            return await fetch(request);
          } catch (error) {
            // If network fails for JS/CSS chunks, we're truly offline - serve from cache if available
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              return cachedResponse;
            }
            throw error;
          }
        }
        
        // ALWAYS fetch index.html from network to get latest bundle hashes
        if (request.destination === 'document' || url.pathname === '/' || url.pathname === '/index.html') {
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              // Cache the latest HTML for offline use
              const cache = await caches.open(STATIC_CACHE);
              await cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          } catch (error) {
            // Network failed, fall back to cached HTML
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              return cachedResponse;
            }
            throw error;
          }
        }
        
        // For other API calls and dynamic imports, use network-first with cache fallback
        if (url.pathname.includes('/api/') ||
            url.pathname.includes('src/pages/')) {
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              // Cache successful API responses for offline use
              const cache = await caches.open(DYNAMIC_CACHE);
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          } catch (networkError) {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              return cachedResponse;
            }
            throw networkError;
          }
        }
        
        // For static assets (images, fonts, etc.), use cache-first strategy
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Not in cache, try network
        const networkResponse = await fetch(request, {
          // Add timeout to prevent hanging on slow WiFi
          // Increased to 30 seconds for slow connections
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });
        
        if (networkResponse.ok) {
          // Cache successful responses (skip Firebase/external APIs)
          try {
            const cache = await caches.open(DYNAMIC_CACHE);
            await cache.put(request, networkResponse.clone());
          } catch (cacheError) {
            // Continue without caching - this is non-critical
          }
        }
        
        return networkResponse;
        
      } catch (error) {
        // Last resort: try to find any cached version
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If it's a navigation request and we have no cache, serve the main page
        if (request.destination === 'document') {
          const indexCache = await caches.match('/index.html');
          if (indexCache) {
            return indexCache;
          }
        }
        
        // Nothing we can do, return error
        console.error('Service Worker: Complete failure for:', url.pathname, error.message);
        return new Response('Network error and no cache available', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })()
  );
});

// Enhanced push notification handling
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('Service Worker: Failed to parse push data:', error);
    data = {
      title: 'The Pep Planner',
      body: 'You have a new notification',
      icon: '/tpp_logo.png'
    };
  }

  const options = {
    body: data.body || 'You have a new update',
    icon: data.icon || '/tpp_logo.png',
    badge: data.badge || '/tpp_logo.png',
    tag: data.tag || 'tpp-notification',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    vibrate: data.vibrate || [200, 100, 200],
    actions: data.actions || [],
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'The Pep Planner', options)
  );
});

// Enhanced notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();

  // Handle action buttons if any
  if (event.action) {
    // Handle specific actions here if needed
    return;
  }

  // Get notification data for navigation
  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Try to focus existing window first
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          
          // Navigate to specific page if provided
          if (notificationData.path && client.navigate) {
            client.navigate(notificationData.path);
          }
          
          return;
        }
      }
      
      // Open new window if no existing window found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', event => {
  // Track notification dismissal if needed
  const notificationData = event.notification.data || {};
  if (notificationData.trackDismissal) {
    // Send analytics event or update user preferences (silent)
  }
});


