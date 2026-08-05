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

function rowTime(m) {
  return new Date(m.updatedAt || m.createdAt || m.date || 0).getTime();
}

function hasWellnessFields(m) {
  return (
    m?.sleep != null ||
    m?.energy != null ||
    m?.mood != null ||
    m?.pain != null ||
    (m?.bodyfat != null && String(m.bodyfat).trim() !== '')
  );
}

function hasWeightFields(m) {
  const type = String(m?.type || '').toLowerCase();
  const label = String(m?.label || '').toLowerCase();
  return (
    m?.weight != null ||
    type === 'weight' ||
    label.includes('weight') ||
    (m?.value != null && (type === 'weight' || label.includes('weight')))
  );
}

/** Prefer a full wellness row, then weight, then most recently updated. */
export function pickPreferredMetric(entries) {
  if (!entries?.length) return null;
  const wellness = entries.find(hasWellnessFields);
  if (wellness) return wellness;
  const weight = entries.find(hasWeightFields);
  if (weight) return weight;
  return [...entries].sort((a, b) => rowTime(b) - rowTime(a))[0];
}

/**
 * Find + merge all metric rows for a calendar day into one edit payload.
 * Keeps the preferred entry's id so saves update in place.
 */
export function getMergedMetricForDay(metrics, dateKey) {
  if (!dateKey) return null;
  const entries = (metrics || []).filter((m) => metricDateKey(m) === dateKey);
  if (entries.length === 0) return null;
  const preferred = pickPreferredMetric(entries);
  if (!preferred) return null;

  // Oldest → newest so newer field values win
  const chronological = [...entries].sort((a, b) => rowTime(a) - rowTime(b));
  const merged = { ...preferred };
  for (const m of chronological) {
    for (const key of ['weight', 'bodyfat', 'sleep', 'energy', 'mood', 'pain', 'unit', 'notes', 'type', 'label', 'value']) {
      if (m[key] != null && m[key] !== '') merged[key] = m[key];
    }
  }
  merged.id = preferred.id;
  merged.date = dateKey;
  merged._dayEntryIds = entries.map((e) => e.id).filter(Boolean);
  return merged;
}

/** One display/edit row per calendar day (newest day first). */
export function groupMetricsByDay(metrics) {
  const byDay = new Map();
  for (const m of metrics || []) {
    const k = metricDateKey(m);
    if (!k) continue;
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(m);
  }
  return [...byDay.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((dateKey) => getMergedMetricForDay(metrics, dateKey))
    .filter(Boolean);
}

/**
 * Upsert a metric for its date: update preferred same-day row, drop other same-day dupes.
 */
export function upsertMetricForDay(metrics, metric, { keepId, now = new Date().toISOString() } = {}) {
  const dateKey = metricDateKey(metric) || metric?.date;
  if (!dateKey) {
    const id = keepId || metric.id;
    if (id) {
      return (metrics || []).map((m) => (m.id === id ? { ...m, ...metric, id, updatedAt: now } : m));
    }
    return [{ ...metric, id: metric.id, createdAt: now, updatedAt: now }, ...(metrics || [])];
  }

  const sameDay = (metrics || []).filter((m) => metricDateKey(m) === dateKey);
  const preferred = keepId
    ? sameDay.find((m) => m.id === keepId) || pickPreferredMetric(sameDay)
    : pickPreferredMetric(sameDay);
  const id = preferred?.id || keepId || metric.id;
  const dropIds = new Set(sameDay.map((m) => m.id).filter((x) => x && x !== id));

  const nextRow = {
    ...(preferred || {}),
    ...metric,
    id,
    date: dateKey,
    updatedAt: now,
    createdAt: preferred?.createdAt || metric.createdAt || now,
  };
  delete nextRow._dayEntryIds;

  const withoutDupes = (metrics || []).filter((m) => !dropIds.has(m.id) && m.id !== id);
  return [nextRow, ...withoutDupes];
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
const PAIN_L = { 1: 'None', 2: 'Moderate', 3: 'High' };

export function wellnessLabel(field, value) {
  if (value == null) return '';
  const tables = { sleep: SLEEP_L, energy: ENERGY_L, mood: MOOD_L, pain: PAIN_L };
  const t = tables[field];
  return t?.[value] || String(value);
}
