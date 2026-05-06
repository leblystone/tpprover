/**
 * LocalStorage Migration Utility
 * Safely migrates localStorage data to cloud on login WITHOUT clearing user's local data
 * Non-destructive: keeps localStorage as fallback while syncing to cloud
 */

import { getProtocolHistory } from './protocolHistory';
import { prepareItemForSave } from './userDataSave';

/**
 * Check if migration has been completed for this user
 * Uses a versioned flag so we can run new migrations in the future
 */
function getMigrationStatus() {
  try {
    const status = localStorage.getItem('tpprover_migration_status');
    return status ? JSON.parse(status) : {};
  } catch (e) {
    console.warn('⚠️ Failed to read migration status:', e);
    return {};
  }
}

/**
 * Mark a specific migration as completed
 */
function markMigrationComplete(migrationKey, version = '1.0') {
  try {
    const status = getMigrationStatus();
    status[migrationKey] = {
      completed: true,
      version,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('tpprover_migration_status', JSON.stringify(status));
  } catch (e) {
    console.warn(`⚠️ Failed to mark migration complete: ${migrationKey}`, e);
  }
}

/**
 * Migrate protocol history from localStorage to cloud
 * Non-destructive: keeps localStorage data intact
 */
export async function migrateProtocolHistoryToCloud(saveToCloud) {
  const MIGRATION_KEY = 'protocolHistory';
  const status = getMigrationStatus();
  
  // Skip if already migrated
  if (status[MIGRATION_KEY]?.completed) {
    return { alreadyMigrated: true };
  }
  
  try {
    // Get all history entries from localStorage
    const historyEntries = getProtocolHistory();
    
    if (!historyEntries || historyEntries.length === 0) {
      markMigrationComplete(MIGRATION_KEY);
      return { migrated: 0 };
    }
    
    // Prepare entries with timestamps
    const preparedEntries = historyEntries.map(entry => 
      prepareItemForSave(entry, { preserveTimestamp: true }) // Preserve existing timestamps
    );
    
    // Save to cloud via the provided save function
    // This should be passed from AppContext which has access to saveAppData
    const result = await saveToCloud({ protocolHistory: preparedEntries });
    
    if (result) {
      markMigrationComplete(MIGRATION_KEY);
      return { migrated: preparedEntries.length };
    } else {
      console.error('❌ Migration failed - saveToCloud returned false');
      return { error: 'Save failed' };
    }
  } catch (error) {
    console.error('❌ Error during protocol history migration:', error);
    return { error: error.message };
  }
}

/**
 * Migrate custom settings that might be in localStorage but not in cloud
 * (e.g., notification preferences, UI preferences, etc.)
 */
export async function migrateUserSettingsToCloud(saveToCloud) {
  const MIGRATION_KEY = 'userSettings';
  const status = getMigrationStatus();
  
  if (status[MIGRATION_KEY]?.completed) {
    return { alreadyMigrated: true };
  }
  
  try {
    // Get settings from localStorage
    const settingsStr = localStorage.getItem('tpprover_settings');
    if (!settingsStr) {
      markMigrationComplete(MIGRATION_KEY);
      return { migrated: 0 };
    }
    
    const settings = JSON.parse(settingsStr);
    
    // Save to cloud
    const result = await saveToCloud({ userSettings: settings });
    
    if (result) {
      markMigrationComplete(MIGRATION_KEY);
      return { migrated: 1 };
    } else {
      console.error('❌ Settings migration failed');
      return { error: 'Save failed' };
    }
  } catch (error) {
    console.error('❌ Error during settings migration:', error);
    return { error: error.message };
  }
}

/**
 * One-time cleanup: replace garbage serialized serverTimestamp() sentinel objects
 * in localStorage with valid ISO timestamps.
 * 
 * BACKGROUND: Before the sentinel detection fix, serverTimestamp() sentinels were
 * saved as objects like {"_methodName":"serverTimestamp"} into localStorage because
 * JSON.stringify couldn't detect them in production builds. These garbage objects
 * break timestamp-based merge comparisons (they parse as timestamp 0), causing
 * cross-device sync to always prefer local data and discard remote edits.
 *
 * This migration:
 * 1. Scans all localStorage keys for items with garbage updatedAt objects
 * 2. Deletes the garbage updatedAt (sets to null) so getTimestamp() returns 0
 * 3. When both local (0) and Firebase (0) have garbage, the merge tie-breaker
 *    prefers SERVER — letting Firebase's canonical data win
 * 4. validateOnLoad also fixes Firebase's garbage timestamps to fresh ISO strings,
 *    so Firebase data wins outright (fresh ISO > null/0)
 * 5. Runs synchronously before any cloud merge to prevent the cascade
 *
 * v2: Changed from far-past ISO ("2000-01-01") to null deletion.
 *     Far-past was still > 0, causing local to beat Firebase's garbage (also 0).
 */
export function cleanupGarbageTimestamps() {
  const MIGRATION_KEY = 'garbageTimestampCleanup_v2';
  const status = getMigrationStatus();
  
  if (status[MIGRATION_KEY]?.completed) {
    return { alreadyDone: true };
  }
  
  
  // All localStorage keys that contain arrays of items with updatedAt
  const arrayKeys = [
    'tpprover_protocols',
    'tpprover_recon_items',
    'tpprover_recon_history',
    'tpprover_supplements',
    'tpprover_orders',
    'tpprover_metrics',
    'tpprover_vendors',
    'tpprover_stockpile',
    'tpprover_scheduled_buys',
    'tpprover_protocol_history',
    'tpprover_wishlist',
    'tpprover_user_notes',
    'tpprover_user_goals',
    'tpprover_injection_history'
  ];
  
  let totalCleaned = 0;
  
  /**
   * Check if a value is a garbage serialized sentinel.
   * In localStorage (after JSON parse), these look like:
   *   {"_methodName":"serverTimestamp"} or {"methodName":"serverTimestamp"} or {}
   * They should be objects that are NOT valid dates, NOT Firestore Timestamps, and NOT null.
   */
  function isGarbageTimestamp(val) {
    if (val == null) return false;
    if (typeof val !== 'object') return false;
    // A real Firestore Timestamp has toMillis; a Date has getTime
    if (typeof val.toMillis === 'function') return false;
    if (val instanceof Date) return false;
    // It's a plain object in a timestamp field → garbage
    return true;
  }
  
  /**
   * Recursively clean garbage timestamps in an item and its nested arrays.
   * Returns true if any field was cleaned.
   */
  function cleanItem(item) {
    if (!item || typeof item !== 'object') return false;
    let cleaned = false;
    
    if (isGarbageTimestamp(item.updatedAt)) {
      item.updatedAt = (item.createdAt && !isGarbageTimestamp(item.createdAt))
        ? item.createdAt
        : new Date().toISOString();
      cleaned = true;
    }
    if (isGarbageTimestamp(item.createdAt)) {
      item.createdAt = item.updatedAt || new Date().toISOString();
      cleaned = true;
    }
    
    // Check nested arrays (e.g., protocol.peptides[].titration[])
    for (const key of Object.keys(item)) {
      const val = item[key];
      if (Array.isArray(val)) {
        for (const nested of val) {
          if (nested && typeof nested === 'object') {
            if (cleanItem(nested)) cleaned = true;
          }
        }
      } else if (val && typeof val === 'object' && !isGarbageTimestamp(val) && !(val instanceof Date)) {
        // Nested object (not a garbage timestamp itself)
        if (cleanItem(val)) cleaned = true;
      }
    }
    
    return cleaned;
  }
  
  for (const key of arrayKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      
      const items = JSON.parse(raw);
      if (!Array.isArray(items)) continue;
      
      let keyCleaned = 0;
      for (const item of items) {
        if (cleanItem(item)) keyCleaned++;
      }
      
      if (keyCleaned > 0) {
        localStorage.setItem(key, JSON.stringify(items));
        totalCleaned += keyCleaned;
      }
    } catch (e) {
      console.warn(`  ⚠️ Failed to clean ${key}:`, e);
    }
  }
  
  markMigrationComplete(MIGRATION_KEY, '2.0');
  return { cleaned: totalCleaned };
}

/**
 * Ensure all array items in synced localStorage keys have id + updatedAt.
 * Legacy entries without these fields get silently dropped during
 * mergeWithTimestamps (which skips items without id). This migration
 * patches them in-place so they survive cloud sync.
 *
 * Runs synchronously on startup before any cloud merge.
 */
export function ensureLegacyItemIds() {
  const MIGRATION_KEY = 'legacyItemIds_v1';
  const status = getMigrationStatus();
  
  if (status[MIGRATION_KEY]?.completed) {
    return { alreadyDone: true };
  }
  
  
  const arrayKeys = [
    'tpprover_recon_history',
    'tpprover_recon_items',
    'tpprover_orders',
    'tpprover_stockpile',
    'tpprover_supplements',
    'tpprover_vendors',
    'tpprover_scheduled_buys',
    'tpprover_user_notes',
    'tpprover_user_goals'
  ];
  
  let totalPatched = 0;
  
  arrayKeys.forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const items = JSON.parse(raw);
      if (!Array.isArray(items) || items.length === 0) return;
      
      let keyPatched = 0;
      const fixed = items.map(item => {
        if (!item || typeof item !== 'object') return item;
        let patched = false;
        const copy = { ...item };
        if (!copy.id) {
          copy.id = prepareItemForSave(copy).id;
          patched = true;
        }
        if (!copy.updatedAt) {
          copy.updatedAt = new Date().toISOString();
          patched = true;
        }
        if (patched) keyPatched++;
        return patched ? copy : item;
      });
      
      if (keyPatched > 0) {
        localStorage.setItem(key, JSON.stringify(fixed));
        totalPatched += keyPatched;
      }
    } catch (e) {
      console.warn(`  ⚠️ Failed to patch ${key}:`, e);
    }
  });
  
  markMigrationComplete(MIGRATION_KEY, '1.0');
  return { patched: totalPatched };
}

/**
 * Master migration function - runs all migrations in sequence
 * Call this once on login after user is authenticated
 * 
 * @param {Object} context - AppContext or object with save functions
 * @param {Function} context.saveAppData - Function to save data to cloud
 * @param {Object} context.firebaseUser - Authenticated Firebase user
 */
export async function runAllMigrations(context) {
  if (!context?.firebaseUser) {
    return { skipped: true };
  }
  const results = {};
  
  // Helper to save data to cloud
  const saveToCloud = async (dataToMerge) => {
    try {
      const { saveAppData, firebaseUser } = context;
      if (!saveAppData || !firebaseUser) {
        throw new Error('Missing saveAppData function or firebaseUser');
      }
      
      // Load current cloud data first
      const { loadAppData } = await import('../services/cloudStorage');
      const currentData = await loadAppData(firebaseUser.uid);
      
      // Merge with new data (cloud takes precedence if conflicts)
      const mergedData = {
        ...currentData,
        ...dataToMerge,
        // For arrays, merge intelligently (combine + dedupe by id)
        protocolHistory: mergeArrays(
          currentData?.protocolHistory || [],
          dataToMerge?.protocolHistory || []
        )
      };
      
      // Save merged data
      return await saveAppData(firebaseUser.uid, mergedData, { skipMerge: false });
    } catch (error) {
      console.error('❌ Error in saveToCloud:', error);
      return false;
    }
  };
  
  // Run synchronous migrations FIRST (no cloud needed)
  results.timestampCleanup = cleanupGarbageTimestamps();
  results.legacyItemIds = ensureLegacyItemIds();
  
  // Run migrations in sequence
  results.protocolHistory = await migrateProtocolHistoryToCloud(saveToCloud);
  results.userSettings = await migrateUserSettingsToCloud(saveToCloud);
  
  // Summary
  const totalMigrated = 
    (results.protocolHistory?.migrated || 0) + 
    (results.userSettings?.migrated || 0);
  
  if (totalMigrated > 0) {
    window.dispatchEvent(new CustomEvent('tpp:migration-complete', {
      detail: { 
        totalMigrated,
        results
      }
    }));
  }
  
  return results;
}

/**
 * Helper: Merge two arrays by ID, keeping newer items
 * If timestamps are equal, keep the item from the first array (cloud)
 */
function mergeArrays(cloudArray, localArray) {
  const merged = new Map();
  
  // Add cloud items first (they take precedence)
  cloudArray.forEach(item => {
    if (item.id) {
      merged.set(item.id, item);
    }
  });
  
  // Add local items only if:
  // 1. They don't exist in cloud, OR
  // 2. They have a newer timestamp than cloud version
  localArray.forEach(localItem => {
    if (!localItem.id) return;
    
    const cloudItem = merged.get(localItem.id);
    if (!cloudItem) {
      // New item not in cloud - add it
      merged.set(localItem.id, localItem);
    } else {
      // Compare timestamps
      const cloudTime = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
      const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
      
      if (localTime > cloudTime) {
        // Local is newer - use it
        merged.set(localItem.id, localItem);
      }
      // Otherwise keep cloud version
    }
  });
  
  return Array.from(merged.values());
}

/**
 * Reset migration status (for testing/debugging only)
 * NOT recommended for production use
 */
export function resetMigrationStatus() {
  try {
    localStorage.removeItem('tpprover_migration_status');
    console.log('🔄 Migration status reset');
  } catch (e) {
    console.warn('⚠️ Failed to reset migration status:', e);
  }
}
