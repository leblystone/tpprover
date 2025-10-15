import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { AppProvider } from './context/AppContext'
import { FirebaseProvider } from './context/FirebaseContext'
import { toggleDebugMode, getDebugMode } from './utils/debugMode'
import { initCacheBusting } from './utils/cacheBuster.js'
import { isNative } from './utils/platform'
import './index.css'

// Initialize cache busting on app load
initCacheBusting();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FirebaseProvider>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </FirebaseProvider>
  </React.StrictMode>,
)

// Expose debug controls to window
if (typeof window !== 'undefined') {
  window.toggleDebugMode = toggleDebugMode;
  window.getDebugMode = getDebugMode;
  
  // Show current debug mode on load
  // Debug mode status available via getDebugMode() function
}

// Service worker: disable in native (Capacitor) and development to avoid stale cache issues
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // Disable service worker in development to prevent cache issues
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isDev || isNative()) {
          console.log('💻 Development/Native environment detected: disabling service worker');
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let registration of registrations) {
            await registration.unregister();
          }
          return; // Exit early - no service worker in dev/native
        }
        
        if (false && isNative()) { // This block is now unreachable but kept for reference
          console.log('📱 Native environment detected: disabling service worker and clearing caches');
          
          // Only clear caches if we haven't done this before
          const hasCleared = sessionStorage.getItem('tpp_sw_cleared');
          if (!hasCleared) {
            console.log('🧹 First load: Clearing service worker caches...');
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
              await registration.unregister();
            }
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => {
              console.log('🧹 Clearing cache:', name);
              return caches.delete(name);
            }));
            
            // Mark as cleared for this session
            sessionStorage.setItem('tpp_sw_cleared', 'true');
          } else {
          }
          
          return; // Do not register a service worker in native
        }


        // Unregister old service workers first to ensure clean slate (web only)
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }

        // Register new service worker (web only)
        const registration = await navigator.serviceWorker.register('/sw.js', {
          // Force update check on every page load
          updateViaCache: 'none'
        });


        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Don't auto-reload - let user manually refresh if needed
              // Auto-reload can cause React hooks errors during dev
              // window.location.reload();
            }
          });
        });

        // Add cache management functions to global scope for debugging
        window.clearAppCache = async () => {
          try {
            console.log('🧹 Clearing all app caches...');
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            
            // Also clear localStorage backup
            const keys = Object.keys(localStorage).filter(key => key.startsWith('tpp'));
            keys.forEach(key => {
              if (!['tpp_need_password_for_sync', 'tpprover_theme', 'tpprover_user'].includes(key)) {
                localStorage.removeItem(key);
              }
            });
            
            console.log('🔄 Reloading page...');
            window.location.reload();
          } catch (error) {
            console.error('❌ Failed to clear cache:', error);
          }
        };
        
        window.checkNetworkStatus = () => {
          console.log('🌐 Network Status:', {
            online: navigator.onLine,
            connection: navigator.connection?.effectiveType || 'unknown',
            downlink: navigator.connection?.downlink || 'unknown'
          });
        };
        
        // Monitor network changes
        window.addEventListener('online', () => {
        });
        
        window.addEventListener('offline', () => {
          console.log('📡 Network: Gone offline');
        });
        
      } catch (error) {
        console.error('❌ Service worker registration failed:', error);
        
        // If service worker fails, provide fallback
        window.clearAppCache = () => {
          console.log('🧹 Service worker unavailable, clearing localStorage only...');
          const keys = Object.keys(localStorage).filter(key => key.startsWith('tpp'));
          keys.forEach(key => {
            if (!['tpp_need_password_for_sync', 'tpprover_theme', 'tpprover_user'].includes(key)) {
              localStorage.removeItem(key);
            }
          });
          window.location.reload();
        };
      }
    });
}