import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { AppProvider } from './context/AppContext'
import { FirebaseProvider } from './context/FirebaseContext'
import { FounderOfferProvider } from './context/FounderOfferContext'
import { CartProvider } from './context/CartContext'
import ChunkErrorBoundary from './components/common/ChunkErrorBoundary'
import { toggleDebugMode, getDebugMode } from './utils/debugMode'
import { initCacheBusting } from './utils/cacheBuster.js'
import { isNative } from './utils/platform'
import { setupSafeAreaSupport } from './utils/safeArea'
import './index.css'

// Initialize cache busting on app load
initCacheBusting();
setupSafeAreaSupport();

// Global error handlers to prevent renderer crashes
if (typeof window !== 'undefined') {
  // Catch unhandled JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('🚨 Global error caught:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
    
    // Prevent default error handling that could crash the renderer
    // Only log, don't throw - let React error boundaries handle it
    event.preventDefault();
  }, true); // Use capture phase to catch errors early
  
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const errorMessage = reason?.message || reason?.toString() || String(reason);
    const errorStack = reason?.stack || 'No stack trace';
    
    console.error('🚨 Unhandled promise rejection:', errorMessage);
    console.error('🚨 Error details:', {
      message: errorMessage,
      stack: errorStack,
      reason: reason,
      type: typeof reason,
      constructor: reason?.constructor?.name
    });
    
    // Prevent default handling that could crash the renderer
    event.preventDefault();
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChunkErrorBoundary>
      <FirebaseProvider>
        <FounderOfferProvider>
          <CartProvider>
          <AppProvider>
            <Suspense fallback={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#F5F5F0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', color: '#6B7D7A' }}>Loading...</div>
                </div>
              </div>
            }>
              <RouterProvider router={router} />
            </Suspense>
          </AppProvider>
          </CartProvider>
        </FounderOfferProvider>
      </FirebaseProvider>
    </ChunkErrorBoundary>
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
        
        // Temporarily disable service worker on ALL environments to fix stale cache loop
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
        // Clear all caches too
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        return;
        
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


        // Register service worker (web only). Use normal lifecycle so update detection works.
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none'
        });

        // When a new SW is installed and we already have an active controller, reload to get new code
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New version available – reloading to apply update');
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
        
        // Advanced network diagnostics
        window.diagnoseNetwork = async () => {
          console.log('🔍 Running comprehensive network diagnostics...\n');
          
          // 1. Basic connectivity
          console.log('1️⃣ Basic Connectivity:');
          console.log('   Browser online status:', navigator.onLine ? '✅ Online' : '❌ Offline');
          console.log('   Connection type:', navigator.connection?.effectiveType || 'Unknown');
          console.log('   Download speed:', navigator.connection?.downlink ? `${navigator.connection.downlink} Mbps` : 'Unknown');
          
          // 2. Service Worker status
          console.log('\n2️⃣ Service Worker Status:');
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            if (registrations.length > 0) {
              console.log('   ✅ Active service workers:', registrations.length);
              registrations.forEach((reg, i) => {
                console.log(`   SW ${i + 1}:`, reg.active?.scriptURL || 'Installing...');
              });
            } else {
              console.log('   ⚠️ No active service workers');
            }
          } else {
            console.log('   ❌ Service Worker not supported');
          }
          
          // 3. Cache status
          console.log('\n3️⃣ Cache Status:');
          try {
            const cacheNames = await caches.keys();
            console.log('   Active caches:', cacheNames.length);
            cacheNames.forEach(name => console.log('   -', name));
          } catch (e) {
            console.log('   ❌ Cannot access cache:', e.message);
          }
          
          // 4. Firebase connectivity test
          console.log('\n4️⃣ Firebase Connectivity Test:');
          const firebaseTests = [
            { name: 'Auth Domain', url: 'https://tpp-splendide.firebaseapp.com' },
            { name: 'Firebase API', url: 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=test' },
            { name: 'Firestore', url: 'https://firestore.googleapis.com' }
          ];
          
          for (const test of firebaseTests) {
            try {
              const start = Date.now();
              const response = await fetch(test.url, { method: 'HEAD', mode: 'no-cors' });
              const duration = Date.now() - start;
              console.log(`   ✅ ${test.name}: Reachable (${duration}ms)`);
            } catch (error) {
              console.log(`   ❌ ${test.name}: BLOCKED or UNREACHABLE`);
              console.log(`      Error: ${error.message}`);
            }
          }
          
          // 5. Browser extensions check
          console.log('\n5️⃣ Potential Issues:');
          const issues = [];
          
          // Check for ad blockers
          const testAd = document.createElement('div');
          testAd.className = 'ad advertisement adsbox';
          testAd.style.position = 'absolute';
          testAd.style.top = '-1px';
          document.body.appendChild(testAd);
          setTimeout(() => {
            if (testAd.offsetHeight === 0) {
              issues.push('⚠️ Ad blocker detected (may block Firebase)');
            }
            testAd.remove();
          }, 100);
          
          // Check localStorage
          try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
          } catch (e) {
            issues.push('❌ localStorage blocked (privacy mode?)');
          }
          
          if (issues.length === 0) {
            console.log('   ✅ No obvious issues detected');
          } else {
            issues.forEach(issue => console.log('   ', issue));
          }
          
          // 6. Recommendations
          console.log('\n6️⃣ Recommendations:');
          console.log('   1. Run: window.clearAppCache() - Clear all caches');
          console.log('   2. Disable VPN/Proxy temporarily');
          console.log('   3. Disable browser extensions (especially ad blockers)');
          console.log('   4. Try incognito/private mode');
          console.log('   5. Check firewall/antivirus settings');
          console.log('   6. Try different network (mobile data vs WiFi)');
          console.log('\n✅ Diagnostics complete!');
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