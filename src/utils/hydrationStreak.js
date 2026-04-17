/**
 * Hydration goal streak: consecutive calendar days the user met their daily intake goal.
 * Stored in localStorage (tpprover_hydration_streak_v1), independent of water tracker shape.
 */

const STORAGE_KEY = 'tpprover_hydration_streak_v1';

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
    if (!raw) return { streak: 0, lastCountedDate: null };
    const p = JSON.parse(raw);
    return {
      streak: typeof p.streak === 'number' && p.streak >= 0 ? p.streak : 0,
      lastCountedDate: typeof p.lastCountedDate === 'string' ? p.lastCountedDate : null,
    };
  } catch {
    return { streak: 0, lastCountedDate: null };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

/** Normalized intake for a day (dashboard uses `amount`, legacy widget uses `glasses`). */
export function getWaterDayAmount(day) {
  if (!day || typeof day !== 'object') return 0;
  const a = day.amount ?? day.glasses;
  const n = Number(a);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function getWaterDayGoal(day, fallbackGoal) {
  const g = Number(day?.goal);
  if (Number.isFinite(g) && g > 0) return g;
  const fb = Number(fallbackGoal);
  return Number.isFinite(fb) && fb > 0 ? fb : 64;
}

/** Count calendar days in the tracker where intake met or exceeded goal. */
export function countHydrationGoalDays(waterData) {
  let n = 0;
  for (const [, v] of Object.entries(waterData || {})) {
    if (!v || typeof v !== 'object') continue;
    const a = getWaterDayAmount(v);
    const g = getWaterDayGoal(v, 0);
    if (g > 0 && a >= g) n++;
  }
  return n;
}

export function getHydrationStreak() {
  return loadState().streak;
}

/**
 * @returns {{ streak: number, lastCountedDate: string|null, streakStartDate: string|null }}
 */
export function getHydrationStreakData() {
  const state = loadState();
  let streakStartDate = null;
  if (state.lastCountedDate && state.streak > 0) {
    streakStartDate = addDaysToKey(state.lastCountedDate, -(state.streak - 1));
  }
  return { streak: state.streak, lastCountedDate: state.lastCountedDate, streakStartDate };
}

/**
 * When intake meets or exceeds goal, count at most once per calendar day toward streak.
 * @returns {{ streak: number, incremented: boolean, celebrated: boolean }}
 */
export function maybeRegisterHydrationGoalMet(dateKey, amount, goal) {
  const g = Number(goal) || 0;
  const a = Number(amount) || 0;
  const state = loadState();
  if (g <= 0 || a < g) {
    return { streak: state.streak, incremented: false, celebrated: false };
  }
  if (state.lastCountedDate === dateKey) {
    return { streak: state.streak, incremented: false, celebrated: false };
  }

  const yesterday = addDaysToKey(dateKey, -1);
  let nextStreak;
  if (state.lastCountedDate === null) {
    nextStreak = 1;
  } else if (state.lastCountedDate === yesterday) {
    nextStreak = state.streak + 1;
  } else {
    nextStreak = 1;
  }

  const newState = { streak: nextStreak, lastCountedDate: dateKey };
  saveState(newState);
  try {
    window.dispatchEvent(new CustomEvent('tpp:hydration-streak-updated', { detail: { streak: nextStreak, dateKey } }));
  } catch {
    /* non-browser */
  }
  return { streak: nextStreak, incremented: true, celebrated: true };
}

/**
 * After updating water tracker for a day, run streak + one-time daily toast if goal newly met.
 * @param {string} dateKey YYYY-MM-DD
 * @param {object} dayEntry tracker row for that day
 */
export function tryHydrationGoalRewards(dateKey, dayEntry) {
  const amt = getWaterDayAmount(dayEntry);
  const g = getWaterDayGoal(dayEntry, 0);
  const res = maybeRegisterHydrationGoalMet(dateKey, amt, g);
  if (res.celebrated) {
    const msg =
      res.streak === 1
        ? 'Daily hydration goal complete! Come back tomorrow to start a streak.'
        : `Hydration goal crushed — ${res.streak} days in a row!`;
    try {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: msg, type: 'success' } }));
      window.dispatchEvent(new CustomEvent('tpp:hydration-goal-complete', { detail: { streak: res.streak, dateKey } }));
    } catch {
      /* non-browser */
    }
  }
  return res;
}
