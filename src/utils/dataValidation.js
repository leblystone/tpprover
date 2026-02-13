import { serverTimestamp } from 'firebase/firestore';

/**
 * Data Validation Utility
 * 
 * Validates data structure before writing to Firestore to prevent data loss
 * and catch bugs early in development.
 */

/**
 * Check if a value is a valid Firestore serverTimestamp sentinel
 */
function isServerTimestampSentinel(value) {
  return value && typeof value === 'object' && value.constructor && value.constructor.name === 'FieldValue';
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
