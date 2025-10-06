const CACHE_NAME = 'tpp-cache-v4'; // Updated version for cache management  
const STATIC_CACHE = 'tpp-static-v4';
const DYNAMIC_CACHE = 'tpp-dynamic-v4';

// Essential assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/tpp-logo.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        console.log('📦 Service Worker: Caching static assets...');
        await cache.addAll(STATIC_ASSETS);
        console.log('✅ Service Worker: Static assets cached successfully');
        self.skipWaiting(); // Activate immediately
      } catch (error) {
        console.error('❌ Service Worker: Failed to cache static assets:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter(name => !name.includes('v2')) // Delete old cache versions
          .map(name => {
            console.log('🗑️ Service Worker: Deleting old cache:', name);
            return caches.delete(name);
          });
        
        await Promise.all(deletePromises);
        console.log('✅ Service Worker: Old caches cleaned up');
        
        // Take control of all clients immediately
        await self.clients.claim();
        console.log('🎯 Service Worker: Claimed all clients');
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
        
        // For API calls, Firebase, and dynamic imports, always try network first
        if (url.hostname.includes('firebase') || 
            url.pathname.includes('/api/') ||
            url.pathname.includes('src/pages/')) {
          console.log('🌐 Service Worker: Network-first for:', url.pathname);
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              // Cache successful API responses for offline use
              const cache = await caches.open(DYNAMIC_CACHE);
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          } catch (networkError) {
            console.warn('📡 Service Worker: Network failed, trying cache:', networkError.message);
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              return cachedResponse;
            }
            throw networkError;
          }
        }
        
        // For static assets, try cache first but with network fallback
        console.log('📦 Service Worker: Cache-first for static:', url.pathname);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
          // Return cached version but update cache in background
          console.log('✅ Service Worker: Serving from cache:', url.pathname);
          
          // Background update for HTML files to get latest version
          if (request.destination === 'document') {
            fetch(request).then(response => {
              if (response.ok) {
                caches.open(STATIC_CACHE).then(cache => {
                  cache.put(request, response.clone());
                });
              }
            }).catch(() => {
              // Network failed, but we have cache
              console.log('🔄 Service Worker: Background update failed, using cache');
            });
          }
          
          return cachedResponse;
        }
        
        // Not in cache, try network
        console.log('🌐 Service Worker: Fetching from network:', url.pathname);
        const networkResponse = await fetch(request, {
          // Add timeout to prevent hanging on slow WiFi
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (networkResponse.ok) {
          // Cache successful responses (skip Firebase/external APIs)
          try {
            const cache = await caches.open(DYNAMIC_CACHE);
            await cache.put(request, networkResponse.clone());
            console.log('💾 Service Worker: Cached new resource:', url.pathname);
          } catch (cacheError) {
            console.warn('⚠️ Service Worker: Cache put failed (non-critical):', cacheError.message);
            // Continue without caching - this is non-critical
          }
        }
        
        return networkResponse;
        
      } catch (error) {
        console.error('❌ Service Worker: Fetch failed:', error.message, 'for', url.pathname);
        
        // Last resort: try to find any cached version
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          console.log('🆘 Service Worker: Emergency cache fallback:', url.pathname);
          return cachedResponse;
        }
        
        // If it's a navigation request and we have no cache, serve the main page
        if (request.destination === 'document') {
          const indexCache = await caches.match('/index.html');
          if (indexCache) {
            console.log('🏠 Service Worker: Serving index.html fallback');
            return indexCache;
          }
        }
        
        // Nothing we can do, return error
        console.error('💥 Service Worker: Complete failure for:', url.pathname);
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
  console.log('📱 Service Worker: Push event received');
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('📱 Service Worker: Failed to parse push data:', error);
    data = {
      title: 'The Pep Planner',
      body: 'You have a new notification',
      icon: '/tpp-logo.png'
    };
  }

  const options = {
    body: data.body || 'You have a new update',
    icon: data.icon || '/tpp-logo.png',
    badge: data.badge || '/tpp-logo.png',
    tag: data.tag || 'tpp-notification',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    vibrate: data.vibrate || [200, 100, 200],
    actions: data.actions || [],
    timestamp: Date.now()
  };

  console.log('📱 Service Worker: Showing notification:', data.title, options);

  event.waitUntil(
    self.registration.showNotification(data.title || 'The Pep Planner', options)
  );
});

// Enhanced notification click handling
self.addEventListener('notificationclick', event => {
  console.log('📱 Service Worker: Notification clicked:', event.notification.tag);
  
  event.notification.close();

  // Handle action buttons if any
  if (event.action) {
    console.log('📱 Service Worker: Action clicked:', event.action);
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
          console.log('📱 Service Worker: Focusing existing window');
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
        console.log('📱 Service Worker: Opening new window to:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', event => {
  console.log('📱 Service Worker: Notification closed:', event.notification.tag);
  
  // Track notification dismissal if needed
  const notificationData = event.notification.data || {};
  if (notificationData.trackDismissal) {
    // Send analytics event or update user preferences
    console.log('📱 Service Worker: Tracking notification dismissal');
  }
});


