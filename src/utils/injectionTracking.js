/**
 * Injection Site Tracking System
 * Stores and manages injection site data for user reference
 */

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
 * Get recent injection sites for a task (for quick selection)
 * @param {string} taskName - Name of the task
 */
export function getRecentInjectionSites(taskName) {
  const history = getInjectionHistory();
  const taskHistory = history.filter(record => record.taskName === taskName);
  
  // Count site frequency and return most common ones
  const siteCount = {};
  taskHistory.forEach(record => {
    siteCount[record.injectionSite] = (siteCount[record.injectionSite] || 0) + 1;
  });
  
  return Object.entries(siteCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([site, count]) => ({ site, count }));
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
 * Update injection statistics
 * @param {Object} injectionRecord - The injection record
 */
function updateInjectionStats(injectionRecord) {
  try {
    const stats = getInjectionStats();
    
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
    taskStats.sites[injectionRecord.injectionSite] = (taskStats.sites[injectionRecord.injectionSite] || 0) + 1;
    taskStats.lastInjection = injectionRecord.date;
    
    // Update global stats
    stats.global.totalInjections++;
    stats.global.sites[injectionRecord.injectionSite] = (stats.global.sites[injectionRecord.injectionSite] || 0) + 1;
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
 * Get injection site suggestions for a task
 * @param {string} taskName - Name of the task
 */
export function getInjectionSiteSuggestions(taskName) {
  const recentSites = getRecentInjectionSites(taskName);
  const stats = getInjectionStats();
  const taskStats = stats.tasks[taskName];
  
  // Combine recent sites with global popular sites
  const suggestions = [...recentSites];
  
  if (taskStats) {
    // Add task-specific popular sites
    Object.entries(taskStats.sites)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .forEach(([site, count]) => {
        if (!suggestions.find(s => s.site === site)) {
          suggestions.push({ site, count });
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
