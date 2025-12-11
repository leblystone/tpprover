/**
 * Deletion Tracking System
 * Tracks deleted items with timestamps to prevent them from being restored during merges
 */

const DELETION_TRACKING_KEY = 'tpprover_deletion_tracking';
const DELETION_RETENTION_DAYS = 14; // Keep deletion records for 14 days

/**
 * Get deletion tracking data from localStorage
 */
export function getDeletionTracking() {
  try {
    const saved = localStorage.getItem(DELETION_TRACKING_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * Save deletion tracking data to localStorage
 */
function saveDeletionTracking(tracking) {
  try {
    localStorage.setItem(DELETION_TRACKING_KEY, JSON.stringify(tracking));
  } catch (error) {
    console.error('Failed to save deletion tracking:', error);
  }
}

/**
 * Record a deleted item
 * @param {string} dataType - Type of data (e.g., 'orders', 'protocols', 'stockpile')
 * @param {string} itemId - ID of the deleted item
 * @param {Object} itemData - Optional: Full item data snapshot for restore functionality
 */
export function recordDeletion(dataType, itemId, itemData = null) {
  if (!dataType || !itemId) {
    console.warn('⚠️ Cannot record deletion - missing dataType or itemId');
    return;
  }

  const tracking = getDeletionTracking();
  
  if (!tracking[dataType]) {
    tracking[dataType] = {};
  }

  // Record deletion with current timestamp and optional item snapshot
  tracking[dataType][itemId] = {
    deletedAt: new Date().toISOString(),
    timestamp: Date.now(),
    ...(itemData && { itemData }) // Store item snapshot if provided
  };

  saveDeletionTracking(tracking);
  console.log(`🗑️ Recorded deletion: ${dataType}/${itemId}${itemData ? ' (with snapshot)' : ''}`);
}

/**
 * Check if an item is marked as deleted
 * @param {string} dataType - Type of data
 * @param {string} itemId - ID of the item to check
 * @returns {boolean} True if item is marked as deleted
 */
export function isDeleted(dataType, itemId) {
  const tracking = getDeletionTracking();
  return !!(tracking[dataType] && tracking[dataType][itemId]);
}

/**
 * Get deletion timestamp for an item
 * @param {string} dataType - Type of data
 * @param {string} itemId - ID of the item
 * @returns {number|null} Timestamp of deletion or null if not deleted
 */
export function getDeletionTimestamp(dataType, itemId) {
  const tracking = getDeletionTracking();
  if (tracking[dataType] && tracking[dataType][itemId]) {
    return tracking[dataType][itemId].timestamp || null;
  }
  return null;
}

/**
 * Remove a deletion record (for undo/restore functionality)
 * @param {string} dataType - Type of data
 * @param {string} itemId - ID of the item
 */
export function clearDeletionRecord(dataType, itemId) {
  const tracking = getDeletionTracking();
  if (tracking[dataType] && tracking[dataType][itemId]) {
    delete tracking[dataType][itemId];
    if (Object.keys(tracking[dataType]).length === 0) {
      delete tracking[dataType];
    }
    saveDeletionTracking(tracking);
    console.log(`↩️ Cleared deletion record: ${dataType}/${itemId}`);
  }
}

/**
 * Clean up old deletion records (older than retention period)
 */
export function cleanupOldDeletions() {
  const tracking = getDeletionTracking();
  const cutoffTime = Date.now() - (DELETION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  let cleaned = false;

  Object.keys(tracking).forEach(dataType => {
    const deletions = tracking[dataType];
    Object.keys(deletions).forEach(itemId => {
      const deletionTime = deletions[itemId].timestamp || 0;
      if (deletionTime < cutoffTime) {
        delete deletions[itemId];
        cleaned = true;
      }
    });
    
    // Remove empty data type entries
    if (Object.keys(deletions).length === 0) {
      delete tracking[dataType];
    }
  });

  if (cleaned) {
    saveDeletionTracking(tracking);
    console.log('🧹 Cleaned up old deletion records');
  }
}

/**
 * Get all deleted item IDs for a data type
 * @param {string} dataType - Type of data
 * @returns {string[]} Array of deleted item IDs
 */
export function getDeletedItems(dataType) {
  const tracking = getDeletionTracking();
  return tracking[dataType] ? Object.keys(tracking[dataType]) : [];
}

/**
 * Get all deleted items with their data for display/restore
 * @param {number} maxAgeMs - Optional: Maximum age in milliseconds (default: 14 days)
 * @returns {Array} Array of deleted items with { dataType, itemId, itemData, deletedAt, timestamp }
 */
export function getDeletedItemsForRestore(maxAgeMs = null) {
  const tracking = getDeletionTracking();
  const cutoffTime = maxAgeMs ? Date.now() - maxAgeMs : null;
  const result = [];

  Object.keys(tracking).forEach(dataType => {
    const deletions = tracking[dataType];
    Object.keys(deletions).forEach(itemId => {
      const deletion = deletions[itemId];
      const deletionTime = deletion.timestamp || 0;

      // Skip if older than maxAge
      if (cutoffTime && deletionTime < cutoffTime) {
        return;
      }

      // Only include items with data snapshots (can be restored)
      if (deletion.itemData) {
        result.push({
          dataType,
          itemId,
          itemData: deletion.itemData,
          deletedAt: deletion.deletedAt,
          timestamp: deletionTime
        });
      }
    });
  });

  // Sort by deletion time (most recent first)
  return result.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get deleted item data for a specific item
 * @param {string} dataType - Type of data
 * @param {string} itemId - ID of the item
 * @returns {Object|null} Item data snapshot or null if not found
 */
export function getDeletedItemData(dataType, itemId) {
  const tracking = getDeletionTracking();
  if (tracking[dataType] && tracking[dataType][itemId] && tracking[dataType][itemId].itemData) {
    return tracking[dataType][itemId].itemData;
  }
  return null;
}

/**
 * Merge deletion tracking from multiple sources
 * Prefers newer deletions (more recent timestamp wins)
 * @param {Object} localTracking - Local deletion tracking
 * @param {Object} serverTracking - Server deletion tracking
 * @returns {Object} Merged deletion tracking
 */
export function mergeDeletionTracking(localTracking, serverTracking) {
  if (!localTracking || typeof localTracking !== 'object') localTracking = {};
  if (!serverTracking || typeof serverTracking !== 'object') serverTracking = {};

  const merged = { ...serverTracking };

  // Merge local deletions into server deletions
  Object.keys(localTracking).forEach(dataType => {
    if (!merged[dataType]) {
      merged[dataType] = {};
    }

    const localDeletions = localTracking[dataType] || {};
    const serverDeletions = merged[dataType] || {};

    Object.keys(localDeletions).forEach(itemId => {
      const localDeletion = localDeletions[itemId];
      const serverDeletion = serverDeletions[itemId];

      if (!serverDeletion) {
        // Local deletion not on server - add it
        merged[dataType][itemId] = localDeletion;
      } else {
        // Both have deletion - prefer newer one
        const localTime = localDeletion.timestamp || 0;
        const serverTime = serverDeletion.timestamp || 0;
        
        if (localTime > serverTime) {
          merged[dataType][itemId] = localDeletion;
        } else {
          merged[dataType][itemId] = serverDeletion;
        }
      }
    });
  });

  return merged;
}

/**
 * Initialize deletion tracking cleanup on app load
 */
export function initializeDeletionTracking() {
  // Clean up old deletions on startup
  cleanupOldDeletions();
  
  // Set up periodic cleanup (once per day)
  const lastCleanup = localStorage.getItem('tpprover_last_deletion_cleanup');
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  if (!lastCleanup || (now - parseInt(lastCleanup, 10)) > oneDay) {
    cleanupOldDeletions();
    localStorage.setItem('tpprover_last_deletion_cleanup', now.toString());
  }
}

