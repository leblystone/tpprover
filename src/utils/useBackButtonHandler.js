import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { isNative } from './platform';

/**
 * Hardware Back Button Handler for Mobile Apps
 * 
 * This hook manages the hardware back button behavior on Android/iOS:
 * 1. Navigates through app history when back is pressed
 * 2. Shows confirmation before exiting when on root pages
 * 3. Prevents accidental app closure
 * 
 * Root pages where exit confirmation is shown:
 * - /app (home)
 * - /app/dashboard
 * - /login
 */
export function useBackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPressTime = useRef(0);
  const exitToastShown = useRef(false);

  useEffect(() => {
    // Only run on native mobile platforms
    if (!isNative()) {
      return;
    }

    console.log('🔙 Back button handler: Setting up listener');

    // Root pages where we should confirm exit
    const rootPaths = [
      '/app',
      '/app/',
      '/app/dashboard',
      '/login'
    ];

    const backButtonListener = CapacitorApp.addListener('backButton', (event) => {
      const currentPath = window.location.pathname;
      console.log('🔙 Back button pressed:', { currentPath, canGoBack: event.canGoBack });

      // Check if we're on a root page
      const isOnRootPage = rootPaths.includes(currentPath);

      if (isOnRootPage) {
        // Double-tap to exit logic (2 second window)
        const currentTime = Date.now();
        const timeSinceLastPress = currentTime - lastBackPressTime.current;

        if (timeSinceLastPress < 2000) {
          // Second press within 2 seconds - exit the app
          console.log('🔙 Double back press - exiting app');
          CapacitorApp.exitApp();
        } else {
          // First press - show toast and update timestamp
          lastBackPressTime.current = currentTime;
          
          // Show exit confirmation toast
          if (!exitToastShown.current) {
            showExitToast();
            exitToastShown.current = true;
            
            // Reset toast flag after 2 seconds
            setTimeout(() => {
              exitToastShown.current = false;
            }, 2000);
          }
        }
      } else {
        // Not on root page - navigate back normally
        console.log('🔙 Navigating back in app history');
        
        // Check if there's browser history to go back to
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          // No history - go to dashboard
          navigate('/app/dashboard', { replace: true });
        }
      }
    });

    // Cleanup listener on unmount
    return () => {
      console.log('🔙 Back button handler: Removing listener');
      backButtonListener.remove();
    };
  }, [navigate, location]);
}

/**
 * Show a toast notification for exit confirmation
 * Uses the app's toast system if available
 */
function showExitToast() {
  // Check if the app's toast system is available
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: {
        message: '🔙 Press back again to exit',
        type: 'info',
        duration: 2000
      }
    }));
  } else {
    // Fallback to native alert (less ideal but functional)
    console.log('🔙 Press back again to exit');
    
    // Create a simple toast element as fallback
    const toast = document.createElement('div');
    toast.textContent = 'Press back again to exit';
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 99999;
      font-size: 14px;
      pointer-events: none;
      animation: fadeIn 0.2s ease-in;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.2s ease-out';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 200);
    }, 1800);
  }
}











