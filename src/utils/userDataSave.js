/**
 * User Data Save Pattern - Central helpers for synced user data
 * Use these so every create/update has id + updatedAt and stays consistent.
 * See USER_DATA_SAVE_PATTERN.md for the full pattern.
 * 
 * UNIFIED SYNC STRATEGY:
 * - All timestamps use Firestore serverTimestamp() for accuracy
 * - Eliminates clock drift and timezone issues
 * - Single source of truth: Google's server clock (UTC)
 */

import { generateId } from './string';
import { serverTimestamp } from 'firebase/firestore';

/**
 * Server timestamp marker - will be replaced with actual timestamp on save
 * Use this instead of client-side timestamps for accurate cross-device sync
 */
export const SERVER_TIMESTAMP = serverTimestamp;

/**
 * Ensures an item has id and server timestamp marker for sync/merge.
 * Use on every create or update of a synced entity (protocols, orders, stockpile, etc.).
 * @param {Object} item - Raw item (may lack id or updatedAt)
 * @param {{ isNew?: boolean, preserveTimestamp?: boolean }} [options] - If isNew or no updatedAt, adds server timestamp marker
 * @returns {Object} Item with id and updatedAt set to server timestamp marker
 */
export function prepareItemForSave(item, options = {}) {
  if (!item || typeof item !== 'object') return item;
  const { isNew = false, preserveTimestamp = false } = options;
  const id = item.id || generateId(12);
  
  // Use server timestamp for new items or items without timestamp
  // If preserveTimestamp is true and item has updatedAt, keep it (for migrations)
  const updatedAt = (preserveTimestamp && item.updatedAt) 
    ? item.updatedAt 
    : (isNew || !item.updatedAt) 
      ? serverTimestamp() 
      : item.updatedAt;
      
  return { ...item, id, updatedAt };
}

/**
 * Alias for prepareItemForSave (same behavior)
 */
export function ensureItemTimestamp(item, options = {}) {
  return prepareItemForSave(item, options);
}

/**
 * Ensures an item has a server timestamp marker.
 * Use for objects that need timestamps but may not have id/updatedAt pattern.
 * @param {Object} item - Item to ensure has server timestamp
 * @param {string} timestampField - Field name for timestamp (default: 'updatedAt')
 * @returns {Object} Item with server timestamp marker
 */
export function ensureServerTimestamp(item, timestampField = 'updatedAt') {
  if (!item || typeof item !== 'object') return item;
  return {
    ...item,
    [timestampField]: item[timestampField] || serverTimestamp()
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
