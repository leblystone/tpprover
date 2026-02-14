import { serverTimestamp } from 'firebase/firestore';

/**
 * Data Validation Utility
 * 
 * Validates data structure before writing to Firestore to prevent data loss
 * and catch bugs early in development.
 */

/**
 * Check if a value is a valid Firestore serverTimestamp sentinel.
 * Uses multiple detection strategies because class names are mangled in production builds.
 */
export function isServerTimestampSentinel(value) {
  if (!value || typeof value !== 'object') return false;
  // Strategy 1: Constructor name (works in development)
  if (value.constructor && value.constructor.name === 'FieldValue') return true;
  // Strategy 2: Duck-type detection for Firestore sentinels (works in production)
  // serverTimestamp() sentinels have _methodName or methodName property
  if (value._methodName === 'serverTimestamp' || value.methodName === 'serverTimestamp') return true;
  // Strategy 3: Check for Firestore FieldValue prototype markers
  if (typeof value.isEqual === 'function' && typeof value.toJSON !== 'function' && !value.toMillis) return true;
  return false;
}

/**
 * Check if a value is a valid timestamp (ISO string, Date object, number, or sentinel)
 */
function isValidTimestamp(value) {
  if (!value) return false;
  
  // Firestore serverTimestamp() sentinel
  if (isServerTimestampSentinel(value)) return true;
  
  // ISO string
  if (typeof value === 'string') {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  
  // Timestamp number (milliseconds)
  if (typeof value === 'number') {
    return value > 0 && value < Date.now() + 86400000; // within next 24 hours
  }
  
  // Date object
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  
  // Firestore Timestamp object
  if (value && typeof value.toMillis === 'function') {
    return true;
  }
  
  return false;
}

/**
 * Validate a single item has required fields
 */
export function validateItem(item, itemType, options = {}) {
  const { requireId = true, requireTimestamps = true } = options;
  const errors = [];
  
  if (!item || typeof item !== 'object') {
    errors.push(`${itemType}: Item must be an object`);
    return { valid: false, errors };
  }
  
  // Validate ID
  if (requireId && !item.id) {
    errors.push(`${itemType}: Missing required field 'id'`);
  }
  
  // Validate timestamps
  if (requireTimestamps) {
    if (!item.updatedAt) {
      errors.push(`${itemType} ${item.id || 'unknown'}: Missing required field 'updatedAt'`);
    } else if (!isValidTimestamp(item.updatedAt)) {
      errors.push(`${itemType} ${item.id || 'unknown'}: Invalid 'updatedAt' timestamp`);
    }
    
    // createdAt is optional but should be valid if present
    if (item.createdAt && !isValidTimestamp(item.createdAt)) {
      errors.push(`${itemType} ${item.id || 'unknown'}: Invalid 'createdAt' timestamp`);
    }
  }
  
  // Check for undefined values in top-level fields
  Object.keys(item).forEach(key => {
    if (item[key] === undefined) {
      errors.push(`${itemType} ${item.id || 'unknown'}: Field '${key}' is undefined`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate an array of items
 */
export function validateItemArray(items, itemType, options = {}) {
  if (!Array.isArray(items)) {
    return {
      valid: false,
      errors: [`${itemType}: Expected array, got ${typeof items}`]
    };
  }
  
  const allErrors = [];
  let validCount = 0;
  
  items.forEach((item, index) => {
    const result = validateItem(item, `${itemType}[${index}]`, options);
    if (result.valid) {
      validCount++;
    } else {
      allErrors.push(...result.errors);
    }
  });
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    stats: {
      total: items.length,
      valid: validCount,
      invalid: items.length - validCount
    }
  };
}

/**
 * Validate all app data before saving
 */
export function validateAppData(appData, options = {}) {
  const { logErrors = true, throwOnError = false } = options;
  const allErrors = [];
  
  // Validate each data type
  const dataTypes = [
    { key: 'protocols', name: 'Protocol' },
    { key: 'orders', name: 'Order' },
    { key: 'reconItems', name: 'ReconItem' },
    { key: 'reconHistory', name: 'ReconHistory' },
    { key: 'supplements', name: 'Supplement' },
    { key: 'vendors', name: 'Vendor' },
    { key: 'stockpile', name: 'StockpileItem' },
    { key: 'scheduledBuys', name: 'ScheduledBuy' },
    { key: 'metrics', name: 'Metric' },
    { key: 'userNotes', name: 'UserNote' },
    { key: 'wishlist', name: 'WishlistItem' }
  ];
  
  dataTypes.forEach(({ key, name }) => {
    if (appData[key]) {
      const result = validateItemArray(appData[key], name);
      if (!result.valid) {
        allErrors.push(...result.errors);
        if (logErrors) {
          console.error(`❌ Validation errors in ${key}:`, result.errors);
          console.error(`📊 Stats: ${result.stats.valid}/${result.stats.total} valid`);
        }
      }
    }
  });
  
  // Validate calendar notes (different structure)
  if (appData.calendarNotes && typeof appData.calendarNotes === 'object') {
    Object.keys(appData.calendarNotes).forEach(dateKey => {
      const dayData = appData.calendarNotes[dateKey];
      if (dayData && dayData.notes && Array.isArray(dayData.notes)) {
        const result = validateItemArray(dayData.notes, `CalendarNote[${dateKey}]`);
        if (!result.valid) {
          allErrors.push(...result.errors);
        }
      }
    });
  }
  
  // Check for undefined top-level fields
  Object.keys(appData).forEach(key => {
    if (appData[key] === undefined) {
      allErrors.push(`AppData: Field '${key}' is undefined`);
    }
  });
  
  const isValid = allErrors.length === 0;
  
  if (!isValid && logErrors) {
    console.error(`❌ Data validation failed with ${allErrors.length} errors`);
  }
  
  if (!isValid && throwOnError) {
    throw new Error(`Data validation failed: ${allErrors.join(', ')}`);
  }
  
  return {
    valid: isValid,
    errors: allErrors
  };
}

/**
 * Validate data before save with automatic logging
 * Returns the data even if invalid (warnings only)
 * Note: ensureTimestamps() will fix invalid timestamps before Firestore save
 */
export function validateBeforeSave(appData, context = 'Unknown') {
  const result = validateAppData(appData, {
    logErrors: false, // Don't log each error individually
    throwOnError: false // Never throw - just warn
  });
  
  if (!result.valid) {
    console.warn(`⚠️ Data validation found ${result.errors.length} issues in ${context} (will be auto-fixed by ensureTimestamps)`);
    // Only log first 3 errors to avoid console spam
    if (result.errors.length > 0) {
      console.warn('  Sample issues:', result.errors.slice(0, 3));
    }
  }
  
  return appData;
}

/**
 * Validate and sanitize cloud data BEFORE applying it to local state.
 * Strips invalid entries rather than rejecting the whole payload.
 * @param {Object} cloudData - Raw data from Firestore
 * @returns {Object} Sanitized data safe to apply to state
 */
export function validateOnLoad(cloudData) {
  if (!cloudData || typeof cloudData !== 'object') return {};
  
  const sanitized = { ...cloudData };
  
  // Array fields that should contain objects with 'id'
  const arrayFields = [
    'protocols', 'reconItems', 'reconHistory', 'supplements', 'orders',
    'metrics', 'vendors', 'stockpile', 'scheduledBuys', 'protocolHistory',
    'wishlist', 'userNotes', 'userGoals', 'injectionHistory'
  ];
  
  arrayFields.forEach(key => {
    if (sanitized[key] !== undefined) {
      if (!Array.isArray(sanitized[key])) {
        console.warn(`⚠️ validateOnLoad: ${key} is not an array, resetting to []`);
        sanitized[key] = [];
      } else {
        // Strip entries that aren't objects (null, undefined, strings, etc.)
        const before = sanitized[key].length;
        sanitized[key] = sanitized[key].filter(item => item && typeof item === 'object');
        if (sanitized[key].length !== before) {
          console.warn(`⚠️ validateOnLoad: stripped ${before - sanitized[key].length} invalid entries from ${key}`);
        }
      }
    }
  });
  
  // Object fields that should be plain objects
  const objectFields = ['calendarNotes', 'waterTracker', 'taskCompletion', 'calendarDone', 'injectionStats', 'deletionTracking'];
  
  objectFields.forEach(key => {
    if (sanitized[key] !== undefined && (typeof sanitized[key] !== 'object' || Array.isArray(sanitized[key]))) {
      console.warn(`⚠️ validateOnLoad: ${key} is not an object, resetting to {}`);
      sanitized[key] = {};
    }
  });
  
  return sanitized;
}

/**
 * Recursively replace Firestore serverTimestamp() sentinels with ISO strings.
 * Required before JSON.stringify - sentinels cannot be serialized and can throw in some envs (e.g. Chrome on PC).
 */
export function sanitizeForLocalStorage(data) {
  if (data == null || typeof data !== 'object') return data;
  if (isServerTimestampSentinel(data)) return new Date().toISOString();
  if (Array.isArray(data)) return data.map(sanitizeForLocalStorage);
  const out = {};
  for (const k of Object.keys(data)) {
    out[k] = sanitizeForLocalStorage(data[k]);
  }
  return out;
}

/**
 * Safely parse a localStorage value with try/catch.
 * Returns the fallback on failure WITHOUT saving it back to localStorage
 * (saving a fallback would cause data loss if the value was just temporarily corrupted).
 * @param {string} key - localStorage key
 * @param {*} fallback - Value to return if parse fails (default: depends on usage)
 * @returns {*} Parsed value or fallback
 */
export function safeParseLocalStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`⚠️ Failed to parse localStorage key "${key}":`, error.message);
    return fallback;
  }
}

// ===== DATA RETENTION / PRUNING =====
// Prevents unbounded growth of date-keyed objects and history arrays.

/**
 * Retention limits for various data types.
 * These are generous limits — most users will never hit them.
 * The goal is to prevent edge cases where years of data make
 * localStorage or Firestore unusable.
 */
export const DATA_RETENTION_LIMITS = {
  // Date-keyed objects: keep N most recent days
  waterTracker: 365,       // 1 year of daily water tracking
  taskCompletion: 365,     // 1 year of daily task data
  calendarDone: 365,       // 1 year of calendar task data
  // Arrays: keep N most recent items
  protocolHistory: 500,    // 500 completed protocols
  reconHistory: 1000,      // 1000 reconstitution records
  orders: 1000,            // 1000 orders
  // injectionHistory is already capped at 1000 in mergeInjectionHistory
};

/**
 * Prune a date-keyed object to keep only the N most recent date entries.
 * Date keys are expected to be in a parseable format (ISO, YYYY-MM-DD, etc.).
 * @param {Object} dateObj - Object with date strings as keys
 * @param {number} maxDays - Maximum number of date entries to keep
 * @returns {Object} Pruned object with only the most recent entries
 */
export function pruneDateKeyedObject(dateObj, maxDays) {
  if (!dateObj || typeof dateObj !== 'object') return dateObj;
  
  const entries = Object.entries(dateObj);
  if (entries.length <= maxDays) return dateObj; // Nothing to prune
  
  // Sort by date key descending (newest first)
  entries.sort((a, b) => {
    const dateA = new Date(a[0]);
    const dateB = new Date(b[0]);
    // If dates are invalid, keep them at the end
    if (isNaN(dateA.getTime())) return 1;
    if (isNaN(dateB.getTime())) return -1;
    return dateB.getTime() - dateA.getTime();
  });
  
  // Keep only the most recent entries
  const pruned = {};
  const kept = entries.slice(0, maxDays);
  kept.forEach(([key, value]) => {
    pruned[key] = value;
  });
  
  const removed = entries.length - kept.length;
  if (removed > 0) {
    console.log(`🧹 Pruned ${removed} old date entries (kept ${maxDays} most recent)`);
  }
  
  return pruned;
}

/**
 * Prune an array to keep only the N most recent items.
 * Uses updatedAt or createdAt for sorting, falls back to array position.
 * @param {Array} arr - Array of items
 * @param {number} maxItems - Maximum number of items to keep
 * @returns {Array} Pruned array
 */
export function pruneArray(arr, maxItems) {
  if (!Array.isArray(arr) || arr.length <= maxItems) return arr;
  
  // Sort by timestamp descending (newest first)
  const sorted = [...arr].sort((a, b) => {
    const timeA = new Date(a?.updatedAt || a?.createdAt || a?.date || a?.startDate || 0).getTime();
    const timeB = new Date(b?.updatedAt || b?.createdAt || b?.date || b?.startDate || 0).getTime();
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;
    return timeB - timeA;
  });
  
  const removed = sorted.length - maxItems;
  console.log(`🧹 Pruned ${removed} old items (kept ${maxItems} most recent)`);
  
  return sorted.slice(0, maxItems);
}

/**
 * Apply retention limits to all data types before a cloud save.
 * This is a safety net — it only removes the oldest data when limits are exceeded.
 * @param {Object} data - The full app data object
 * @returns {Object} Data with retention limits applied
 */
export function applyRetentionLimits(data) {
  if (!data || typeof data !== 'object') return data;
  
  const result = { ...data };
  
  // Prune date-keyed objects
  if (result.waterTracker && typeof result.waterTracker === 'object') {
    result.waterTracker = pruneDateKeyedObject(result.waterTracker, DATA_RETENTION_LIMITS.waterTracker);
  }
  if (result.taskCompletion && typeof result.taskCompletion === 'object') {
    result.taskCompletion = pruneDateKeyedObject(result.taskCompletion, DATA_RETENTION_LIMITS.taskCompletion);
  }
  if (result.calendarDone && typeof result.calendarDone === 'object') {
    result.calendarDone = pruneDateKeyedObject(result.calendarDone, DATA_RETENTION_LIMITS.calendarDone);
  }
  
  // Prune arrays
  if (Array.isArray(result.protocolHistory)) {
    result.protocolHistory = pruneArray(result.protocolHistory, DATA_RETENTION_LIMITS.protocolHistory);
  }
  if (Array.isArray(result.reconHistory)) {
    result.reconHistory = pruneArray(result.reconHistory, DATA_RETENTION_LIMITS.reconHistory);
  }
  if (Array.isArray(result.orders)) {
    result.orders = pruneArray(result.orders, DATA_RETENTION_LIMITS.orders);
  }
  
  return result;
}
