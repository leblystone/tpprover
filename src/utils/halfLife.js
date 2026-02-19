/**
 * Half-life decay math utilities.
 * All functions are pure math — no prescriptive or medical language.
 */

/**
 * Normalize a peptide's halfLife object to hours.
 * Returns 0 if no valid half-life data.
 */
export function getHalfLifeInHours(peptide) {
  const hl = peptide?.halfLife;
  if (!hl || !hl.value) return 0;
  const val = parseFloat(hl.value);
  if (isNaN(val) || val <= 0) return 0;
  return hl.unit === 'days' ? val * 24 : val;
}

/**
 * Remaining fraction (0–1) at a given elapsed time.
 * e.g. getLevelAtTime(6, 6) => 0.5
 */
export function getLevelAtTime(halfLifeHours, elapsedHours) {
  if (halfLifeHours <= 0 || elapsedHours < 0) return 1;
  return Math.pow(0.5, elapsedHours / halfLifeHours);
}

/**
 * Time (hours) for ~99.2% clearance (7 half-lives).
 */
export function getClearanceTimeHours(halfLifeHours) {
  if (halfLifeHours <= 0) return 0;
  return halfLifeHours * 7;
}

/**
 * Build an array of { hour, level } points for rendering a decay curve.
 * @param {number} halfLifeHours
 * @param {number} totalHours  — the x-axis span
 * @param {number} steps       — number of data points (default 100)
 */
export function buildDecayCurve(halfLifeHours, totalHours, steps = 100) {
  if (halfLifeHours <= 0 || totalHours <= 0) return [];
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const hour = (i / steps) * totalHours;
    points.push({ hour, level: getLevelAtTime(halfLifeHours, hour) });
  }
  return points;
}

/**
 * Calculate washout progress for a specific date within a washout window.
 * Returns null if no valid half-life data.
 */
export function getWashoutProgress(washoutStartDate, washoutEndDate, currentDate, halfLifeHours) {
  if (!washoutStartDate || !washoutEndDate || !currentDate) return null;
  const start = new Date(washoutStartDate);
  const end = new Date(washoutEndDate);
  const current = new Date(currentDate);
  const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const dayIndex = Math.max(0, Math.round((current - start) / 86400000));
  const decayFraction = halfLifeHours > 0
    ? getLevelAtTime(halfLifeHours, dayIndex * 24)
    : null;
  return { dayIndex, totalDays, decayFraction };
}

/**
 * Format hours into a human-friendly string.
 * e.g. 72 => "3d", 4.5 => "4.5h", 36 => "1.5d"
 */
export function formatHalfLifeTime(hours) {
  if (hours <= 0) return '—';
  if (hours < 24) return `${Number(hours.toFixed(1))}h`;
  const days = hours / 24;
  return `${Number(days.toFixed(1))}d`;
}
