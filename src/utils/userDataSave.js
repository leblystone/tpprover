/**
 * User Data Save Pattern - Central helpers for synced user data
 * Use these so every create/update has id + updatedAt and stays consistent.
 * See USER_DATA_SAVE_PATTERN.md for the full pattern.
 * 
 * TIMESTAMP STRATEGY:
 * - Local state & localStorage use ISO strings (new Date().toISOString())
 * - Firestore document-level lastUpdated uses serverTimestamp() (set in cloudStorage.js)
 * - ISO strings are safe for JSON.stringify, merge comparisons, and cross-device sync
 * - Minor clock drift between devices is acceptable (seconds, not minutes)
 */

import { generateId } from './string';

/**
 * Get a reliable ISO timestamp for local use.
 * Uses client clock (acceptable for merge conflict resolution).
 */
function localTimestamp() {
  return new Date().toISOString();
}

/**
 * Server timestamp marker - ONLY for direct Firestore writes, NOT for local state.
 * Import serverTimestamp from firebase/firestore directly when needed for Firestore docs.
 * @deprecated Use localTimestamp() for items that go into React state or localStorage.
 */
export const SERVER_TIMESTAMP = () => {
  console.warn('⚠️ SERVER_TIMESTAMP used — prefer localTimestamp() for local state');
  return localTimestamp();
};

/**
 * Ensures an item has id and updatedAt timestamp for sync/merge.
 * Use on every create or update of a synced entity (protocols, orders, stockpile, etc.).
 * @param {Object} item - Raw item (may lack id or updatedAt)
 * @param {{ isNew?: boolean, preserveTimestamp?: boolean }} [options] - If isNew or no updatedAt, adds timestamp
 * @returns {Object} Item with id and updatedAt set to ISO string
 */
export function prepareItemForSave(item, options = {}) {
  if (!item || typeof item !== 'object') return item;
  const { isNew = false, preserveTimestamp = false } = options;
  const id = item.id || generateId(12);
  
  // Use ISO string timestamp — safe for localStorage, JSON.stringify, and merge comparisons
  const updatedAt = preserveTimestamp && item.updatedAt
    ? item.updatedAt 
    : localTimestamp();
      
  return { ...item, id, updatedAt };
}

/**
 * Alias for prepareItemForSave (same behavior)
 */
export function ensureItemTimestamp(item, options = {}) {
  return prepareItemForSave(item, options);
}

/**
 * Ensures an item has a timestamp.
 * Use for objects that need timestamps but may not have id/updatedAt pattern.
 * @param {Object} item - Item to ensure has timestamp
 * @param {string} timestampField - Field name for timestamp (default: 'updatedAt')
 * @returns {Object} Item with ISO timestamp
 */
export function ensureServerTimestamp(item, timestampField = 'updatedAt') {
  if (!item || typeof item !== 'object') return item;
  return {
    ...item,
    [timestampField]: item[timestampField] || localTimestamp()
  };
}

/**
 * Ensures each element in an array has id and updatedAt.
 * Use before passing an array to saveAppData if items might lack timestamps.
 * @param {Array} items - Array of items
 * @param {{ isNew?: boolean }} [options] - Passed to prepareItemForSave per item
 * @returns {Array} New array with each item having id and updatedAt
 */
export function ensureItemsForSave(items, options = {}) {
  if (!Array.isArray(items)) return items;
  return items.map((item) => prepareItemForSave(item, options));
}
