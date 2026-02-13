import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getDeletionTracking, mergeDeletionTracking, clearDeletionRecord } from '../utils/deletionTracking';
import { ensureInjectionHistoryIds } from '../utils/injectionTracking';
import { APP_VERSION } from '../utils/appVersion';

/**
 * Cloud Storage Service - Primary storage for all user data
 * Replaces localStorage to prevent data bleeding between accounts
 */

/**
 * ⚠️ IMPORTANT: READ BEFORE MODIFYING
 * 
 * This file handles user data saving and syncing across devices.
 * ALL changes that touch user data MUST follow the app's standardized pattern.
 * 
 * 📖 READ: USER_DATA_SAVE_PATTERN.md (in project root)
 * 📖 READ: CONTRIBUTING.md (in project root)
 * 
 * Key requirements:
 * - Use prepareItemForSave() from src/utils/userDataSave.js for all creates/updates
 * - Ensure every item has id and updatedAt timestamps
 * - Follow the "three steps" pattern: state → localStorage → cloud sync
 * - Use timestamp-based merging to prevent data loss on multi-device sync
 * 
 * Violating this pattern causes data loss, sync bugs, and cross-device conflicts.
 */

// User data collections
const COLLECTIONS = {
  USER_DATA: 'userData',
  USER_PREFERENCES: 'userPreferences', 
  USER_SUBSCRIPTION: 'userSubscriptions',
  USER_STATE: 'userState'
};

/**
 * Get user document reference
 */
function getUserDoc(userId, collection = COLLECTIONS.USER_DATA) {
  return doc(db, collection, userId);
}

/**
 * Deep clean data to remove undefined and null values recursively
 */
function deepCleanData(data) {
  if (data === null || data === undefined) {
    return null;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => deepCleanData(item)).filter(item => item !== null && item !== undefined);
  }
  
  if (typeof data === 'object') {
    const cleaned = {};
    Object.keys(data).forEach(key => {
      const cleanedValue = deepCleanData(data[key]);
      if (cleanedValue !== null && cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    });
    return cleaned;
  }
  
  return data;
}

/**
 * Save user data to cloud storage
 * Uses Firestore serverTimestamp() for accurate cross-device sync
 */
export async function saveUserData(userId, data, collection = COLLECTIONS.USER_DATA) {
  try {
    const userDoc = getUserDoc(userId, collection);
    
    // Use deep cleaning function to remove undefined and null values
    const cleanData = deepCleanData(data);
    
    // Final validation - ensure no undefined values remain
    // Use serverTimestamp() for accurate cross-device timestamp
    const finalData = {
      ...cleanData,
      userId,
      lastUpdated: serverTimestamp(), // ✅ Server-side timestamp
      version: APP_VERSION // ✅ Dynamic version from package.json
    };
    
    await setDoc(userDoc, finalData, { merge: true });
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to save user data to cloud:`, error);
    console.error(`❌ Error details:`, {
      userId,
      collection,
      errorMessage: error.message,
      errorCode: error.code
    });
    return false;
  }
}

/**
 * Load user data from cloud storage
 */
export async function loadUserData(userId, collection = COLLECTIONS.USER_DATA) {
  try {
    const userDoc = getUserDoc(userId, collection);
    const docSnap = await getDoc(userDoc);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`❌ Failed to load user data from cloud:`, error);
    return null;
  }
}

/**
 * Helper: Add updatedAt timestamp to items if missing
 * Uses serverTimestamp() for new items to ensure accurate cross-device sync
 * Existing timestamps are preserved (already synced from server)
 * In development, logs a warning if items lack updatedAt (enforcement for USER_DATA_SAVE_PATTERN).
 */
function ensureTimestamps(items) {
  if (!Array.isArray(items)) return items;
  if (process.env.NODE_ENV === 'development') {
    const missing = items.filter((item) => item != null && (item.updatedAt == null || item.updatedAt === ''));
    if (missing.length > 0) {
      console.warn(
        '[userDataSave] Some array items are missing updatedAt — merge may be incorrect. Use prepareItemForSave() when creating/updating. See USER_DATA_SAVE_PATTERN.md.',
        { count: missing.length, sampleIds: missing.slice(0, 3).map((i) => i?.id) }
      );
    }
  }
  return items.map(item => ({
    ...item,
    // Keep existing timestamp if present (already synced from server)
    // New items will get serverTimestamp when saved to Firestore
    updatedAt: item.updatedAt || serverTimestamp()
  }));
}

/**
 * Helper: Merge arrays with timestamp-based conflict resolution
 * Server data wins if it has newer timestamps
 * Respects deletion tracking to prevent deleted items from being restored
 * @param {Array} localItems - Local items array
 * @param {Array} serverItems - Server items array
 * @param {string} dataType - Type of data (e.g., 'orders', 'protocols') for deletion tracking
 * @param {Object} deletionTracking - Deletion tracking data (optional, will be loaded if not provided)
 */
export function mergeWithTimestamps(localItems, serverItems, dataType = null, deletionTracking = null) {
  if (!Array.isArray(localItems)) localItems = [];
  if (!Array.isArray(serverItems)) serverItems = [];
  
  // Load deletion tracking if dataType is provided and tracking not passed
  let deletions = deletionTracking;
  if (dataType && !deletions) {
    try {
      const tracking = getDeletionTracking();
      deletions = tracking[dataType] || {};
    } catch (error) {
      console.warn('⚠️ Could not load deletion tracking:', error);
      deletions = {};
    }
  } else if (!deletions) {
    deletions = {};
  }
  
  const itemMap = new Map();
  
  // Add server items first, but exclude deleted items
  serverItems.forEach(item => {
    if (item.id) {
      // Check if this item was deleted locally (and deletion is recent)
      const deletionRecord = deletions[item.id];
      if (deletionRecord) {
        // Item was deleted - check if deletion is newer than server item
        const deletionTime = deletionRecord.timestamp || 0;
        
        // Get server timestamp (handle serverTimestamp() sentinels same as main merge)
        let serverTime = 0;
        if (item.updatedAt) {
          if (item.updatedAt.toMillis) {
            serverTime = item.updatedAt.toMillis(); // Firestore Timestamp
          } else if (typeof item.updatedAt === 'object' && !item.updatedAt.toMillis) {
            serverTime = Date.now() + 5000; // serverTimestamp() sentinel - treat as "now + buffer"
          } else {
            serverTime = new Date(item.updatedAt).getTime(); // ISO string
          }
        }
        
        console.log(`🔍 [${dataType}] Server item ${item.id.substring(0,8)} vs deletion:`, {
          deletionTime,
          serverTime,
          willExclude: deletionTime > serverTime
        });
        
        // If deletion is newer than server update, exclude the item
        if (deletionTime > serverTime) {
          console.log(`🚫 Excluding deleted ${dataType} item from merge: ${item.id}`);
          return; // Skip this item
        }
        // If server update is newer than deletion, the item was recreated - include it and clear stale deletion
        console.log(`✅ Server version of ${dataType} item ${item.id.substring(0,8)} is newer - including it and clearing stale deletion`);
        clearDeletionRecord(dataType, item.id);
      }
      itemMap.set(item.id, item);
    }
  });
  
  // Add or update with local items (only if they're newer or don't exist on server)
  localItems.forEach(localItem => {
    if (!localItem.id) return;
    
    // Skip if this item is marked as deleted
    if (deletions[localItem.id]) {
      console.log(`🚫 Skipping deleted local ${dataType} item: ${localItem.id}`);
      return;
    }
    
    const serverItem = itemMap.get(localItem.id);
    
    if (!serverItem) {
      // New item not on server - add it
      itemMap.set(localItem.id, localItem);
    } else {
      // Item exists on both - compare timestamps
      // Handle both ISO strings (from client) and Firestore Timestamps (from server)
      const getTimestamp = (item) => {
        if (!item.updatedAt) return 0;
        // If it's a Firestore Timestamp object, convert to milliseconds
        if (item.updatedAt.toMillis) {
          return item.updatedAt.toMillis();
        }
        // If it's a serverTimestamp() sentinel (before save), treat as "now + buffer"
        // Add 5 seconds to ensure local edits ALWAYS win over simultaneous cloud timestamps
        if (typeof item.updatedAt === 'object' && !item.updatedAt.toMillis) {
          return Date.now() + 5000; // Add 5s buffer to guarantee local wins
        }
        // If it's an ISO string or Date, convert normally
        const timestamp = new Date(item.updatedAt).getTime();
        return isNaN(timestamp) ? 0 : timestamp;
      };
      
      const localTime = getTimestamp(localItem);
      const serverTime = getTimestamp(serverItem);
      
      // DEBUG: Log comparison for protocols (only when there's a conflict)
      if (dataType === 'protocols' && localTime !== serverTime) {
        const formatTime = (timestamp) => {
          if (!timestamp || isNaN(timestamp)) return 'NO_TIMESTAMP';
          try {
            return new Date(timestamp).toISOString();
          } catch (e) {
            return `INVALID(${timestamp})`;
          }
        };
        
        const winner = localTime > serverTime ? 'LOCAL' : 'SERVER';
        console.log(`🔍 Protocol conflict: ${localItem.name || localItem.id} - ${winner} wins`, {
          localTime: formatTime(localTime),
          serverTime: formatTime(serverTime),
          localRaw: localTime,
          serverRaw: serverTime
        });
      }
      
      if (localTime > serverTime) {
        // Local is newer - use it
        itemMap.set(localItem.id, localItem);
      } else if (serverTime > localTime) {
        // Server is newer - use it
        itemMap.set(localItem.id, serverItem);
      } else {
        // Same timestamp or both missing - prefer local (benefit of doubt)
        itemMap.set(localItem.id, localItem);
      }
    }
  });
  
  return Array.from(itemMap.values());
}

/**
 * Helper: Merge task completion data objects WITH TIMESTAMP COMPARISON
 * Structure (new): { [date]: { [timeSlot]: { [taskId]: { completed: bool, timestamp: number } } } }
 * Structure (old): { [date]: { [timeSlot]: { [taskId]: boolean } } }
 * Backwards compatible: handles both old (boolean) and new (object) formats
 * Exported for last-chance sync when auth is lost (spontaneous logout).
 */
export function mergeTaskCompletion(localData, serverData) {
  if (!localData || typeof localData !== 'object') localData = {};
  if (!serverData || typeof serverData !== 'object') serverData = {};
  
  const merged = {};
  
  // Helper to get timestamp from task data
  const getTimestamp = (taskData) => {
    if (taskData && typeof taskData === 'object' && taskData.timestamp) {
      return taskData.timestamp; // New format
    }
    return 0; // Old format (boolean) or missing - treat as oldest
  };
  
  // Helper to check if task is completed
  const isCompleted = (taskData) => {
    if (taskData === true) return true; // Old format
    if (taskData && typeof taskData === 'object') return taskData.completed === true; // New format
    return false;
  };
  
  // Collect all dates from both local and server
  const allDates = new Set([...Object.keys(localData), ...Object.keys(serverData)]);
  
  allDates.forEach(date => {
    merged[date] = {};
    const localDayData = localData[date] || {};
    const serverDayData = serverData[date] || {};
    
    // Collect all time slots
    const allSlots = new Set([...Object.keys(localDayData), ...Object.keys(serverDayData)]);
    
    allSlots.forEach(timeSlot => {
      merged[date][timeSlot] = {};
      const localSlotData = localDayData[timeSlot] || {};
      const serverSlotData = serverDayData[timeSlot] || {};
      
      // Collect all task IDs
      const allTaskIds = new Set([...Object.keys(localSlotData), ...Object.keys(serverSlotData)]);
      
      allTaskIds.forEach(taskId => {
        const localTask = localSlotData[taskId];
        const serverTask = serverSlotData[taskId];
        
        // Compare timestamps - newer wins
        const localTimestamp = getTimestamp(localTask);
        const serverTimestamp = getTimestamp(serverTask);
        
        if (localTimestamp > serverTimestamp) {
          // Local is newer - use it (only if completed)
          if (isCompleted(localTask)) {
            merged[date][timeSlot][taskId] = localTask;
          }
        } else if (serverTimestamp > localTimestamp) {
          // Server is newer - use it (only if completed)
          if (isCompleted(serverTask)) {
            merged[date][timeSlot][taskId] = serverTask;
          }
        } else {
          // Same timestamp or both old format - prefer local
          if (isCompleted(localTask)) {
            merged[date][timeSlot][taskId] = localTask;
          } else if (isCompleted(serverTask)) {
            merged[date][timeSlot][taskId] = serverTask;
          }
        }
      });
      
      // Clean up empty slots
      if (Object.keys(merged[date][timeSlot]).length === 0) {
        delete merged[date][timeSlot];
      }
    });
    
    // Clean up empty dates
    if (Object.keys(merged[date]).length === 0) {
      delete merged[date];
    }
  });
  
  return merged;
}

/**
 * Helper: Merge injection history arrays
 * Dedupe by id; keep record with higher timestamp. Sort by timestamp desc.
 */
export function mergeInjectionHistory(localArr, serverArr) {
  const local = Array.isArray(localArr) ? localArr : [];
  const server = Array.isArray(serverArr) ? serverArr : [];
  const byId = new Map();
  const ts = (r) => (r && (r.timestamp != null)) ? Number(r.timestamp) : (r && r.date ? new Date(r.date).getTime() : 0);
  [...server, ...local].forEach((r) => {
    if (!r || typeof r !== 'object') return;
    const id = r.id || `legacy_${ts(r)}_${Math.random().toString(36).slice(2)}`;
    const existing = byId.get(id);
    if (!existing || ts(r) > ts(existing)) byId.set(id, { ...r, id });
  });
  const merged = Array.from(byId.values()).sort((a, b) => ts(b) - ts(a));
  ensureInjectionHistoryIds(merged);
  return merged.slice(0, 1000);
}

/**
 * Helper: Merge injection stats objects WITH TIMESTAMP COMPARISON
 * Structure (new): { sites: { siteName: { count: number, lastUpdated: number } } }
 * Structure (old): { sites: { siteName: number } }
 * Backwards compatible: handles both old (number) and new (object) formats
 */
export function mergeInjectionStats(localData, serverData) {
  const def = { global: { totalInjections: 0, sites: {}, lastInjection: null }, tasks: {} };
  const local = localData && typeof localData === 'object' ? localData : def;
  const server = serverData && typeof serverData === 'object' ? serverData : def;
  
  // Helper to get count from site data
  const getSiteCount = (siteData) => {
    if (typeof siteData === 'number') return siteData; // Old format
    if (siteData && typeof siteData === 'object') return siteData.count || 0; // New format
    return 0;
  };
  
  // Helper to get timestamp from site data
  const getSiteTimestamp = (siteData) => {
    if (siteData && typeof siteData === 'object' && siteData.lastUpdated) {
      return siteData.lastUpdated; // New format
    }
    return 0; // Old format - treat as oldest
  };
  
  // Helper to merge site objects with timestamp comparison
  const mergeSites = (localSites, serverSites) => {
    const merged = {};
    // Ensure both inputs are objects
    const safeLo = (localSites && typeof localSites === 'object') ? localSites : {};
    const safeSer = (serverSites && typeof serverSites === 'object') ? serverSites : {};
    const allSites = new Set([...Object.keys(safeLo), ...Object.keys(safeSer)]);
    
    allSites.forEach(siteName => {
      const localSite = safeLo[siteName];
      const serverSite = safeSer[siteName];
      
      const localTimestamp = getSiteTimestamp(localSite);
      const serverTimestamp = getSiteTimestamp(serverSite);
      
      if (localTimestamp > serverTimestamp) {
        // Local is newer
        merged[siteName] = typeof localSite === 'number' 
          ? { count: localSite, lastUpdated: Date.now() } // Convert old format
          : localSite; // Keep new format
      } else if (serverTimestamp > localTimestamp) {
        // Server is newer
        merged[siteName] = typeof serverSite === 'number'
          ? { count: serverSite, lastUpdated: Date.now() } // Convert old format
          : serverSite; // Keep new format
      } else {
        // Same timestamp or both old - prefer local, higher count
        const localCount = getSiteCount(localSite);
        const serverCount = getSiteCount(serverSite);
        if (localCount >= serverCount) {
          merged[siteName] = typeof localSite === 'number'
            ? { count: localSite, lastUpdated: Date.now() }
            : localSite;
        } else {
          merged[siteName] = typeof serverSite === 'number'
            ? { count: serverSite, lastUpdated: Date.now() }
            : serverSite;
        }
      }
    });
    
    return merged;
  };
  
  // Merge global stats
  const mergedGlobal = {
    totalInjections: Math.max(
      local.global?.totalInjections || 0,
      server.global?.totalInjections || 0
    ),
    sites: mergeSites(local.global?.sites, server.global?.sites),
    lastInjection: local.global?.lastInjection || server.global?.lastInjection || null
  };
  
  // Merge task-specific stats
  const mergedTasks = {};
  const localTasks = local.tasks || {};
  const serverTasks = server.tasks || {};
  const allTasks = new Set([...Object.keys(localTasks), ...Object.keys(serverTasks)]);
  
  allTasks.forEach(taskName => {
    const localTask = localTasks[taskName];
    const serverTask = serverTasks[taskName];
    
    mergedTasks[taskName] = {
      totalInjections: Math.max(
        localTask?.totalInjections || 0,
        serverTask?.totalInjections || 0
      ),
      sites: mergeSites(localTask?.sites, serverTask?.sites),
      lastInjection: localTask?.lastInjection || serverTask?.lastInjection || null
    };
  });
  
  return {
    global: mergedGlobal,
    tasks: mergedTasks
  };
}

/**
 * Helper: Get timestamp from a note/item (updatedAt or createdAt)
 */
function getNoteTimestamp(note) {
  if (!note) return 0;
  const t = note.updatedAt ?? note.createdAt;
  if (!t) return 0;
  if (typeof t === 'number') return t;
  if (t.toMillis) return t.toMillis();
  return new Date(t).getTime();
}

/**
 * Helper: Merge calendar notes (date -> { notes: [] }) by merging notes arrays per date with timestamp (newer wins per id)
 */
function mergeCalendarNotes(localNotes, serverNotes) {
  if (!localNotes || typeof localNotes !== 'object') localNotes = {};
  if (!serverNotes || typeof serverNotes !== 'object') serverNotes = {};
  const allDates = new Set([...Object.keys(localNotes), ...Object.keys(serverNotes)]);
  const merged = {};
  allDates.forEach((dateKey) => {
    const localDay = localNotes[dateKey];
    const serverDay = serverNotes[dateKey];
    const localArr = (localDay && Array.isArray(localDay.notes)) ? localDay.notes : [];
    const serverArr = (serverDay && Array.isArray(serverDay.notes)) ? serverDay.notes : [];
    const byId = new Map();
    [...serverArr, ...localArr].forEach((note) => {
      if (!note || typeof note !== 'object') return;
      const id = note.id || `legacy_${getNoteTimestamp(note)}_${Math.random().toString(36).slice(2)}`;
      const existing = byId.get(id);
      if (!existing || getNoteTimestamp(note) > getNoteTimestamp(existing)) {
        byId.set(id, { ...note, id, updatedAt: note.updatedAt || note.createdAt || new Date().toISOString() });
      }
    });
    const notes = Array.from(byId.values()).sort((a, b) => getNoteTimestamp(b) - getNoteTimestamp(a));
    merged[dateKey] = { notes };
  });
  return merged;
}

/**
 * Helper: Merge water tracker (date -> { glasses, goal, unit, lastUpdated }) by date; newer lastUpdated wins per date
 * Handles both Firestore Timestamps (from server) and ISO strings/numbers (from local state)
 * NOTE: Local state uses client timestamps, but comparison works correctly because:
 * - new Date().getTime() converts both ISO strings and Firestore Timestamps to milliseconds
 * - Firestore Timestamps have .toMillis() method but new Date() also works on them
 */
export function mergeWaterTracker(localData, serverData) {
  if (!localData || typeof localData !== 'object') localData = {};
  if (!serverData || typeof serverData !== 'object') serverData = {};
  const allDates = new Set([...Object.keys(localData), ...Object.keys(serverData)]);
  const merged = {};
  allDates.forEach((dateKey) => {
    const localDay = localData[dateKey];
    const serverDay = serverData[dateKey];
    // Convert timestamps to milliseconds for comparison (handles all formats)
    const localTs = localDay?.lastUpdated ? new Date(localDay.lastUpdated).getTime() : 0;
    const serverTs = serverDay?.lastUpdated ? new Date(serverDay.lastUpdated).getTime() : 0;
    if (localTs >= serverTs && localDay) {
      merged[dateKey] = { ...localDay };
    } else if (serverDay) {
      merged[dateKey] = { ...serverDay };
    }
  });
  return merged;
}

/**
 * Save user's main application data (protocols, vendors, etc.)
 * Now with timestamp-based conflict resolution
 */
export async function saveAppData(userId, appData, options = {}) {
  const { skipMerge = false } = options;
  const protocolsCount = (appData.protocols || []).length;
  const activeCount = (appData.protocols || []).filter(p => p && p.active).length;

  try {
    // Load existing server data for comparison
    const serverData = skipMerge ? null : await loadAppData(userId);
    if (skipMerge) {
      console.log('📋 [PROTOCOL-SYNC] saveAppData skipMerge=true', { protocolsCount, activeCount });
    } else if (serverData && serverData.protocols) {
      const serverActive = (serverData.protocols || []).filter(p => p && p.active).length;
      console.log('📋 [PROTOCOL-SYNC] saveAppData merge', {
        localProtocols: protocolsCount,
        localActive: activeCount,
        serverProtocols: (serverData.protocols || []).length,
        serverActive
      });
    }
    
    // Load deletion tracking for merge operations
    let deletionTracking = null;
    if (!skipMerge) {
      try {
        deletionTracking = getDeletionTracking();
      } catch (error) {
        console.warn('⚠️ Could not load deletion tracking for merge:', error);
      }
    }
    
    // Add timestamps to all items
    const timestampedData = {
      protocols: ensureTimestamps(appData.protocols || []),
      reconItems: ensureTimestamps(appData.reconItems || []),
      reconHistory: ensureTimestamps(appData.reconHistory || []),
      supplements: ensureTimestamps(appData.supplements || []),
      orders: ensureTimestamps(appData.orders || []),
      metrics: ensureTimestamps(appData.metrics || []),
      vendors: ensureTimestamps(appData.vendors || []),
      stockpile: ensureTimestamps(appData.stockpile || []),
      scheduledBuys: ensureTimestamps(appData.scheduledBuys || []),
      protocolHistory: ensureTimestamps(appData.protocolHistory || []),
      wishlist: ensureTimestamps(appData.wishlist || []),
      calendarNotes: appData.calendarNotes || {},
      userNotes: ensureTimestamps(appData.userNotes || []),
      userGoals: ensureTimestamps(appData.userGoals || []),
      waterTracker: appData.waterTracker || {},
      taskCompletion: appData.taskCompletion || {},
      calendarDone: appData.calendarDone || {},
      injectionHistory: ensureInjectionHistoryIds(appData.injectionHistory || []),
      injectionStats: appData.injectionStats || { global: { totalInjections: 0, sites: {}, lastInjection: null }, tasks: {} },
      deletionTracking: appData.deletionTracking || deletionTracking || {}
    };
    
    // If we have server data, merge intelligently
    let dataToSave = timestampedData;
    if (serverData && !skipMerge) {
      // Merge deletion tracking first
      const mergedDeletionTracking = mergeDeletionTracking(
        timestampedData.deletionTracking || {},
        serverData.deletionTracking || {}
      );
      
      const mergedProtocols = mergeWithTimestamps(timestampedData.protocols, serverData.protocols, 'protocols', mergedDeletionTracking.protocols);
      const mergedActive = (mergedProtocols || []).filter(p => p && p.active).length;
      console.log('📋 [PROTOCOL-SYNC] saveAppData merge result', {
        mergedTotal: (mergedProtocols || []).length,
        mergedActive
      });
      dataToSave = {
        protocols: mergedProtocols,
        reconItems: mergeWithTimestamps(timestampedData.reconItems, serverData.reconItems, 'reconItems', mergedDeletionTracking.reconItems),
        reconHistory: mergeWithTimestamps(timestampedData.reconHistory, serverData.reconHistory, 'reconHistory', mergedDeletionTracking.reconHistory),
        supplements: mergeWithTimestamps(timestampedData.supplements, serverData.supplements, 'supplements', mergedDeletionTracking.supplements),
        orders: mergeWithTimestamps(timestampedData.orders, serverData.orders, 'orders', mergedDeletionTracking.orders),
        metrics: mergeWithTimestamps(timestampedData.metrics, serverData.metrics, 'metrics', mergedDeletionTracking.metrics),
        vendors: mergeWithTimestamps(timestampedData.vendors, serverData.vendors, 'vendors', mergedDeletionTracking.vendors),
        stockpile: mergeWithTimestamps(timestampedData.stockpile, serverData.stockpile, 'stockpile', mergedDeletionTracking.stockpile),
        scheduledBuys: mergeWithTimestamps(timestampedData.scheduledBuys, serverData.scheduledBuys, 'scheduledBuys', mergedDeletionTracking.scheduledBuys),
        protocolHistory: mergeWithTimestamps(timestampedData.protocolHistory, serverData.protocolHistory || [], 'protocolHistory', mergedDeletionTracking.protocolHistory),
        wishlist: mergeWithTimestamps(timestampedData.wishlist, serverData.wishlist || [], 'wishlist', mergedDeletionTracking.wishlist),
        calendarNotes: mergeCalendarNotes(timestampedData.calendarNotes, serverData.calendarNotes || {}),
        userNotes: mergeWithTimestamps(timestampedData.userNotes, serverData.userNotes || [], 'userNotes', mergedDeletionTracking.userNotes),
        userGoals: mergeWithTimestamps(timestampedData.userGoals, serverData.userGoals || [], 'goals', mergedDeletionTracking.goals),
        waterTracker: mergeWaterTracker(timestampedData.waterTracker, serverData.waterTracker || {}),
        // Merge task completion data - prefer local data (more recent completions)
        taskCompletion: mergeTaskCompletion(timestampedData.taskCompletion, serverData.taskCompletion || {}),
        calendarDone: mergeTaskCompletion(timestampedData.calendarDone, serverData.calendarDone || {}),
        injectionHistory: mergeInjectionHistory(timestampedData.injectionHistory, serverData.injectionHistory || []),
        injectionStats: mergeInjectionStats(timestampedData.injectionStats, serverData.injectionStats || {}),
        deletionTracking: mergedDeletionTracking
      };
    }
    
    return await saveUserData(userId, dataToSave, COLLECTIONS.USER_DATA);
  } catch (error) {
    console.error('❌ Failed to save app data with timestamp merge:', error);
    // Fallback to simple save
    // Load deletion tracking for fallback
    let deletionTracking = {};
    try {
      deletionTracking = getDeletionTracking();
    } catch (error) {
      console.warn('⚠️ Could not load deletion tracking for fallback save:', error);
    }
    
    return await saveUserData(userId, {
    protocols: appData.protocols || [],
    reconItems: appData.reconItems || [],
    reconHistory: appData.reconHistory || [],
    supplements: appData.supplements || [],
    orders: appData.orders || [],
    metrics: appData.metrics || [],
    vendors: appData.vendors || [],
    calendarNotes: appData.calendarNotes || {},
    userNotes: appData.userNotes || [],
    userGoals: appData.userGoals || [],
    waterTracker: appData.waterTracker || {},
    stockpile: appData.stockpile || [],
    scheduledBuys: appData.scheduledBuys || [],
    protocolHistory: appData.protocolHistory || [],
    wishlist: appData.wishlist || [],
    taskCompletion: appData.taskCompletion || {},
    calendarDone: appData.calendarDone || {},
    injectionHistory: appData.injectionHistory || [],
    injectionStats: appData.injectionStats || { global: { totalInjections: 0, sites: {}, lastInjection: null }, tasks: {} },
    deletionTracking: appData.deletionTracking || deletionTracking
    }, COLLECTIONS.USER_DATA);
  }
}

/**
 * Load user's main application data
 */
export async function loadAppData(userId) {
  return await loadUserData(userId, COLLECTIONS.USER_DATA);
}

/**
 * Save user preferences (theme, settings, etc.)
 */
export async function saveUserPreferences(userId, preferences) {
  return await saveUserData(userId, preferences, COLLECTIONS.USER_PREFERENCES);
}

/**
 * Load user preferences
 */
export async function loadUserPreferences(userId) {
  return await loadUserData(userId, COLLECTIONS.USER_PREFERENCES);
}

/**
 * Save user subscription data
 */
export async function saveUserSubscription(userId, subscription) {
  return await saveUserData(userId, { subscription }, COLLECTIONS.USER_SUBSCRIPTION);
}

/**
 * Load user subscription data
 * Checks userSubscriptions collection, users/{userId} subscription field, and lifetimeAccess collection
 */
export async function loadUserSubscription(userId) {
  try {
    // CRITICAL: First check lifetimeAccess collection (where admin grants are stored)
    // This must be checked FIRST to prevent lifetime users from being locked out
    try {
      const lifetimeRef = doc(db, 'lifetimeAccess', userId);
      const lifetimeDoc = await getDoc(lifetimeRef);
      
      if (lifetimeDoc.exists() && lifetimeDoc.data().hasLifetimeAccess) {
        const lifetimeData = lifetimeDoc.data();
        return {
          hasLifetimeAccess: true,
          interval: 'lifetime',
          status: 'active',
          plan: 'lifetime',
          lifetimeReason: lifetimeData.reason || lifetimeData.lifetimeReason || 'Admin grant',
          lifetimeGrantedAt: lifetimeData.grantedAt || lifetimeData.lifetimeGrantedAt || new Date().toISOString(),
          currentPeriodEnd: null, // Lifetime has no end date
          currentPeriodStart: lifetimeData.grantedAt || lifetimeData.lifetimeGrantedAt || new Date().toISOString(),
          userId: userId
        };
      }
    } catch (lifetimeError) {
      console.warn('⚠️ Error checking lifetimeAccess collection:', lifetimeError);
      // Continue to check other sources
    }

    // Primary: Check userSubscriptions collection (where Stripe subscriptions are stored)
    const data = await loadUserData(userId, COLLECTIONS.USER_SUBSCRIPTION);
    if (data?.subscription) {
      const subscription = data.subscription;
      
      // CRITICAL FIX: Prioritize lifetime access over trial subscriptions
      // If subscription has lifetime access, return it immediately (even if status is trialing)
      if (subscription.hasLifetimeAccess || subscription.interval === 'lifetime' || subscription.plan === 'lifetime') {
        console.log('✅ Found lifetime access in userSubscriptions collection');
        // Ensure status is 'active' for lifetime subscriptions
        return {
          ...subscription,
          status: 'active',
          interval: 'lifetime',
          hasLifetimeAccess: true
        };
      }
      
      // If it's a trial subscription, still return it (but lifetime should have been checked above)
      return subscription;
    }
    
    // Fallback: Check users/{userId} subscription field (where lifetime access is granted)
    const userDoc = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDoc);
    
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      const userSubscription = userData.subscription;
      
      // If user has lifetime access in users collection, convert to app format
      if (userSubscription?.hasLifetimeAccess && userSubscription.plan === 'lifetime') {
        console.log('✅ Found lifetime access in users collection, converting format');
        return {
          hasLifetimeAccess: true,
          interval: 'lifetime',
          status: userSubscription.status || 'active',
          plan: 'lifetime',
          lifetimeReason: userSubscription.lifetimeReason || 'Unknown',
          lifetimeGrantedAt: userSubscription.lifetimeGrantedAt,
          currentPeriodEnd: null, // Lifetime has no end date
          currentPeriodStart: userSubscription.lifetimeGrantedAt || new Date().toISOString(),
          userId: userId
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Failed to load subscription:', error);
    return null;
  }
}

/**
 * Save user state (onboarding, demo data flags, etc.)
 */
export async function saveUserState(userId, state) {
  return await saveUserData(userId, state, COLLECTIONS.USER_STATE);
}

/**
 * Load user state
 */
export async function loadUserState(userId) {
  return await loadUserData(userId, COLLECTIONS.USER_STATE);
}

/**
 * Delete all user data (for account deletion)
 */
export async function deleteAllUserData(userId) {
  try {
    const collections = Object.values(COLLECTIONS);
    const deletePromises = collections.map(collection => {
      const userDoc = getUserDoc(userId, collection);
      return deleteDoc(userDoc);
    });
    
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error(`❌ Failed to delete user data from cloud:`, error);
    return false;
  }
}

/**
 * Check if user has any data in cloud storage
 */
export async function hasUserData(userId) {
  try {
    const appData = await loadAppData(userId);
    return appData !== null;
  } catch (error) {
    console.error(`❌ Failed to check user data:`, error);
    return false;
  }
}

/**
 * Migrate localStorage data to cloud storage
 */
export async function migrateLocalStorageToCloud(userId) {
  try {
    // Get all localStorage keys that start with tpprover_
    const localStorageKeys = Object.keys(localStorage).filter(key => key.startsWith('tpprover_'));
    
    if (localStorageKeys.length === 0) {
      return true;
    }
    
    // Organize data by type
    const appData = {};
    const preferences = {};
    const state = {};
    const DATA_KEY_MAPPING = {
      recon_items: 'reconItems',
      recon_history: 'reconHistory',
      calendar_notes: 'calendarNotes',
      scheduled_buys: 'scheduledBuys',
      user_notes: 'userNotes',
      user_goals: 'userGoals',
      water_tracker: 'waterTracker',
      task_completion: 'taskCompletion',
      calendar_done: 'calendarDone',
      injection_history: 'injectionHistory',
      injection_stats: 'injectionStats'
    };
    
    localStorageKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (!value) return;
        
        const parsedValue = JSON.parse(value);
        
        // Categorize data
        if (['tpprover_protocols', 'tpprover_recon_items', 'tpprover_recon_history', 
             'tpprover_supplements', 'tpprover_orders', 'tpprover_metrics', 
             'tpprover_vendors', 'tpprover_calendar_notes', 'tpprover_stockpile', 
             'tpprover_scheduled_buys', 'tpprover_wishlist', 'tpprover_user_notes', 'tpprover_user_goals', 'tpprover_water_tracker',
             'tpprover_task_completion', 'tpprover_calendar_done', 'tpprover_injection_history', 'tpprover_injection_stats'].includes(key)) {
          const dataKey = key.replace('tpprover_', '');
          const mappedKey = DATA_KEY_MAPPING[dataKey] || dataKey;
          
          // Special handling for task completion data (objects, not arrays)
          if (key === 'tpprover_task_completion' || key === 'tpprover_calendar_done') {
            const hasMeaningfulValue = parsedValue && typeof parsedValue === 'object' && Object.keys(parsedValue).length > 0;
            if (hasMeaningfulValue || !(mappedKey in appData)) {
              appData[mappedKey] = parsedValue;
            }
          } else {
            // Avoid overwriting existing camelCase data with empty arrays/objects
            const hasMeaningfulValue = Array.isArray(parsedValue)
              ? parsedValue.length > 0
              : parsedValue && typeof parsedValue === 'object'
                ? Object.keys(parsedValue).length > 0
                : Boolean(parsedValue);
            
            if (hasMeaningfulValue || !(mappedKey in appData)) {
              appData[mappedKey] = parsedValue;
            }
          }
        } else if (['tpprover_theme', 'tpprover_settings'].includes(key)) {
          const prefKey = key.replace('tpprover_', '');
          preferences[prefKey] = parsedValue;
        } else if (['tpprover_has_onboarded', 'tpprover_is_tester', 'tpprover_is_founder'].includes(key)) {
          const stateKey = key.replace('tpprover_', '');
          state[stateKey] = parsedValue;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to parse localStorage key ${key}:`, error);
      }
    });
    
    // Save to cloud storage
    const promises = [];
    
    if (Object.keys(appData).length > 0) {
      promises.push(saveAppData(userId, appData));
    }
    
    if (Object.keys(preferences).length > 0) {
      promises.push(saveUserPreferences(userId, preferences));
    }
    
    if (Object.keys(state).length > 0) {
      promises.push(saveUserState(userId, state));
    }
    
    // Handle subscription separately
    const subscription = localStorage.getItem('tpprover_subscription');
    if (subscription && subscription !== 'null') {
      try {
        const parsedSubscription = JSON.parse(subscription);
        promises.push(saveUserSubscription(userId, parsedSubscription));
      } catch (error) {
        console.warn('⚠️ Failed to parse subscription data:', error);
      }
    }
    
    await Promise.all(promises);
    
    return true;
  } catch (error) {
    console.error(`❌ Migration failed for user: ${userId}`, error);
    return false;
  }
}

/**
 * Clear all localStorage data (after successful cloud migration)
 */
export function clearLocalStorageData() {
  try {
    const keysToRemove = Object.keys(localStorage)
      .filter(key => key.startsWith('tpprover_'));
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (error) {
    console.error('❌ Failed to clear localStorage:', error);
    return false;
  }
}

/**
 * Subscribe to user state changes (sampleDataCleared flag, etc.)
 * @param {string} userId - User ID
 * @param {function} callback - Callback function that receives the state data
 * @returns {function} Unsubscribe function
 */
export function subscribeToUserState(userId, callback) {
  try {
    const userDoc = getUserDoc(userId, COLLECTIONS.USER_STATE);
    return onSnapshot(
      userDoc,
      snapshot => {
        if (typeof callback === 'function') {
          callback(snapshot.exists() ? snapshot.data() : null);
        }
      },
      error => {
        console.error('❌ Failed to subscribe to user state:', error);
      }
    );
  } catch (error) {
    console.error('❌ Error setting up user state subscription:', error);
    return () => {};
  }
}

/**
 * Subscribe to app data changes (protocols, orders, etc.)
 * @param {string} userId - User ID
 * @param {function} callback - Callback function that receives the app data
 * @returns {function} Unsubscribe function
 */
export function subscribeToAppData(userId, callback) {
  try {
    const userDoc = getUserDoc(userId, COLLECTIONS.USER_DATA);
    return onSnapshot(
      userDoc,
      snapshot => {
        if (typeof callback === 'function') {
          callback(snapshot.exists() ? snapshot.data() : null);
        }
      },
      error => {
        console.error('❌ Failed to subscribe to app data:', error);
      }
    );
  } catch (error) {
    console.error('❌ Error setting up app data subscription:', error);
    return () => {};
  }
}
