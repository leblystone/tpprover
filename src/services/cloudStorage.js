import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getDeletionTracking, mergeDeletionTracking } from '../utils/deletionTracking';

/**
 * Cloud Storage Service - Primary storage for all user data
 * Replaces localStorage to prevent data bleeding between accounts
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
      version: '1.0'
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
 */
function ensureTimestamps(items) {
  if (!Array.isArray(items)) return items;
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
        const serverTime = new Date(item.updatedAt || 0).getTime();
        
        // If deletion is newer than server update, exclude the item
        if (deletionTime > serverTime) {
          console.log(`🚫 Excluding deleted ${dataType} item from merge: ${item.id}`);
          return; // Skip this item
        }
        // If server update is newer than deletion, the item was recreated - include it
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
        // If it's an ISO string or Date, convert normally
        return new Date(item.updatedAt).getTime();
      };
      
      const localTime = getTimestamp(localItem);
      const serverTime = getTimestamp(serverItem);
      
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
 * Helper: Merge task completion data objects
 * Prefers local data (more recent completions) but merges with server data
 * Structure: { [date]: { [timeSlot]: { [taskId]: boolean } } }
 */
function mergeTaskCompletion(localData, serverData) {
  if (!localData || typeof localData !== 'object') localData = {};
  if (!serverData || typeof serverData !== 'object') serverData = {};
  
  const merged = { ...serverData };
  
  // Merge local data into server data (local takes precedence for same keys)
  Object.keys(localData).forEach(date => {
    if (!merged[date]) {
      merged[date] = {};
    }
    
    const localDayData = localData[date];
    const serverDayData = merged[date] || {};
    
    if (typeof localDayData === 'object' && localDayData !== null) {
      Object.keys(localDayData).forEach(timeSlot => {
        if (!merged[date][timeSlot]) {
          merged[date][timeSlot] = {};
        }
        
        const localSlotData = localDayData[timeSlot];
        const serverSlotData = merged[date][timeSlot] || {};
        
        if (typeof localSlotData === 'object' && localSlotData !== null) {
          // Merge task completions - local takes precedence
          merged[date][timeSlot] = {
            ...serverSlotData,
            ...localSlotData
          };
        }
      });
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
  
  try {
    // Load existing server data for comparison
    const serverData = skipMerge ? null : await loadAppData(userId);
    
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
      calendarNotes: appData.calendarNotes || {},
      taskCompletion: appData.taskCompletion || {},
      calendarDone: appData.calendarDone || {},
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
      
      dataToSave = {
        protocols: mergeWithTimestamps(timestampedData.protocols, serverData.protocols, 'protocols', mergedDeletionTracking.protocols),
        reconItems: mergeWithTimestamps(timestampedData.reconItems, serverData.reconItems, 'reconItems', mergedDeletionTracking.reconItems),
        reconHistory: mergeWithTimestamps(timestampedData.reconHistory, serverData.reconHistory, 'reconHistory', mergedDeletionTracking.reconHistory),
        supplements: mergeWithTimestamps(timestampedData.supplements, serverData.supplements, 'supplements', mergedDeletionTracking.supplements),
        orders: mergeWithTimestamps(timestampedData.orders, serverData.orders, 'orders', mergedDeletionTracking.orders),
        metrics: mergeWithTimestamps(timestampedData.metrics, serverData.metrics, 'metrics', mergedDeletionTracking.metrics),
        vendors: mergeWithTimestamps(timestampedData.vendors, serverData.vendors, 'vendors', mergedDeletionTracking.vendors),
        stockpile: mergeWithTimestamps(timestampedData.stockpile, serverData.stockpile, 'stockpile', mergedDeletionTracking.stockpile),
        scheduledBuys: mergeWithTimestamps(timestampedData.scheduledBuys, serverData.scheduledBuys, 'scheduledBuys', mergedDeletionTracking.scheduledBuys),
        calendarNotes: timestampedData.calendarNotes, // TODO: Add timestamp merging for calendar notes
        // Merge task completion data - prefer local data (more recent completions)
        taskCompletion: mergeTaskCompletion(timestampedData.taskCompletion, serverData.taskCompletion || {}),
        calendarDone: mergeTaskCompletion(timestampedData.calendarDone, serverData.calendarDone || {}),
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
    stockpile: appData.stockpile || [],
    scheduledBuys: appData.scheduledBuys || [],
    taskCompletion: appData.taskCompletion || {},
    calendarDone: appData.calendarDone || {},
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
        console.log('✅ Found lifetime access in lifetimeAccess collection');
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
      task_completion: 'taskCompletion',
      calendar_done: 'calendarDone'
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
             'tpprover_scheduled_buys', 'tpprover_task_completion', 'tpprover_calendar_done'].includes(key)) {
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
