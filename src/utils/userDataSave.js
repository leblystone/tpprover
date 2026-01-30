/**
 * User Data Save Pattern - Central helpers for synced user data
 * Use these so every create/update has id + updatedAt and stays consistent.
 * See USER_DATA_SAVE_PATTERN.md for the full pattern.
 */

import { generateId } from './string';

/**
 * Client-side timestamp for merge (ISO string, same as used across the app)
 */
export function getClientTimestamp() {
  return new Date().toISOString();
}

/**
 * Ensures an item has id and updatedAt for sync/merge.
 * Use on every create or update of a synced entity (protocols, orders, stockpile, etc.).
 * @param {Object} item - Raw item (may lack id or updatedAt)
 * @param {{ isNew?: boolean }} [options] - If isNew, always set updatedAt; otherwise preserve existing
 * @returns {Object} Item with id and updatedAt set
 */
export function prepareItemForSave(item, options = {}) {
  if (!item || typeof item !== 'object') return item;
  const { isNew = false } = options;
  const id = item.id || generateId(12);
  const updatedAt = isNew ? getClientTimestamp() : (item.updatedAt || getClientTimestamp());
  return { ...item, id, updatedAt };
}

/**
 * Alias for prepareItemForSave (same behavior)
 */
export function ensureItemTimestamp(item, options = {}) {
  return prepareItemForSave(item, options);
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
