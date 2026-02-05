/**
 * Unified Task Completion System
 * Syncs task completion between Dashboard and Calendar views
 * 
 * UNIFIED SYNC STRATEGY:
 * - Each completion now includes timestamp for conflict resolution
 * - Structure: { date: { slot: { taskId: { completed: bool, timestamp: number } } } }
 * - Backwards compatible: reads old boolean format, writes new object format
 */

import { toKey } from '../components/calendar/MonthGrid';

// Key for storing task completion data
const TASK_COMPLETION_KEY = 'tpprover_task_completion';
const CALENDAR_DONE_KEY = 'tpprover_calendar_done';

// Debounce timer for cloud sync
let cloudSyncTimeout = null;

/**
 * Get today's date key in YYYY-MM-DD format
 */
export function getTodayKey() {
  return toKey(new Date());
}

/**
 * Get task completion data from localStorage
 */
export function getTaskCompletion() {
  try {
    const saved = localStorage.getItem(TASK_COMPLETION_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * Save task completion data to localStorage
 */
export function saveTaskCompletion(completionData) {
  try {
    localStorage.setItem(TASK_COMPLETION_KEY, JSON.stringify(completionData));
  } catch (error) {
    console.error('Failed to save task completion:', error);
  }
}

/**
 * Get calendar done data from localStorage
 */
export function getCalendarDone() {
  try {
    const saved = localStorage.getItem(CALENDAR_DONE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * Save calendar done data to localStorage
 */
export function saveCalendarDone(doneData) {
  try {
    localStorage.setItem(CALENDAR_DONE_KEY, JSON.stringify(doneData));
  } catch (error) {
    console.error('Failed to save calendar done data:', error);
  }
}

/**
 * Mark a specific task as completed/uncompleted
 * @param {string} taskId - Unique task identifier
 * @param {boolean} completed - Whether the task is completed
 * @param {string} date - Date key (YYYY-MM-DD), defaults to today
 * @param {string} timeSlot - Time slot (AM/PM), defaults to AM
 */
export function toggleTaskCompletion(taskId, completed, date = getTodayKey(), timeSlot = 'AM') {
  const completionData = getTaskCompletion();
  
  // Initialize date if not exists
  if (!completionData[date]) {
    completionData[date] = {};
  }
  
  // Initialize time slot if not exists
  if (!completionData[date][timeSlot]) {
    completionData[date][timeSlot] = {};
  }
  
  // Set task completion status WITH TIMESTAMP for sync conflict resolution
  if (completed) {
    completionData[date][timeSlot][taskId] = {
      completed: true,
      timestamp: Date.now()
    };
  } else {
    // Remove the task entry when uncompleted
    delete completionData[date][timeSlot][taskId];
  }
  console.log('✅ Updated completion data:', completionData);
  
  // Clean up empty objects
  if (Object.keys(completionData[date][timeSlot]).length === 0) {
    delete completionData[date][timeSlot];
  }
  if (Object.keys(completionData[date]).length === 0) {
    delete completionData[date];
  }
  
  saveTaskCompletion(completionData);
  console.log('💾 Saved to localStorage');
  
  // Sync with calendar done system
  syncToCalendarDone();
  console.log('🔄 Synced to calendar');
  
  // Sync to cloud storage (debounced to avoid excessive API calls)
  syncTaskCompletionToCloud();
  
  // CRITICAL: Dispatch global event to notify all views of task completion change
  window.dispatchEvent(new CustomEvent('tpp:task-completion-changed', {
    detail: { taskId, completed, date, timeSlot, completionData }
  }));
  console.log('📡 Dispatched global task completion event');
  
  return completionData;
}

/**
 * Check if a specific task is completed
 * Handles both old format (boolean) and new format (object with timestamp)
 * @param {string} taskId - Unique task identifier
 * @param {string} date - Date key (YYYY-MM-DD), defaults to today
 * @param {string} timeSlot - Time slot (AM/PM), defaults to AM
 */
export function isTaskCompleted(taskId, date = getTodayKey(), timeSlot = 'AM') {
  const completionData = getTaskCompletion();
  const taskData = completionData[date]?.[timeSlot]?.[taskId];
  
  // Handle old format (boolean) and new format (object with timestamp)
  let isCompleted = false;
  if (taskData === true || taskData === false) {
    // Old format: boolean value
    isCompleted = taskData;
  } else if (taskData && typeof taskData === 'object') {
    // New format: object with completed and timestamp
    isCompleted = taskData.completed === true;
  }
  
  return isCompleted;
}

/**
 * Get all completed tasks for a specific date and time slot
 * Handles both old format (boolean) and new format (object with timestamp)
 * @param {string} date - Date key (YYYY-MM-DD), defaults to today
 * @param {string} timeSlot - Time slot (AM/PM), optional
 */
export function getCompletedTasks(date = getTodayKey(), timeSlot = null) {
  const completionData = getTaskCompletion();
  
  const isCompleted = (taskData) => {
    if (taskData === true) return true; // Old format
    if (taskData && typeof taskData === 'object') return taskData.completed === true; // New format
    return false;
  };
  
  if (timeSlot) {
    return Object.keys(completionData[date]?.[timeSlot] || {}).filter(
      taskId => isCompleted(completionData[date][timeSlot][taskId])
    );
  }
  
  // Return all completed tasks for the date
  const allCompleted = [];
  const dayData = completionData[date] || {};
  
  Object.keys(dayData).forEach(slot => {
    Object.keys(dayData[slot]).forEach(taskId => {
      if (isCompleted(dayData[slot][taskId])) {
        allCompleted.push({ taskId, timeSlot: slot });
      }
    });
  });
  
  return allCompleted;
}

/**
 * Sync task completion data to calendar done system
 * This maintains compatibility with the existing calendar completion tracking
 * Handles both old format (boolean) and new format (object with timestamp)
 */
export function syncToCalendarDone() {
  const completionData = getTaskCompletion();
  const calendarDone = {};
  
  const isCompleted = (taskData) => {
    if (taskData === true) return true; // Old format
    if (taskData && typeof taskData === 'object') return taskData.completed === true; // New format
    return false;
  };
  
  // Convert task completion data to calendar done format
  Object.keys(completionData).forEach(date => {
    const dayData = completionData[date];
    calendarDone[date] = {};
    
    Object.keys(dayData).forEach(timeSlot => {
      const slotTasks = dayData[timeSlot];
      const completedCount = Object.values(slotTasks).filter(isCompleted).length;
      
      if (completedCount > 0) {
        calendarDone[date][timeSlot] = completedCount;
      }
    });
    
    // Clean up empty date entries
    if (Object.keys(calendarDone[date]).length === 0) {
      delete calendarDone[date];
    }
  });
  
  saveCalendarDone(calendarDone);
}

/**
 * Generate a unique task ID from task properties
 * @param {Object} task - Task object with name, dose, unit, type, time; protocolId/peptideId for protocol scoping
 */
export function generateTaskId(task) {
  const { name, dose, unit, type, time, protocolId, peptideId } = task;
  // Create a stable ID that's unique but consistent across renders
  const normalizedName = (name || '').trim();
  const normalizedDose = (dose || '').trim();
  const normalizedUnit = (unit || '').trim();
  const normalizedType = (type || '').trim();
  const normalizedTime = (time || '').trim();

  let taskId = `${normalizedType}-${normalizedName}-${normalizedDose}-${normalizedUnit}-${normalizedTime}`;
  // Include protocol scope for peptides so completion doesn't bleed across protocols
  // (prevents new protocol from showing today as checked due to same peptide in another protocol)
  const pid = String(protocolId || '').trim();
  const pepId = String(peptideId || '').trim();
  if (type === 'peptide' && (pid || pepId)) {
    taskId += `-${pid.toLowerCase()}-${pepId.toLowerCase()}`;
  }
  return taskId.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Mark multiple tasks as completed in a time slot
 * Used by calendar quick edit functionality
 * @param {Array} taskIds - Array of task IDs to mark as completed
 * @param {string} date - Date key (YYYY-MM-DD)
 * @param {string} timeSlot - Time slot (AM/PM)
 */
export function markSlotTasksCompleted(taskIds, date, timeSlot) {
  const completionData = getTaskCompletion();
  
  // Initialize if needed
  if (!completionData[date]) completionData[date] = {};
  if (!completionData[date][timeSlot]) completionData[date][timeSlot] = {};
  
  // Mark all tasks as completed WITH TIMESTAMP
  const timestamp = Date.now();
  taskIds.forEach(taskId => {
    completionData[date][timeSlot][taskId] = {
      completed: true,
      timestamp
    };
  });
  
  saveTaskCompletion(completionData);
  syncToCalendarDone();
  
  return completionData;
}

/**
 * Get task completion stats for a date
 * Handles both old format (boolean) and new format (object with timestamp)
 * @param {string} date - Date key (YYYY-MM-DD)
 * @param {Object} scheduledTasks - Scheduled tasks for the date
 */
export function getCompletionStats(date, scheduledTasks) {
  const completionData = getTaskCompletion();
  const dayData = completionData[date] || {};
  
  const isCompleted = (taskData) => {
    if (taskData === true) return true; // Old format
    if (taskData && typeof taskData === 'object') return taskData.completed === true; // New format
    return false;
  };
  
  const stats = {
    total: 0,
    completed: 0,
    bySlot: {}
  };
  
  // Count scheduled tasks and completed tasks by slot
  if (scheduledTasks && scheduledTasks.bySlot) {
    Object.keys(scheduledTasks.bySlot).forEach(slot => {
      const slotData = scheduledTasks.bySlot[slot];
      const peptideCount = slotData.peptides?.length || 0;
      const supplementCount = slotData.supplements?.length || 0;
      const slotTotal = peptideCount + supplementCount;
      
      const completedInSlot = Object.values(dayData[slot] || {}).filter(isCompleted).length;
      
      stats.bySlot[slot] = {
        total: slotTotal,
        completed: completedInSlot
      };
      
      stats.total += slotTotal;
      stats.completed += completedInSlot;
    });
  }
  
  return stats;
}

/**
 * Sync task completion data to cloud storage (debounced)
 * This ensures completion data persists across devices and sessions
 */
function syncTaskCompletionToCloud() {
  // Clear existing timeout
  if (cloudSyncTimeout) {
    clearTimeout(cloudSyncTimeout);
  }
  
  // Debounce cloud sync to avoid excessive API calls
  cloudSyncTimeout = setTimeout(async () => {
    try {
      // Get current user from localStorage (set by AppContext)
      const userData = localStorage.getItem('tpprover_user');
      if (!userData) {
        // User not logged in, skip cloud sync
        return;
      }
      
      const user = JSON.parse(userData);
      const userId = user?.uid || user?.id;
      if (!userId) {
        return;
      }
      
      // Get completion data
      const taskCompletion = getTaskCompletion();
      const calendarDone = getCalendarDone();
      
      // Import saveAppData dynamically to avoid circular dependencies
      const { saveAppData } = await import('../services/cloudStorage');
      
      // Get current app data to merge with
      const { loadAppData } = await import('../services/cloudStorage');
      const currentAppData = await loadAppData(userId) || {};
      
      // Save with task completion data included
      await saveAppData(userId, {
        ...currentAppData,
        taskCompletion,
        calendarDone
      });
      
      console.log('☁️ Task completion synced to cloud');
    } catch (error) {
      console.warn('⚠️ Failed to sync task completion to cloud:', error);
      // Don't throw - this is a background sync, shouldn't block the UI
    }
  }, 2000); // 2 second debounce
}
