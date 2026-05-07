import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Data Backup Utility
 * 
 * Creates snapshots of user data before destructive operations
 * to enable data recovery if something goes wrong.
 */

/**
 * Create a backup snapshot of user data
 * 
 * @param {string} userId - The user's Firebase UID
 * @param {object} data - The data to backup
 * @param {string} reason - Reason for backup (e.g., 'pre-deletion', 'pre-migration')
 * @returns {Promise<string>} The backup ID
 */
export async function createBackup(userId, data, reason = 'manual') {
  try {
    const timestamp = Date.now();
    const backupId = `${timestamp}_${reason}`;
    
    const backupRef = doc(db, `backups/${userId}/snapshots/${backupId}`);
    
    const backupData = {
      userId,
      reason,
      timestamp: serverTimestamp(),
      timestampMs: timestamp,
      data,
      version: data.version || '1.0',
      metadata: {
        dataTypes: Object.keys(data),
        itemCounts: {}
      }
    };
    
    // Count items in each array
    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        backupData.metadata.itemCounts[key] = data[key].length;
      }
    });
    
    await setDoc(backupRef, backupData);
    
    console.log(`✅ Backup created: ${backupId}`, backupData.metadata.itemCounts);
    
    return backupId;
  } catch (error) {
    console.error(
      '❌ Failed to create backup:',
      error?.code || error?.name || '',
      error?.message || error
    );
    // Don't throw - backup failures shouldn't block the operation
    return null;
  }
}

/**
 * Create a backup before a destructive operation
 * Wrapper function with specific reason
 */
export async function backupBeforeDelete(userId, data) {
  return createBackup(userId, data, 'pre-deletion');
}

/**
 * Create a backup before a migration
 * Wrapper function with specific reason
 */
export async function backupBeforeMigration(userId, data) {
  return createBackup(userId, data, 'pre-migration');
}

/**
 * Create a backup before a bulk operation
 * Wrapper function with specific reason
 */
export async function backupBeforeBulkOperation(userId, data) {
  return createBackup(userId, data, 'pre-bulk-operation');
}

/**
 * Create a backup before admin script execution
 * Wrapper function with specific reason
 */
export async function backupBeforeAdminScript(userId, data, scriptName) {
  return createBackup(userId, data, `admin-${scriptName}`);
}

/**
 * List all backups for a user
 * 
 * @param {string} userId - The user's Firebase UID
 * @returns {Promise<Array>} Array of backup metadata
 */
export async function listBackups(userId) {
  try {
    const backupsRef = collection(db, `backups/${userId}/snapshots`);
    const snapshot = await getDocs(backupsRef);
    
    const backups = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      backups.push({
        id: doc.id,
        reason: data.reason,
        timestamp: data.timestampMs,
        version: data.version,
        metadata: data.metadata
      });
    });
    
    // Sort by timestamp descending (newest first)
    backups.sort((a, b) => b.timestamp - a.timestamp);
    
    return backups;
  } catch (error) {
    console.error('❌ Failed to list backups:', error);
    return [];
  }
}

/**
 * Restore data from a backup
 * 
 * @param {string} userId - The user's Firebase UID
 * @param {string} backupId - The backup ID to restore
 * @returns {Promise<object>} The restored data
 */
export async function restoreFromBackup(userId, backupId) {
  try {
    const backupRef = doc(db, `backups/${userId}/snapshots/${backupId}`);
    const backupSnap = await getDoc(backupRef);
    
    if (!backupSnap.exists()) {
      throw new Error(`Backup ${backupId} not found`);
    }
    
    const backupData = backupSnap.data();
    console.log(`✅ Restored backup: ${backupId}`, backupData.metadata);
    
    return backupData.data;
  } catch (error) {
    console.error('❌ Failed to restore backup:', error);
    throw error;
  }
}

/**
 * Delete old backups (retention policy)
 * Keeps backups for 30 days by default
 * 
 * @param {string} userId - The user's Firebase UID
 * @param {number} retentionDays - Number of days to keep backups (default: 30)
 */
export async function cleanupOldBackups(userId, retentionDays = 30) {
  try {
    const backupsRef = collection(db, `backups/${userId}/snapshots`);
    const snapshot = await getDocs(backupsRef);
    
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const deletePromises = [];
    let deletedCount = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.timestampMs < cutoffTime) {
        deletePromises.push(deleteDoc(doc.ref));
        deletedCount++;
      }
    });
    
    await Promise.all(deletePromises);
    
    if (deletedCount > 0) {
      console.log(`🗑️ Deleted ${deletedCount} old backups (older than ${retentionDays} days)`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('❌ Failed to cleanup old backups:', error);
    return 0;
  }
}
