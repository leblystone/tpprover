/**
 * Injection Site Tracking System
 * Stores and manages injection site data for user reference
 * 
 * UNIFIED SYNC STRATEGY:
 * - Injection stats now include timestamps for conflict resolution
 * - Structure: { sites: { siteName: { count: number, lastUpdated: number } } }
 * - Backwards compatible: reads old number format, writes new object format
 */

import { isInjectionSiteTrackingEnabled } from './injectionSiteSettings';

const INJECTION_HISTORY_KEY = 'tpprover_injection_history';
const INJECTION_STATS_KEY = 'tpprover_injection_stats';

/**
 * Get injection history from localStorage
 */
export function getInjectionHistory() {
  try {
    const saved = localStorage.getItem(INJECTION_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Save injection history to localStorage
 */
export function saveInjectionHistory(history) {
  try {
    localStorage.setItem(INJECTION_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save injection history:', error);
  }
}

/**
 * Record an injection site for a task
 * @param {Object} task - Task object with name, type, etc.
 * @param {string} injectionSite - Selected injection site
 * @param {Date} date - Date of injection (defaults to today)
 * @param {string} timeSlot - Time slot (AM/PM)
 */
export function recordInjectionSite(task, injectionSite, date = new Date(), timeSlot = 'AM') {
  // Check if injection site tracking is enabled
  if (!isInjectionSiteTrackingEnabled()) {
    console.log('💉 Injection site tracking is disabled, skipping recording');
    return null;
  }

  // Don't record if no injection site was provided
  if (!injectionSite || injectionSite.trim() === '') {
    console.log('💉 No injection site provided, skipping recording');
    return null;
  }

  const history = getInjectionHistory();
  
  const injectionRecord = {
    id: generateInjectionId(),
    taskName: task.name,
    taskType: task.type,
    injectionSite: injectionSite,
    date: date.toISOString(),
    dateKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    timeSlot: timeSlot,
    timestamp: Date.now(),
    // Store additional task context for reference
    dose: task.dose,
    unit: task.unit,
    deliveryMethod: task.deliveryMethod || task.delivery,
    penColor: task.penColor,
    penType: task.penType
  };
  
  // Add to beginning of history (most recent first)
  history.unshift(injectionRecord);
  
  // Keep only last 1000 records to prevent localStorage bloat
  if (history.length > 1000) {
    history.splice(1000);
  }
  
  saveInjectionHistory(history);
  updateInjectionStats(injectionRecord);
  
  console.log('💾 Injection site recorded:', injectionRecord);
  
  return injectionRecord;
}

/**
 * Generate unique injection record ID
 */
function generateInjectionId() {
  return `injection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Ensure every injection history record has an id (for cloud sync / merge).
 * Mutates in place; returns the same array.
 */
export function ensureInjectionHistoryIds(history) {
  if (!Array.isArray(history)) return history;
  history.forEach((record) => {
    if (!record || typeof record !== 'object') return;
    if (!record.id || String(record.id).trim() === '') {
      record.id = generateInjectionId();
    }
  });
  return history;
}

/**
 * Get injection history for a specific task
 * @param {string} taskName - Name of the task
 * @param {number} limit - Maximum number of records to return
 */
export function getTaskInjectionHistory(taskName, limit = 10) {
  const history = getInjectionHistory();
  return history
    .filter(record => record.taskName === taskName)
    .slice(0, limit);
}

/**
 * Get recent injection sites for a task (for quick selection).
 * Returns each unique site with its last-used date (most recent write), not count.
 * @param {string} taskName - Name of the task
 */
export function getRecentInjectionSites(taskName) {
  const history = getInjectionHistory();
  const taskHistory = history.filter(record => record.taskName === taskName);
  // History is most-recent first; first occurrence per site = last used
  const siteToLastUsed = {};
  taskHistory.forEach(record => {
    const site = record.injectionSite;
    if (site && !siteToLastUsed[site]) {
      siteToLastUsed[site] = record.date || record.timestamp;
    }
  });

  return Object.entries(siteToLastUsed)
    .map(([site, lastUsed]) => ({ site, lastUsed }))
    .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
    .slice(0, 5);
}

/**
 * Get injection history for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
export function getInjectionHistoryByDateRange(startDate, endDate) {
  const history = getInjectionHistory();
  return history.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= startDate && recordDate <= endDate;
  });
}

/**
 * Helper: Get count from site data (handles old and new format)
 */
function getSiteCount(siteData) {
  if (typeof siteData === 'number') return siteData; // Old format
  if (siteData && typeof siteData === 'object') return siteData.count || 0; // New format
  return 0;
}

/**
 * Helper: Increment site count with timestamp
 */
function incrementSiteCount(sites, siteName, timestamp) {
  const currentCount = getSiteCount(sites[siteName]);
  sites[siteName] = {
    count: currentCount + 1,
    lastUpdated: timestamp
  };
}

/**
 * Update injection statistics WITH TIMESTAMPS for sync conflict resolution
 * @param {Object} injectionRecord - The injection record
 */
function updateInjectionStats(injectionRecord) {
  try {
    const stats = getInjectionStats();
    const timestamp = Date.now();
    
    // Update task-specific stats
    if (!stats.tasks[injectionRecord.taskName]) {
      stats.tasks[injectionRecord.taskName] = {
        totalInjections: 0,
        sites: {},
        lastInjection: null
      };
    }
    
    const taskStats = stats.tasks[injectionRecord.taskName];
    taskStats.totalInjections++;
    incrementSiteCount(taskStats.sites, injectionRecord.injectionSite, timestamp);
    taskStats.lastInjection = injectionRecord.date;
    
    // Update global stats
    stats.global.totalInjections++;
    incrementSiteCount(stats.global.sites, injectionRecord.injectionSite, timestamp);
    stats.global.lastInjection = injectionRecord.date;
    
    saveInjectionStats(stats);
  } catch (error) {
    console.error('Failed to update injection stats:', error);
  }
}

/**
 * Get injection statistics
 */
export function getInjectionStats() {
  try {
    const saved = localStorage.getItem(INJECTION_STATS_KEY);
    return saved ? JSON.parse(saved) : {
      global: {
        totalInjections: 0,
        sites: {},
        lastInjection: null
      },
      tasks: {}
    };
  } catch {
    return {
      global: {
        totalInjections: 0,
        sites: {},
        lastInjection: null
      },
      tasks: {}
    };
  }
}

/**
 * Save injection statistics
 */
function saveInjectionStats(stats) {
  try {
    localStorage.setItem(INJECTION_STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to save injection stats:', error);
  }
}

/**
 * Get injection site suggestions for a task (by last-used date, not count).
 * @param {string} taskName - Name of the task
 */
export function getInjectionSiteSuggestions(taskName) {
  const recentSites = getRecentInjectionSites(taskName);
  const stats = getInjectionStats();
  const taskStats = stats.tasks[taskName];

  const suggestions = [...recentSites];

  if (taskStats && taskStats.sites) {
    Object.keys(taskStats.sites)
      .slice(0, 3)
      .forEach((site) => {
        if (!suggestions.find((s) => s.site === site)) {
          suggestions.push({ site, lastUsed: taskStats.lastInjection || null });
        }
      });
  }

  return suggestions.slice(0, 5);
}

/**
 * Export injection data for backup
 */
export function exportInjectionData() {
  const history = getInjectionHistory();
  const stats = getInjectionStats();
  
  return {
    history,
    stats,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
}

/**
 * Import injection data from backup
 */
export function importInjectionData(data) {
  try {
    if (data.history && Array.isArray(data.history)) {
      saveInjectionHistory(data.history);
    }
    if (data.stats && typeof data.stats === 'object') {
      saveInjectionStats(data.stats);
    }
    return true;
  } catch (error) {
    console.error('Failed to import injection data:', error);
    return false;
  }
}

/**
 * Update an injection history record
 * @param {string} recordId - ID of the record to update
 * @param {Object} updates - Fields to update (injectionSite, dose, unit, etc.)
 */
export function updateInjectionRecord(recordId, updates) {
  try {
    const history = getInjectionHistory();
    const index = history.findIndex(record => record.id === recordId);
    
    if (index === -1) {
      console.error('Injection record not found:', recordId);
      return false;
    }
    
    // Update the record
    history[index] = {
      ...history[index],
      ...updates
    };
    
    saveInjectionHistory(history);
    console.log('💾 Injection record updated:', history[index]);
    return true;
  } catch (error) {
    console.error('Failed to update injection record:', error);
    return false;
  }
}

/**
 * Delete an injection history record
 * @param {string} recordId - ID of the record to delete
 */
export function deleteInjectionRecord(recordId) {
  try {
    const history = getInjectionHistory();
    const filteredHistory = history.filter(record => record.id !== recordId);
    
    if (filteredHistory.length === history.length) {
      console.error('Injection record not found:', recordId);
      return false;
    }
    
    saveInjectionHistory(filteredHistory);
    console.log('🗑️ Injection record deleted:', recordId);
    return true;
  } catch (error) {
    console.error('Failed to delete injection record:', error);
    return false;
  }
}