/**
 * Normalize mixed metric shapes (full BodyMetricsModal rows vs quick dashboard weight logs).
 */

export function metricDateKey(m) {
  if (!m?.date) return null;
  const d = typeof m.date === 'string' ? m.date : '';
  if (!d) return null;
  return d.includes('T') ? d.split('T')[0] : d;
}

function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** Parsed fields for display + charts (null = not set). */
export function normalizeMetricRow(m) {
  if (!m) {
    return {
      weight: null,
      weightUnit: 'lbs',
      bodyfat: null,
      sleep: null,
      energy: null,
      mood: null,
      pain: null,
    };
  }
  const type = String(m.type || '').toLowerCase();
  const label = String(m.label || '').toLowerCase();

  let weight = numOrNull(m.weight);
  if (weight == null && (type === 'weight' || label.includes('weight'))) {
    weight = numOrNull(m.value);
  }

  const weightUnit = m.unit || 'lbs';
  const bodyfat = numOrNull(m.bodyfat);

  const rating = (x) => {
    const n = typeof x === 'number' ? x : parseInt(x, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  };

  return {
    weight,
    weightUnit,
    bodyfat,
    sleep: rating(m.sleep),
    energy: rating(m.energy),
    mood: rating(m.mood),
    pain: rating(m.pain),
  };
}

function rowTime(m) {
  return new Date(m.updatedAt || m.createdAt || m.date || 0).getTime();
}

/** Merge multiple metric rows for the same calendar day (e.g. quick weight + full entry). */
export function mergeMetricsForDay(entries) {
  const sorted = [...entries].sort((a, b) => rowTime(b) - rowTime(a));
  const out = normalizeMetricRow(null);
  for (const m of sorted) {
    const n = normalizeMetricRow(m);
    if (n.weight != null) {
      out.weight = n.weight;
      out.weightUnit = n.weightUnit || out.weightUnit;
    }
    if (n.bodyfat != null) out.bodyfat = n.bodyfat;
    if (n.sleep != null) out.sleep = n.sleep;
    if (n.energy != null) out.energy = n.energy;
    if (n.mood != null) out.mood = n.mood;
    if (n.pain != null) out.pain = n.pain;
  }
  return out;
}

const SLEEP_L = { 1: 'Poor', 2: 'Okay', 3: 'Great' };
const ENERGY_L = { 1: 'Low', 2: 'Med', 3: 'High' };
const MOOD_L = { 1: 'Low', 2: 'OK', 3: 'Good' };
const PAIN_L = { 1: 'None', 2: 'Mod', 3: 'High' };

export function wellnessLabel(field, value) {
  if (value == null) return '';
  const tables = { sleep: SLEEP_L, energy: ENERGY_L, mood: MOOD_L, pain: PAIN_L };
  const t = tables[field];
  return t?.[value] || String(value);
}
