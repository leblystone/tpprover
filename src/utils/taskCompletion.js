/**
 * Unified Task Completion System
 * Syncs task completion between Dashboard and Calendar views
 */

import { toKey } from '../components/calendar/MonthGrid';

// Key for storing task completion data
const TASK_COMPLETION_KEY = 'tpprover_task_completion';
const CALENDAR_DONE_KEY = 'tpprover_calendar_done';

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
  console.log('🔄 Toggle Task Completion:', {
    taskId,
    completed,
    date,
    timeSlot
  });
  
  const completionData = getTaskCompletion();
  console.log('📋 Current completion data:', completionData);
  
  // Initialize date if not exists
  if (!completionData[date]) {
    completionData[date] = {};
  }
  
  // Initialize time slot if not exists
  if (!completionData[date][timeSlot]) {
    completionData[date][timeSlot] = {};
  }
  
  // Set task completion status
  completionData[date][timeSlot][taskId] = completed;
  console.log('✅ Updated completion data:', completionData);
  
  // Clean up empty objects if task was uncompleted
  if (!completed && Object.keys(completionData[date][timeSlot]).filter(id => completionData[date][timeSlot][id]).length === 0) {
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
  
  return completionData;
}

/**
 * Check if a specific task is completed
 * @param {string} taskId - Unique task identifier
 * @param {string} date - Date key (YYYY-MM-DD), defaults to today
 * @param {string} timeSlot - Time slot (AM/PM), defaults to AM
 */
export function isTaskCompleted(taskId, date = getTodayKey(), timeSlot = 'AM') {
  const completionData = getTaskCompletion();
  const isCompleted = completionData[date]?.[timeSlot]?.[taskId] || false;
  
  console.log('❓ Check Task Completion:', {
    taskId,
    date,
    timeSlot,
    isCompleted,
    availableData: completionData[date]?.[timeSlot] || {}
  });
  
  return isCompleted;
}

/**
 * Get all completed tasks for a specific date and time slot
 * @param {string} date - Date key (YYYY-MM-DD), defaults to today
 * @param {string} timeSlot - Time slot (AM/PM), optional
 */
export function getCompletedTasks(date = getTodayKey(), timeSlot = null) {
  const completionData = getTaskCompletion();
  
  if (timeSlot) {
    return Object.keys(completionData[date]?.[timeSlot] || {}).filter(
      taskId => completionData[date][timeSlot][taskId]
    );
  }
  
  // Return all completed tasks for the date
  const allCompleted = [];
  const dayData = completionData[date] || {};
  
  Object.keys(dayData).forEach(slot => {
    Object.keys(dayData[slot]).forEach(taskId => {
      if (dayData[slot][taskId]) {
        allCompleted.push({ taskId, timeSlot: slot });
      }
    });
  });
  
  return allCompleted;
}

/**
 * Sync task completion data to calendar done system
 * This maintains compatibility with the existing calendar completion tracking
 */
export function syncToCalendarDone() {
  const completionData = getTaskCompletion();
  const calendarDone = {};
  
  // Convert task completion data to calendar done format
  Object.keys(completionData).forEach(date => {
    const dayData = completionData[date];
    calendarDone[date] = {};
    
    Object.keys(dayData).forEach(timeSlot => {
      const slotTasks = dayData[timeSlot];
      const completedCount = Object.values(slotTasks).filter(Boolean).length;
      
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
 * @param {Object} task - Task object with name, dose, unit, type, time
 */
export function generateTaskId(task) {
  const { name, dose, unit, type, time } = task;
  // Create a stable ID that's unique but consistent across renders
  // Normalize values to ensure consistency
  const normalizedName = (name || '').trim();
  const normalizedDose = (dose || '').trim();
  const normalizedUnit = (unit || '').trim();
  const normalizedType = (type || '').trim();
  const normalizedTime = (time || '').trim();
  
  const taskId = `${normalizedType}-${normalizedName}-${normalizedDose}-${normalizedUnit}-${normalizedTime}`.toLowerCase().replace(/\s+/g, '-');
  
  // Debug logging to help track issues
  console.log('🆔 Generated Task ID:', {
    original: task,
    generated: taskId
  });
  
  return taskId;
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
  
  // Mark all tasks as completed
  taskIds.forEach(taskId => {
    completionData[date][timeSlot][taskId] = true;
  });
  
  saveTaskCompletion(completionData);
  syncToCalendarDone();
  
  return completionData;
}

/**
 * Get task completion stats for a date
 * @param {string} date - Date key (YYYY-MM-DD)
 * @param {Object} scheduledTasks - Scheduled tasks for the date
 */
export function getCompletionStats(date, scheduledTasks) {
  const completionData = getTaskCompletion();
  const dayData = completionData[date] || {};
  
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
      
      const completedInSlot = Object.values(dayData[slot] || {}).filter(Boolean).length;
      
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
