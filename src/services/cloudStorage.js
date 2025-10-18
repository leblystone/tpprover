import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
 * Save user data to cloud storage
 */
export async function saveUserData(userId, data, collection = COLLECTIONS.USER_DATA) {
  try {
    const userDoc = getUserDoc(userId, collection);
    await setDoc(userDoc, {
      ...data,
      userId,
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    }, { merge: true });
    
    console.log(`☁️ Saved user data to cloud: ${collection}/${userId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to save user data to cloud:`, error);
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
      console.log(`☁️ Loaded user data from cloud: ${collection}/${userId}`);
      return data;
    } else {
      console.log(`☁️ No user data found in cloud: ${collection}/${userId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Failed to load user data from cloud:`, error);
    return null;
  }
}

/**
 * Save user's main application data (protocols, vendors, etc.)
 */
export async function saveAppData(userId, appData) {
  const dataToSave = {
    protocols: appData.protocols || [],
    reconItems: appData.reconItems || [],
    reconHistory: appData.reconHistory || [],
    supplements: appData.supplements || [],
    orders: appData.orders || [],
    metrics: appData.metrics || [],
    vendors: appData.vendors || [],
    calendarNotes: appData.calendarNotes || {},
    stockpile: appData.stockpile || [],
    scheduledBuys: appData.scheduledBuys || []
  };
  
  return await saveUserData(userId, dataToSave, COLLECTIONS.USER_DATA);
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
 */
export async function loadUserSubscription(userId) {
  const data = await loadUserData(userId, COLLECTIONS.USER_SUBSCRIPTION);
  return data?.subscription || null;
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
    console.log(`☁️ Deleted all user data from cloud: ${userId}`);
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
    console.log(`🔄 Migrating localStorage data to cloud for user: ${userId}`);
    
    // Get all localStorage keys that start with tpprover_
    const localStorageKeys = Object.keys(localStorage).filter(key => key.startsWith('tpprover_'));
    
    if (localStorageKeys.length === 0) {
      console.log('📭 No localStorage data to migrate');
      return true;
    }
    
    // Organize data by type
    const appData = {};
    const preferences = {};
    const state = {};
    
    localStorageKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (!value) return;
        
        const parsedValue = JSON.parse(value);
        
        // Categorize data
        if (['tpprover_protocols', 'tpprover_recon_items', 'tpprover_recon_history', 
             'tpprover_supplements', 'tpprover_orders', 'tpprover_metrics', 
             'tpprover_vendors', 'tpprover_calendar_notes', 'tpprover_stockpile', 
             'tpprover_scheduled_buys'].includes(key)) {
          const dataKey = key.replace('tpprover_', '');
          appData[dataKey] = parsedValue;
        } else if (['tpprover_theme', 'tpprover_settings'].includes(key)) {
          const prefKey = key.replace('tpprover_', '');
          preferences[prefKey] = parsedValue;
        } else if (['tpprover_has_seeded', 'tpprover_demo_data_cleared', 'tpprover_has_onboarded',
                   'tpprover_is_tester', 'tpprover_is_founder'].includes(key)) {
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
    
    console.log(`✅ Migration complete for user: ${userId}`);
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
    const keysToRemove = Object.keys(localStorage).filter(key => key.startsWith('tpprover_'));
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 Cleared ${keysToRemove.length} localStorage keys`);
    return true;
  } catch (error) {
    console.error('❌ Failed to clear localStorage:', error);
    return false;
  }
}
