/**
 * cloudMerge.js — Centralized cloud-to-local merge utility
 *
 * WHY THIS EXISTS:
 * React closures inside useEffect callbacks capture state at setup time.
 * If you write `mergeWithTimestamps(orders, freshData.orders)` inside a
 * Firestore listener, `orders` is frozen as of when the effect ran — any
 * data the user added afterward is invisible to the merge, silently dropping
 * their work.
 *
 * THE RULE: Never use React state as the local side of a cloud merge.
 *           Always read from localStorage here — it's always up-to-date.
 *
 * HOW TO USE:
 *   import { mergeCloudData } from '../utils/cloudMerge';
 *
 *   // Inside any listener/callback, just call:
 *   const merged = mergeCloudData('orders', freshData.orders, deletionTracking.orders);
 *   setOrders(merged);
 */

import { mergeWithTimestamps } from '../services/cloudStorage';
import { safeParseLocalStorage } from './dataValidation';
import { migrateCalendarNotesToIdBased } from './calendarNotesMigration';

// Map: data type name → localStorage key + default value
const DATA_TYPE_MAP = {
    protocols:      { key: 'tpprover_protocols',        default: [] },
    reconItems:     { key: 'tpprover_recon_items',      default: [] },
    reconHistory:   { key: 'tpprover_recon_history',    default: [] },
    supplements:    { key: 'tpprover_supplements',      default: [] },
    orders:         { key: 'tpprover_orders',           default: [] },
    metrics:        { key: 'tpprover_metrics',          default: [] },
    vendors:        { key: 'tpprover_vendors',          default: [] },
    stockpile:      { key: 'tpprover_stockpile',        default: [] },
    scheduledBuys:  { key: 'tpprover_scheduled_buys',   default: [] },
    protocolHistory:{ key: 'tpprover_protocol_history', default: [] },
    calendarNotes:  { key: 'tpprover_calendar_notes',   default: {} },
};

/**
 * Merge incoming cloud data for a given data type against the freshest local
 * data from localStorage, using timestamp-aware merge logic.
 *
 * @param {string} type        - Key from DATA_TYPE_MAP (e.g. 'orders')
 * @param {Array|Object} cloudData  - Incoming data from Firestore
 * @param {Array} [deletionLog=[]]  - Deletion tracking entries for this type
 * @returns {Array|Object} Merged result safe to pass to React state setter
 */
export function mergeCloudData(type, cloudData, deletionLog = []) {
    if (!cloudData) return null;

    const config = DATA_TYPE_MAP[type];
    if (!config) {
        console.warn(`[cloudMerge] Unknown data type: "${type}"`);
        return cloudData;
    }

    const localData = safeParseLocalStorage(config.key, config.default);

    // calendarNotes is an object (keyed by date), not an array —
    // local always wins on a per-key basis so the user's edits survive.
    if (type === 'calendarNotes') {
        const migratedCloud = migrateCalendarNotesToIdBased(cloudData);
        return { ...migratedCloud, ...localData };
    }

    return mergeWithTimestamps(localData, cloudData, type, deletionLog);
}

/**
 * Read the freshest local snapshot for a data type directly from localStorage.
 * Use this instead of React state inside any async callback or listener.
 *
 * @param {string} type - Key from DATA_TYPE_MAP
 * @returns {Array|Object}
 */
export function getLocalData(type) {
    const config = DATA_TYPE_MAP[type];
    if (!config) {
        console.warn(`[cloudMerge] Unknown data type: "${type}"`);
        return [];
    }
    return safeParseLocalStorage(config.key, config.default);
}
