/**
 * Persists a daily "all tasks complete" streak in localStorage.
 * Increment at most once per calendar day when every task for that day is completed.
 */

export const TASK_STREAK_STORAGE_KEY = 'tpprover_task_streak_v1';
export const STREAK_MILESTONE_DAYS = [7, 30, 90];

/** Fire streak UI events after a successful daily increment. */
export function dispatchStreakIncrementEvents(streak, incremented) {
  if (!incremented || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('tpp:task-streak-updated', { detail: { streak } }));
  window.dispatchEvent(new CustomEvent('tpp:daily-tasks-unlock', { detail: { streak } }));
  if (STREAK_MILESTONE_DAYS.includes(streak)) {
    window.dispatchEvent(new CustomEvent('tpp:streak-milestone', { detail: { streak } }));
  }
}

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
    const raw = localStorage.getItem(TASK_STREAK_STORAGE_KEY);
    if (!raw) return { streak: 0, lastRewardDate: null };
    return normalizeTaskStreakState(JSON.parse(raw));
  } catch {
    return { streak: 0, lastRewardDate: null };
  }
}

function normalizeTaskStreakState(state) {
  const source = state && typeof state === 'object' ? state : {};
  const streak = typeof source.streak === 'number' && source.streak >= 0 ? source.streak : 0;
  const lastRewardDate = typeof source.lastRewardDate === 'string' ? source.lastRewardDate : null;
  const updatedAt = source.updatedAt || null;
  return updatedAt ? { streak, lastRewardDate, updatedAt } : { streak, lastRewardDate };
}

function getStateTimestamp(state) {
  if (!state || typeof state !== 'object') return 0;
  if (typeof state.updatedAt === 'number') return state.updatedAt;
  if (typeof state.updatedAt === 'string') {
    const parsed = new Date(state.updatedAt).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (typeof state.lastRewardDate === 'string') {
    const parsed = new Date(`${state.lastRewardDate}T00:00:00`).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function getRewardDateTimestamp(state) {
  if (!state || typeof state.lastRewardDate !== 'string') return 0;
  const parsed = new Date(`${state.lastRewardDate}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Cloud sync happens through AppContext's guarded, queued auto-sync, triggered
// by the 'tpp:task-streak-updated' event — never write directly to Firestore
// here (a direct read-modify-write would bypass the isInitialLoad guard and
// can race with the main auto-sync).
function saveState(state, { dispatch = false, source } = {}) {
  try {
    localStorage.setItem(TASK_STREAK_STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem('tpprover_task_streak_lastUpdate', String(Date.now()));

    if (dispatch && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tpp:task-streak-updated', { detail: { streak: state.streak, source } }));
    }
  } catch {
    /* ignore quota */
  }
}

/** Current streak count (days in a row with all tasks completed). */
export function getTaskStreak() {
  return loadState().streak;
}

export function getTaskStreakState() {
  return loadState();
}

export function getTaskStreakStateForSave() {
  const state = loadState();
  return state.streak > 0 || state.lastRewardDate ? state : {};
}

export function mergeTaskStreak(localState, cloudState) {
  const local = normalizeTaskStreakState(localState);
  const cloud = normalizeTaskStreakState(cloudState);
  const localRewardTs = getRewardDateTimestamp(local);
  const cloudRewardTs = getRewardDateTimestamp(cloud);

  if (localRewardTs > cloudRewardTs) return local;
  if (cloudRewardTs > localRewardTs) return cloud;
  if ((local.streak || 0) > (cloud.streak || 0)) return local;
  if ((cloud.streak || 0) > (local.streak || 0)) return cloud;

  const localTs = getStateTimestamp(local);
  const cloudTs = getStateTimestamp(cloud);

  if (localTs > cloudTs) return local;
  if (cloudTs > localTs) return cloud;
  return local;
}

export function restoreTaskStreakFromCloud(cloudState) {
  const merged = mergeTaskStreak(loadState(), cloudState);
  saveState(merged, { dispatch: true, source: 'cloud-sync' });
  return merged;
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
  // Skipped doses are excluded from streak planned set (no adherence penalty)
  const countable = tasks.filter((t) => !t._skipped && !t.skipped && !t._rescheduled && !t.rescheduled);
  if (countable.length === 0) {
    return { streak: state.streak, incremented: false };
  }
  const allDone = countable.every((t) => t.completed === true);
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

  const newState = { streak: nextStreak, lastRewardDate: dateKey, updatedAt: new Date().toISOString() };
  saveState(newState);
  return { streak: nextStreak, incremented: true };
}
