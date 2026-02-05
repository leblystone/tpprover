/**
 * Sync Queue System - Ensures only one cloud write happens at a time
 * Prevents overlapping writes and "last write wins" data loss
 * 
 * UNIFIED SYNC STRATEGY:
 * - Queue all save operations
 * - Process one at a time
 * - Track status for UI indicators
 * - Handle errors gracefully
 */

class SyncQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.currentOperation = null;
    this.listeners = new Set();
    this.lastSaveTime = null;
    this.stats = {
      totalProcessed: 0,
      totalFailed: 0,
      queueHighWater: 0
    };
  }

  /**
   * Add operation to queue
   * @param {Function} operation - Async function to execute
   * @param {Object} metadata - Optional metadata (for logging/debugging)
   * @returns {Promise} - Resolves when operation completes
   */
  addToQueue(operation, metadata = {}) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        operation,
        metadata,
        resolve,
        reject,
        addedAt: Date.now(),
        id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      this.queue.push(queueItem);
      
      // Track high water mark
      if (this.queue.length > this.stats.queueHighWater) {
        this.stats.queueHighWater = this.queue.length;
      }

      // Notify listeners of queue change
      this.notifyListeners();

      // Start processing if not already
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queue one item at a time
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    this.notifyListeners();

    while (this.queue.length > 0) {
      const queueItem = this.queue.shift();
      this.currentOperation = queueItem;
      this.notifyListeners();

      try {
        const result = await queueItem.operation();
        queueItem.resolve(result);
        this.stats.totalProcessed++;
        this.lastSaveTime = Date.now();
      } catch (error) {
        console.error('❌ Sync queue operation failed:', {
          metadata: queueItem.metadata,
          error: error.message,
          queueId: queueItem.id
        });
        queueItem.reject(error);
        this.stats.totalFailed++;
      }

      this.currentOperation = null;
      this.notifyListeners();
    }

    this.processing = false;
    this.notifyListeners();
  }

  /**
   * Clear all pending operations (emergency use - logout, account switch)
   */
  clearQueue() {
    const clearedCount = this.queue.length;
    
    // Reject all pending operations
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    
    this.queue = [];
    this.processing = false;
    this.currentOperation = null;
    this.notifyListeners();

    console.log(`🧹 Sync queue cleared: ${clearedCount} operations cancelled`);
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      idle: !this.processing && this.queue.length === 0,
      currentOperation: this.currentOperation ? this.currentOperation.metadata : null,
      lastSaveTime: this.lastSaveTime,
      stats: this.stats
    };
  }

  /**
   * Subscribe to queue status changes
   * @param {Function} listener - Called when queue status changes
   * @returns {Function} - Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of status change
   */
  notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Sync queue listener error:', error);
      }
    });
  }

  /**
   * Check if queue is getting too long (potential issue)
   */
  isQueueBackedUp() {
    return this.queue.length > 10;
  }

  /**
   * Get queue diagnostics for debugging
   */
  getDiagnostics() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      stats: this.stats,
      pendingOperations: this.queue.map(item => ({
        id: item.id,
        metadata: item.metadata,
        waitTime: Date.now() - item.addedAt
      })),
      currentOperation: this.currentOperation ? {
        id: this.currentOperation.id,
        metadata: this.currentOperation.metadata,
        duration: Date.now() - this.currentOperation.addedAt
      } : null
    };
  }
}

// Global singleton instance
const syncQueue = new SyncQueue();

// Export functions
export const addToSyncQueue = (operation, metadata) => syncQueue.addToQueue(operation, metadata);
export const clearSyncQueue = () => syncQueue.clearQueue();
export const getSyncQueueStatus = () => syncQueue.getStatus();
export const subscribeSyncQueue = (listener) => syncQueue.subscribe(listener);
export const getSyncQueueDiagnostics = () => syncQueue.getDiagnostics();

// Export singleton for advanced use
export default syncQueue;
