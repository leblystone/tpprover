/**
 * Clear ALL user-specific localStorage data
 * This is CRITICAL for preventing data bleeding between accounts
 */

// List of ALL keys that should be KEPT (minimal - preferences only)
// CRITICAL: tpprover_last_user_email MUST be cleared on logout to enable account switch detection
const KEYS_TO_KEEP = [
  'tpprover_theme',
  'tpprover_settings',
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

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('tpprover_')) {
      keysToRemove.push(key);
    }
  }

  console.log(`🧹 Removing ${keysToRemove.length} localStorage keys`);
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  console.log('✅ LocalStorage cleared');
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

