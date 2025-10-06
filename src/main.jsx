import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { AppProvider } from './context/AppContext'
import { FirebaseProvider } from './context/FirebaseContext'
import { toggleDebugMode, getDebugMode } from './utils/debugMode'
import './index.css'

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
  console.log(`🔧 Debug mode: ${getDebugMode() ? 'ENABLED' : 'DISABLED'}`);
  console.log('💡 Use toggleDebugMode() to enable/disable debug logging');
}

// TEMPORARILY DISABLED: Service worker for debugging caching issues
if (false && 'serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        console.log('🔧 Registering service worker...');
        
        // Unregister old service workers first to ensure clean slate
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          console.log('🗑️ Unregistering old service worker...');
          await registration.unregister();
        }
        
        // Register new service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          // Force update check on every page load
          updateViaCache: 'none'
        });
        
        console.log('✅ Service worker registered successfully');
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Service worker update found');
          const newWorker = registration.installing;
          
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🚀 New service worker installed, refreshing...');
              // Auto-refresh to get the new version
              window.location.reload();
            }
          });
        });
        
        // Add cache management functions to global scope for debugging
        window.clearAppCache = async () => {
          try {
            console.log('🧹 Clearing all app caches...');
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('✅ All caches cleared');
            
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
          console.log('✅ Network: Back online');
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