/**
 * Persists a daily "all tasks complete" streak in localStorage.
 * Increment at most once per calendar day when every task for that day is completed.
 */

const STORAGE_KEY = 'tpprover_task_streak_v1';

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysToKey(dateKey, deltaDays) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return formatDateKey(dt);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { streak: 0, lastRewardDate: null };
    const p = JSON.parse(raw);
    return {
      streak: typeof p.streak === 'number' && p.streak >= 0 ? p.streak : 0,
      lastRewardDate: typeof p.lastRewardDate === 'string' ? p.lastRewardDate : null,
    };
  } catch {
    return { streak: 0, lastRewardDate: null };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

/** Current streak count (days in a row with all tasks completed). */
export function getTaskStreak() {
  return loadState().streak;
}

/**
 * Full streak data for display: streak count, last rewarded date, and
 * an estimated start date derived from streak length.
 * @returns {{ streak: number, lastRewardDate: string|null, streakStartDate: string|null }}
 */
export function getTaskStreakData() {
  const state = loadState();
  let streakStartDate = null;
  if (state.lastRewardDate && state.streak > 0) {
    streakStartDate = addDaysToKey(state.lastRewardDate, -(state.streak - 1));
  }
  return { streak: state.streak, lastRewardDate: state.lastRewardDate, streakStartDate };
}

/**
 * When every task for `dateKey` is marked complete, bump streak (once per day max).
 * @param {Array<{ completed?: boolean }>} tasks
 * @param {string} dateKey YYYY-MM-DD
 * @returns {{ streak: number, incremented: boolean }}
 */
export function maybeIncrementStreakForAllTasksComplete(tasks, dateKey) {
  const state = loadState();
  if (!tasks || tasks.length === 0) {
    return { streak: state.streak, incremented: false };
  }
  const allDone = tasks.every((t) => t.completed === true);
  if (!allDone) {
    return { streak: state.streak, incremented: false };
  }
  if (state.lastRewardDate === dateKey) {
    return { streak: state.streak, incremented: false };
  }

  const yesterday = addDaysToKey(dateKey, -1);
  let nextStreak;
  if (state.lastRewardDate === null) {
    nextStreak = 1;
  } else if (state.lastRewardDate === yesterday) {
    nextStreak = state.streak + 1;
  } else {
    nextStreak = 1;
  }

  const newState = { streak: nextStreak, lastRewardDate: dateKey };
  saveState(newState);
  return { streak: nextStreak, incremented: true };
}
