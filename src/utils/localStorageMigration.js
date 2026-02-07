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
    console.log(`✅ Migration marked complete: ${migrationKey} v${version}`);
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
    console.log('ℹ️ Protocol history already migrated to cloud');
    return { alreadyMigrated: true };
  }
  
  try {
    console.log('🔄 Starting protocol history migration to cloud...');
    
    // Get all history entries from localStorage
    const historyEntries = getProtocolHistory();
    
    if (!historyEntries || historyEntries.length === 0) {
      console.log('ℹ️ No protocol history to migrate');
      markMigrationComplete(MIGRATION_KEY);
      return { migrated: 0 };
    }
    
    // Prepare entries with timestamps
    const preparedEntries = historyEntries.map(entry => 
      prepareItemForSave(entry, { preserveTimestamp: true }) // Preserve existing timestamps
    );
    
    console.log(`📦 Migrating ${preparedEntries.length} protocol history entries...`);
    
    // Save to cloud via the provided save function
    // This should be passed from AppContext which has access to saveAppData
    const result = await saveToCloud({ protocolHistory: preparedEntries });
    
    if (result) {
      markMigrationComplete(MIGRATION_KEY);
      console.log(`✅ Successfully migrated ${preparedEntries.length} protocol history entries to cloud`);
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
    console.log('ℹ️ User settings already migrated to cloud');
    return { alreadyMigrated: true };
  }
  
  try {
    console.log('🔄 Starting user settings migration to cloud...');
    
    // Get settings from localStorage
    const settingsStr = localStorage.getItem('tpprover_settings');
    if (!settingsStr) {
      console.log('ℹ️ No user settings to migrate');
      markMigrationComplete(MIGRATION_KEY);
      return { migrated: 0 };
    }
    
    const settings = JSON.parse(settingsStr);
    console.log('📦 Migrating user settings to cloud...');
    
    // Save to cloud
    const result = await saveToCloud({ userSettings: settings });
    
    if (result) {
      markMigrationComplete(MIGRATION_KEY);
      console.log('✅ Successfully migrated user settings to cloud');
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
 * Master migration function - runs all migrations in sequence
 * Call this once on login after user is authenticated
 * 
 * @param {Object} context - AppContext or object with save functions
 * @param {Function} context.saveAppData - Function to save data to cloud
 * @param {Object} context.firebaseUser - Authenticated Firebase user
 */
export async function runAllMigrations(context) {
  if (!context?.firebaseUser) {
    console.log('⏸️ Skipping migrations - no authenticated user');
    return { skipped: true };
  }
  
  console.log('🚀 Starting localStorage → cloud migrations...');
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
  
  // Run migrations in sequence
  results.protocolHistory = await migrateProtocolHistoryToCloud(saveToCloud);
  results.userSettings = await migrateUserSettingsToCloud(saveToCloud);
  
  // Summary
  const totalMigrated = 
    (results.protocolHistory?.migrated || 0) + 
    (results.userSettings?.migrated || 0);
  
  if (totalMigrated > 0) {
    console.log(`✅ Migration complete! ${totalMigrated} items synced to cloud`);
    
    // Dispatch event so UI can show a toast
    window.dispatchEvent(new CustomEvent('tpp:migration-complete', {
      detail: { 
        totalMigrated,
        results
      }
    }));
  } else {
    console.log('ℹ️ All migrations already completed or no data to migrate');
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
