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
export function toggleTaskCompletion(taskId, completed, date = getTodayKey(), timeSlot = 'AM', deliveryMethod = null) {
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
  localStorage.setItem('tpprover_task_completion_lastUpdate', String(Date.now()));
  console.log('💾 Saved to localStorage');
  
  // Sync with calendar done system
  syncToCalendarDone();
  console.log('🔄 Synced to calendar');
  
  // Sync to cloud storage (debounced to avoid excessive API calls)
  syncTaskCompletionToCloud();
  
  // CRITICAL: Dispatch global event to notify all views of task completion change
  window.dispatchEvent(new CustomEvent('tpp:task-completion-changed', {
    detail: { taskId, completed, date, timeSlot, completionData, deliveryMethod }
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
 * Generate a unique task ID from task properties.
 * NOTE: dose and unit are intentionally excluded so that dose changes
 * do not orphan historical completion records. Protocol scope
 * (protocolId + peptideId) is sufficient to uniquely identify a peptide task.
 * @param {Object} task - Task object with name, type, time; protocolId/peptideId for protocol scoping
 */
export function generateTaskId(task) {
  const { name, type, time, protocolId, peptideId } = task;
  const normalizedName = (name || '').trim();
  const normalizedType = (type || '').trim();
  const normalizedTime = (time || '').trim();

  let taskId = `${normalizedType}-${normalizedName}-${normalizedTime}`;
  // Include protocol scope for peptides so completion doesn't bleed across protocols
  const pid = String(protocolId || '').trim();
  const pepId = String(peptideId || '').trim();
  if (type === 'peptide' && (pid || pepId)) {
    taskId += `-${pid.toLowerCase()}-${pepId.toLowerCase()}`;
  }
  // Catch-up extras must not collide with the regularly scheduled dose on the same day
  if (task._extraSlot || task.isCatchUp) {
    const from = String(task._fromDateKey || task.fromDateKey || task._extraId || 'x').trim();
    taskId += `-catchup-${from.toLowerCase()}`;
  }
  return taskId.toLowerCase().replace(/\s+/g, '-');
}

/**
 * One-time migration: remap old task completion IDs (which embedded dose/unit)
 * to the new dose-independent format.
 * Old format: peptide-{name}-{dose}-{unit}-{slot}-{protocolId}-{peptideId}
 * New format: peptide-{name}-{slot}-{protocolId}-{peptideId}
 *
 * @param {Array} protocols - Current user protocols from app state
 */
export function migrateTaskCompletionIds(protocols) {
  const MIGRATION_KEY = 'tpprover_task_completion_id_migrated_v1';
  if (localStorage.getItem(MIGRATION_KEY)) return false;

  const completionData = getTaskCompletion();
  if (!completionData || Object.keys(completionData).length === 0) {
    localStorage.setItem(MIGRATION_KEY, '1');
    return false;
  }

  // Build suffix -> new ID mappings from current protocols
  // suffix: `-${protocolId}-${peptideId}` (lowercase)
  const suffixMap = {};
  (protocols || []).forEach(p => {
    const pid = String(p.id ?? '').toLowerCase();
    if (!pid) return;

    const basePeptides = (Array.isArray(p.peptides) && p.peptides.length > 0)
      ? p.peptides
      : [{ name: p.name || p.peptide, id: null }];

    basePeptides.forEach((pep, idx) => {
      const pepId = String(pep.id || `peptide-${idx}`).toLowerCase();
      const normalizedName = (pep.name || 'Peptide').trim().toLowerCase().replace(/\s+/g, '-');
      const suffix = `-${pid}-${pepId}`;

      if (!suffixMap[suffix]) suffixMap[suffix] = [];
      ['am', 'pm'].forEach(slot => {
        suffixMap[suffix].push({
          newId: `peptide-${normalizedName}-${slot}-${pid}-${pepId}`,
          slot
        });
      });
    });

    // Blended protocol pseudo-peptide
    const blendedPepId = `${pid}-blended`;
    const blendedSuffix = `-${pid}-${blendedPepId}`;
    const blendedName = (p.protocolName || p.name || 'blended-protocol').trim().toLowerCase().replace(/\s+/g, '-');
    if (!suffixMap[blendedSuffix]) suffixMap[blendedSuffix] = [];
    ['am', 'pm'].forEach(slot => {
      suffixMap[blendedSuffix].push({
        newId: `peptide-${blendedName}-${slot}-${pid}-${blendedPepId}`,
        slot
      });
    });
  });

  let migratedCount = 0;
  const newCompletionData = {};

  Object.keys(completionData).forEach(date => {
    newCompletionData[date] = {};
    Object.keys(completionData[date]).forEach(slotKey => {
      newCompletionData[date][slotKey] = {};
      const slotLower = slotKey.toLowerCase();

      Object.keys(completionData[date][slotKey]).forEach(taskId => {
        const value = completionData[date][slotKey][taskId];
        let newTaskId = taskId;

        if (taskId.startsWith('peptide-')) {
          for (const [suffix, mappings] of Object.entries(suffixMap)) {
            if (taskId.endsWith(suffix)) {
              const mapping = mappings.find(m => m.slot === slotLower);
              if (mapping && taskId !== mapping.newId) {
                newTaskId = mapping.newId;
                migratedCount++;
              }
              break;
            }
          }
        }

        // Avoid clobbering an already-migrated key for the same new ID
        if (!newCompletionData[date][slotKey][newTaskId]) {
          newCompletionData[date][slotKey][newTaskId] = value;
        }
      });

      if (Object.keys(newCompletionData[date][slotKey]).length === 0) {
        delete newCompletionData[date][slotKey];
      }
    });

    if (Object.keys(newCompletionData[date]).length === 0) {
      delete newCompletionData[date];
    }
  });

  saveTaskCompletion(newCompletionData);
  localStorage.setItem(MIGRATION_KEY, '1');

  if (migratedCount > 0) {
    console.log(`✅ Migrated ${migratedCount} task completion IDs to dose-independent format`);
  }
  return migratedCount > 0;
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
 * Move completion state when a dose is rescheduled between AM/PM for one day.
 * Keeps adherence aligned with the new slot.
 */
export function migrateTaskCompletionSlot(dateKey, task, fromSlot, toSlot) {
  if (!dateKey || !task || !fromSlot || !toSlot || fromSlot === toSlot) return;
  const from = String(fromSlot).toUpperCase();
  const to = String(toSlot).toUpperCase();
  const completionData = getTaskCompletion();
  const oldTaskId = generateTaskId({ ...task, time: from });
  const slotData = completionData[dateKey]?.[from];
  if (!slotData || !Object.prototype.hasOwnProperty.call(slotData, oldTaskId)) return;
  const val = slotData[oldTaskId];
  if (!completionData[dateKey]) completionData[dateKey] = {};
  if (!completionData[dateKey][to]) completionData[dateKey][to] = {};
  const newTaskId = generateTaskId({ ...task, time: to });
  if (!completionData[dateKey][to][newTaskId]) {
    completionData[dateKey][to][newTaskId] = val;
  }
  delete completionData[dateKey][from][oldTaskId];
  if (Object.keys(completionData[dateKey][from]).length === 0) {
    delete completionData[dateKey][from];
  }
  if (Object.keys(completionData[dateKey]).length === 0) {
    delete completionData[dateKey];
  }

  saveTaskCompletion(completionData);
  localStorage.setItem('tpprover_task_completion_lastUpdate', String(Date.now()));
  syncToCalendarDone();
  syncTaskCompletionToCloud();
  window.dispatchEvent(
    new CustomEvent('tpp:task-completion-changed', {
      detail: { taskId: newTaskId, date: dateKey, timeSlot: to, completionData },
    })
  );
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
  
  // Count scheduled tasks and completed tasks by slot (skipped doses do not count toward adherence)
  if (scheduledTasks && scheduledTasks.bySlot) {
    Object.keys(scheduledTasks.bySlot).forEach(slot => {
      const slotData = scheduledTasks.bySlot[slot];
      const peptides = (slotData.peptides || []).filter((p) => !p?._skipped && !p?._rescheduled);
      const supplements = (slotData.supplements || []).filter((s) => !(typeof s === 'object' && (s._skipped || s._rescheduled)));
      const slotTotal = peptides.length + supplements.length;
      
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
 * Give immediate UI feedback (topbar spinner) that a change is pending sync.
 * The actual cloud write happens through AppContext's guarded, queued
 * auto-sync — triggered by the 'tpp:task-completion-changed' event dispatched
 * alongside this call. Do NOT write to Firestore directly here: a direct
 * read-modify-write bypasses the isInitialLoad/hasLoadedFromFirestore guards
 * and can race with the main auto-sync, risking a lost update on startup.
 */
function syncTaskCompletionToCloud() {
  if (cloudSyncTimeout) {
    clearTimeout(cloudSyncTimeout);
    cloudSyncTimeout = null;
  }
  try {
    import('./syncErrorReporting').then(({ dispatchSyncStatus }) => {
      dispatchSyncStatus('saving');
    }).catch(() => {});
  } catch (_) { /* ignore */ }
}
