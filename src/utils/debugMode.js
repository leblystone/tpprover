/**
 * Debug Mode Utility
 * Controls whether debug logging is enabled throughout the app
 */

// Check for debug mode in localStorage or URL params
const isDebugMode = () => {
  // Check URL parameter first
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('debug')) {
    return urlParams.get('debug') === 'true';
  }
  
  // Check localStorage
  try {
    const debugSetting = localStorage.getItem('tpp_debug_mode');
    return debugSetting === 'true';
  } catch {
    return false;
  }
};

// Toggle debug mode
export const toggleDebugMode = (enabled = null) => {
  const newState = enabled !== null ? enabled : !isDebugMode();
  localStorage.setItem('tpp_debug_mode', newState.toString());
  
  // Reload page to apply changes
  if (window.confirm(`Debug mode ${newState ? 'enabled' : 'disabled'}. Reload page to apply changes?`)) {
    window.location.reload();
  }
  
  return newState;
};

// Check if debug logging should be enabled
export const shouldLog = (category = 'general') => {
  if (!isDebugMode()) return false;
  
  // You can add category-specific logging here
  // For now, just return true if debug mode is on
  return true;
};

// Debug logging wrapper
export const debugLog = (message, data = null, category = 'general') => {
  if (!shouldLog(category)) return;
  
  if (data) {
    console.log(message, data);
  } else {
    console.log(message);
  }
};

// Production-safe logging - only logs in development or when debug mode is enabled
export const devLog = (message, data = null) => {
  if (process.env.NODE_ENV === 'development' || shouldLog()) {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

// Always log errors and warnings
export const logError = (message, error = null) => {
  if (error) {
    console.error(message, error);
  } else {
    console.error(message);
  }
};

export const logWarning = (message, data = null) => {
  if (data) {
    console.warn(message, data);
  } else {
    console.warn(message);
  }
};

// Export current debug state
export const getDebugMode = isDebugMode;

// Expose to window for easy access
if (typeof window !== 'undefined') {
  window.toggleDebugMode = toggleDebugMode;
  window.getDebugMode = getDebugMode;
}
