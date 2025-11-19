import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

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
 */
export async function saveUserData(userId, data, collection = COLLECTIONS.USER_DATA) {
  try {
    const userDoc = getUserDoc(userId, collection);
    
    // Use deep cleaning function to remove undefined and null values
    const cleanData = deepCleanData(data);
    
    // Final validation - ensure no undefined values remain
    const finalData = {
      ...cleanData,
      userId,
      lastUpdated: new Date().toISOString(),
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
 */
function ensureTimestamps(items) {
  if (!Array.isArray(items)) return items;
  const now = new Date().toISOString();
  return items.map(item => ({
    ...item,
    updatedAt: item.updatedAt || now
  }));
}

/**
 * Helper: Merge arrays with timestamp-based conflict resolution
 * Server data wins if it has newer timestamps
 */
export function mergeWithTimestamps(localItems, serverItems) {
  if (!Array.isArray(localItems)) localItems = [];
  if (!Array.isArray(serverItems)) serverItems = [];
  
  const itemMap = new Map();
  
  // Add server items first
  serverItems.forEach(item => {
    if (item.id) {
      itemMap.set(item.id, item);
    }
  });
  
  // Add or update with local items (only if they're newer or don't exist on server)
  localItems.forEach(localItem => {
    if (!localItem.id) return;
    
    const serverItem = itemMap.get(localItem.id);
    
    if (!serverItem) {
      // New item not on server - add it
      itemMap.set(localItem.id, localItem);
    } else {
      // Item exists on both - compare timestamps
      const localTime = new Date(localItem.updatedAt || 0).getTime();
      const serverTime = new Date(serverItem.updatedAt || 0).getTime();
      
      if (localTime > serverTime) {
        // Local is newer - use it
        itemMap.set(localItem.id, localItem);
      }
      // Otherwise keep server version (it's newer or same)
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
      calendarDone: appData.calendarDone || {}
    };
    
    // If we have server data, merge intelligently
    let dataToSave = timestampedData;
    if (serverData && !skipMerge) {
      dataToSave = {
        protocols: mergeWithTimestamps(timestampedData.protocols, serverData.protocols),
        reconItems: mergeWithTimestamps(timestampedData.reconItems, serverData.reconItems),
        reconHistory: mergeWithTimestamps(timestampedData.reconHistory, serverData.reconHistory),
        supplements: mergeWithTimestamps(timestampedData.supplements, serverData.supplements),
        orders: mergeWithTimestamps(timestampedData.orders, serverData.orders),
        metrics: mergeWithTimestamps(timestampedData.metrics, serverData.metrics),
        vendors: mergeWithTimestamps(timestampedData.vendors, serverData.vendors),
        stockpile: mergeWithTimestamps(timestampedData.stockpile, serverData.stockpile),
        scheduledBuys: mergeWithTimestamps(timestampedData.scheduledBuys, serverData.scheduledBuys),
        calendarNotes: timestampedData.calendarNotes, // TODO: Add timestamp merging for calendar notes
        // Merge task completion data - prefer local data (more recent completions)
        taskCompletion: mergeTaskCompletion(timestampedData.taskCompletion, serverData.taskCompletion || {}),
        calendarDone: mergeTaskCompletion(timestampedData.calendarDone, serverData.calendarDone || {})
      };
    }
    
    return await saveUserData(userId, dataToSave, COLLECTIONS.USER_DATA);
  } catch (error) {
    console.error('❌ Failed to save app data with timestamp merge:', error);
    // Fallback to simple save
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
    calendarDone: appData.calendarDone || {}
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
 * Checks both userSubscriptions collection and users/{userId} subscription field
 */
export async function loadUserSubscription(userId) {
  try {
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
