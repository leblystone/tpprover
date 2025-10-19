/**
 * Clear ALL user-specific localStorage data
 * This is CRITICAL for preventing data bleeding between accounts
 */

// List of ALL keys that should be KEPT (minimal - auth only)
const KEYS_TO_KEEP = [
  'tpprover_theme', // Keep for UX (instant load)
  'tpprover_settings', // Keep for UX (instant load)
  'tpprover_last_user_email', // Keep for security tracking
];

/**
 * Clear all user-specific data from localStorage
 * Called on logout or user change
 */
export function clearAllUserData() {
  console.log('🧹 CLEARING ALL USER DATA FROM LOCALSTORAGE');
  
  const keysToRemove = [];
  
  // Get all tpprover_ keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('tpprover_') && !KEYS_TO_KEEP.includes(key)) {
      keysToRemove.push(key);
    }
  }
  
  console.log(`🧹 Removing ${keysToRemove.length} localStorage keys:`, keysToRemove);
  
  // Remove all keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log('✅ User data cleared from localStorage');
}

/**
 * Clear ALL localStorage data (including theme/settings)
 * Use for complete reset only
 */
export function clearAllLocalStorage() {
  console.log('🧹 CLEARING ALL LOCALSTORAGE (COMPLETE RESET)');
  
  const keysToRemove = [];
  
  // Get all tpprover_ keys (no exceptions)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('tpprover_')) {
      keysToRemove.push(key);
    }
  }
  
  console.log(`🧹 Removing ALL ${keysToRemove.length} localStorage keys`);
  
  // Remove all keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log('✅ All localStorage cleared');
}

/**
 * Verify user data is clear
 */
export function verifyUserDataCleared() {
  const remainingKeys = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('tpprover_') && !KEYS_TO_KEEP.includes(key)) {
      remainingKeys.push(key);
    }
  }
  
  if (remainingKeys.length > 0) {
    console.warn('⚠️ User data NOT fully cleared. Remaining keys:', remainingKeys);
    return false;
  }
  
  console.log('✅ User data fully cleared - no user-specific keys remain');
  return true;
}

