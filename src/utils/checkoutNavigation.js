/**
 * Utility functions for handling checkout return navigation
 */

const CHECKOUT_RETURN_PATH_KEY = 'tpp_checkout_return_path';
const CHECKOUT_TIMEOUT_KEY = 'tpp_checkout_timeout_id';

/**
 * Global checkout timeout handler to clear timeouts when user returns to app
 * This fixes the issue where mobile users see timeout warnings when they return from checkout
 */
export function setupCheckoutTimeoutHandler() {
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      // App became visible - user might have returned from checkout
      const timeoutId = sessionStorage.getItem(CHECKOUT_TIMEOUT_KEY);
      
      if (timeoutId) {
        console.log('ℹ️ User returned to app, clearing checkout timeout');
        clearTimeout(parseInt(timeoutId));
        sessionStorage.removeItem(CHECKOUT_TIMEOUT_KEY);
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

/**
 * Store the current path before redirecting to checkout
 * @param {string} currentPath - The path to return to after checkout
 */
export function storeCheckoutReturnPath(currentPath = null) {
  const pathToStore = currentPath || window.location.pathname + window.location.search;
  
  // Don't store certain paths that shouldn't be returned to
  const excludedPaths = ['/login', '/logout', '/checkout', '/account?session_id='];
  const shouldExclude = excludedPaths.some(path => pathToStore.includes(path));
  
  if (!shouldExclude) {
    localStorage.setItem(CHECKOUT_RETURN_PATH_KEY, pathToStore);
    console.log('🔖 Stored checkout return path:', pathToStore);
  } else {
    // If we're on an excluded path, default to dashboard
    localStorage.setItem(CHECKOUT_RETURN_PATH_KEY, '/app/dashboard');
    console.log('🔖 Excluded path, storing dashboard as return path');
  }
}

/**
 * Get the stored return path and optionally clear it
 * @param {boolean} clearAfterGet - Whether to clear the stored path after retrieving it
 * @returns {string} The stored return path or '/app/dashboard' as fallback
 */
export function getCheckoutReturnPath(clearAfterGet = true) {
  const storedPath = localStorage.getItem(CHECKOUT_RETURN_PATH_KEY);
  
  if (clearAfterGet) {
    localStorage.removeItem(CHECKOUT_RETURN_PATH_KEY);
    console.log('🔖 Retrieved and cleared checkout return path:', storedPath);
  }
  
  return storedPath || '/app/dashboard';
}

/**
 * Clear the stored return path
 */
export function clearCheckoutReturnPath() {
  localStorage.removeItem(CHECKOUT_RETURN_PATH_KEY);
  console.log('🔖 Cleared checkout return path');
}

/**
 * Handle successful checkout return navigation
 * This should be called when the user returns from successful checkout
 * @param {function} navigate - React Router navigate function
 * @param {URLSearchParams} searchParams - Current URL search parameters
 */
export function handleCheckoutReturn(navigate, searchParams) {
  const sessionId = searchParams.get('session_id');
  
  if (sessionId) {
    // Get the return path and clear it
    const returnPath = getCheckoutReturnPath(true);
    
    // Clean up the URL by removing session_id
    const cleanPath = window.location.pathname;
    const cleanSearch = new URLSearchParams(window.location.search);
    cleanSearch.delete('session_id');
    
    const cleanUrl = cleanPath + (cleanSearch.toString() ? '?' + cleanSearch.toString() : '');
    
    // Replace current history entry to remove session_id
    window.history.replaceState({}, document.title, cleanUrl);
    
    // Navigate to return path if it's different from current
    if (returnPath !== cleanPath) {
      navigate(returnPath, { replace: true });
    }
    
    // Show success message
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          message: '🎉 Payment successful! Welcome to **The Pep Planner**!', 
          type: 'success' 
        }
      }));
    }, 100);
    
    return true; // Indicates we handled a checkout return
  }
  
  return false; // No checkout return to handle
}

/**
 * Debug function to check checkout navigation state
 * Call this in console: window.debugCheckoutNavigation()
 */
export function debugCheckoutNavigation() {
  const storedPath = localStorage.getItem(CHECKOUT_RETURN_PATH_KEY);
  const currentUrl = window.location.href;
  const urlParams = new URLSearchParams(window.location.search);
  
  console.log('🔍 Checkout Navigation Debug:', {
    storedReturnPath: storedPath,
    currentUrl,
    currentPath: window.location.pathname,
    currentSearch: window.location.search,
    hasSessionId: urlParams.has('session_id'),
    sessionId: urlParams.get('session_id'),
    allParams: Object.fromEntries(urlParams.entries())
  });
  
  return {
    storedPath,
    currentUrl,
    hasSessionId: urlParams.has('session_id'),
    sessionId: urlParams.get('session_id')
  };
}

// Setup checkout timeout handler on load
if (typeof window !== 'undefined') {
  window.debugCheckoutNavigation = debugCheckoutNavigation;
  setupCheckoutTimeoutHandler();
}
