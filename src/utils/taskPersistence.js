/**
 * Task Persistence Debugging Utility
 * Helps debug task completion persistence issues
 */

/**
 * Debug localStorage task completion data
 */
export function debugTaskCompletion() {
  try {
    const taskCompletion = localStorage.getItem('tpprover_task_completion');
    const calendarDone = localStorage.getItem('tpprover_calendar_done');
    const taskStreak = localStorage.getItem('tpprover_task_streak_v1');
    const hydrationStreak = localStorage.getItem('tpprover_hydration_streak_v1');
    
    console.log('🔍 TASK COMPLETION DEBUG:');
    console.log('📋 Task Completion Data:', taskCompletion ? JSON.parse(taskCompletion) : null);
    console.log('📅 Calendar Done Data:', calendarDone ? JSON.parse(calendarDone) : null);
    console.log('🔥 Task Streak Data:', taskStreak ? JSON.parse(taskStreak) : null);
    console.log('💧 Hydration Streak Data:', hydrationStreak ? JSON.parse(hydrationStreak) : null);
    
    return {
      taskCompletion: taskCompletion ? JSON.parse(taskCompletion) : null,
      calendarDone: calendarDone ? JSON.parse(calendarDone) : null,
      taskStreak: taskStreak ? JSON.parse(taskStreak) : null
    };
  } catch (error) {
    console.error('❌ Error debugging task completion:', error);
    return null;
  }
}

/**
 * Clear all task completion data (for testing)
 */
export function clearTaskCompletion() {
  localStorage.removeItem('tpprover_task_completion');
  localStorage.removeItem('tpprover_calendar_done');
  localStorage.removeItem('tpprover_task_streak_v1');
  localStorage.removeItem('tpprover_hydration_streak_v1');
  console.log('🧹 Cleared all task completion data');
}

/**
 * Validate task completion data integrity
 */
export function validateTaskCompletion() {
  const data = debugTaskCompletion();
  if (!data) return false;
  
  const issues = [];
  
  // Check for empty or malformed data
  if (!data.taskCompletion) {
    issues.push('No task completion data found');
  }
  
  if (!data.calendarDone) {
    issues.push('No calendar done data found');
  }
  
  // Check for data structure issues
  if (data.taskCompletion && typeof data.taskCompletion !== 'object') {
    issues.push('Task completion data is not an object');
  }
  
  if (data.calendarDone && typeof data.calendarDone !== 'object') {
    issues.push('Calendar done data is not an object');
  }

  if (data.taskStreak && typeof data.taskStreak !== 'object') {
    issues.push('Task streak data is not an object');
  }
  
  if (issues.length > 0) {
    console.warn('⚠️ Task completion validation issues:', issues);
    return false;
  }
  
  console.log('✅ Task completion data validation passed');
  return true;
}

// Expose debugging functions globally for console access
if (typeof window !== 'undefined') {
  window.debugTaskCompletion = debugTaskCompletion;
  window.clearTaskCompletion = clearTaskCompletion;
  window.validateTaskCompletion = validateTaskCompletion;
}

