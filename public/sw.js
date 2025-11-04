const CACHE_NAME = 'tpp-cache-v7-firebase-fix'; // Updated version - FIREBASE AUTH FIX
const STATIC_CACHE = 'tpp-static-v7';
const DYNAMIC_CACHE = 'tpp-dynamic-v7';

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
          .filter(name => !name.includes('v7')) // Delete old cache versions - FIREBASE AUTH FIX
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
        
        // For static assets, try cache first but with network fallback
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
          // Return cached version but update cache in background
          
          // Background update for HTML files to get latest version
          if (request.destination === 'document') {
            fetch(request).then(response => {
              if (response.ok) {
                caches.open(STATIC_CACHE).then(cache => {
                  cache.put(request, response.clone());
                });
              }
            }).catch(() => {
              // Network failed, but we have cache - silently continue
            });
          }
          
          return cachedResponse;
        }
        
        // Not in cache, try network
        const networkResponse = await fetch(request, {
          // Add timeout to prevent hanging on slow WiFi
          signal: AbortSignal.timeout(10000) // 10 second timeout
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


