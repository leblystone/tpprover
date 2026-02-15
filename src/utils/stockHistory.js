import { prepareItemForSave } from './userDataSave';

const STORAGE_KEY = 'tpprover_stockpile_history';
const MAX_HISTORY_EVENTS = 500;

/**
 * Append a stock event to the stockpile history log.
 * Each event gets an id/updatedAt for cloud sync and is capped at MAX_HISTORY_EVENTS.
 *
 * @param {Object} event - Event data. Required: { type }
 *   Supported types: 'created', 'adjust', 'out_of_stock', 'used', 'deleted',
 *                    'linked_to_protocol', 'documentation_added', 'merge'
 *   Optional source metadata: { source: 'order'|'recon'|'protocol'|'manual', orderId, reconId, protocolId }
 */
export function appendStockEvent(event) {
  try {
    const rec = prepareItemForSave({
      date: new Date().toISOString(),
      ...event
    });
    const arr = getStockHistory();
    arr.unshift(rec);

    // Cap at MAX_HISTORY_EVENTS to prevent localStorage overflow
    if (arr.length > MAX_HISTORY_EVENTS) {
      arr.length = MAX_HISTORY_EVENTS;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

    // Notify AppContext so it triggers a cloud sync
    window.dispatchEvent(new CustomEvent('tpp:stockpile-history-updated'));
  } catch (e) {
    console.error('Failed to append stock event:', e);
  }
}

export function getStockHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}
