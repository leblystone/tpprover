/**
 * Blood / lab value journal — personal log only (no clinical interpretation).
 * Synced via AppContext / cloudStorage as `labResults`.
 *
 * Local key: tpprover_lab_results
 * Event: tpp:lab-results-updated
 */

import { prepareItemForSave } from './userDataSave';
import { recordDeletion } from './deletionTracking';
import { CUSTOM_MARKER_KEY, getLabMarkerByKey } from '../data/labMarkers';

export const LAB_RESULTS_KEY = 'tpprover_lab_results';
export const LAB_RESULTS_EVENT = 'tpp:lab-results-updated';

export function getLabResults() {
  try {
    const raw = localStorage.getItem(LAB_RESULTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLabResults(list, options = {}) {
  const next = Array.isArray(list) ? list : [];
  // Soft cap
  if (next.length > 2000) next.length = 2000;
  try {
    localStorage.setItem(LAB_RESULTS_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('Failed to save lab results:', error);
  }
  try {
    window.dispatchEvent(
      new CustomEvent(LAB_RESULTS_EVENT, {
        detail: { labResults: next, source: options.source || 'local' },
      })
    );
  } catch {
    /* ignore */
  }
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * @param {Object} fields
 * @returns {Object} saved item
 */
export function addLabResult(fields) {
  const markerKey = fields.markerKey || CUSTOM_MARKER_KEY;
  const catalog = markerKey !== CUSTOM_MARKER_KEY ? getLabMarkerByKey(markerKey) : null;
  const markerName =
    (fields.markerName || '').trim() ||
    catalog?.name ||
    'Custom marker';
  const unit = (fields.unit || '').trim() || catalog?.unit || '';

  const entry = prepareItemForSave(
    {
      markerKey,
      markerName,
      value: fields.value === '' || fields.value == null ? null : Number(fields.value),
      unit,
      date: fields.date || todayKey(),
      notes: fields.notes || '',
    },
    { isNew: true }
  );

  const next = [entry, ...getLabResults()];
  saveLabResults(next);
  return entry;
}

export function updateLabResult(id, fields) {
  const list = getLabResults();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;

  const prev = list[idx];
  const markerKey = fields.markerKey !== undefined ? fields.markerKey : prev.markerKey;
  const catalog = markerKey && markerKey !== CUSTOM_MARKER_KEY ? getLabMarkerByKey(markerKey) : null;

  const updated = prepareItemForSave({
    ...prev,
    ...fields,
    id,
    markerKey,
    markerName:
      fields.markerName !== undefined
        ? String(fields.markerName || '').trim() || prev.markerName
        : prev.markerName || catalog?.name,
    value:
      fields.value !== undefined
        ? fields.value === '' || fields.value == null
          ? null
          : Number(fields.value)
        : prev.value,
    unit: fields.unit !== undefined ? String(fields.unit || '').trim() : prev.unit,
    date: fields.date !== undefined ? fields.date : prev.date,
  });

  const next = [...list];
  next[idx] = updated;
  saveLabResults(next);
  return updated;
}

export function deleteLabResult(id) {
  const list = getLabResults();
  const item = list.find((r) => r.id === id);
  if (item) recordDeletion('labResults', id, item);
  else recordDeletion('labResults', id);
  const next = list.filter((r) => r.id !== id);
  saveLabResults(next);
  return next;
}

/** Unique markers present in the user's log, newest first by last entry */
export function getLoggedMarkerKeys(results = getLabResults()) {
  const seen = new Map();
  for (const r of results || []) {
    const key = r.markerKey === CUSTOM_MARKER_KEY ? `custom:${r.markerName}` : r.markerKey;
    if (!key || seen.has(key)) continue;
    seen.set(key, {
      key: r.markerKey,
      markerName: r.markerName,
      unit: r.unit,
      seriesKey: key,
    });
  }
  return [...seen.values()];
}

/**
 * Points for a single marker series, sorted by date ascending.
 * @param {Array} results
 * @param {{ markerKey: string, markerName?: string }} selector
 */
export function getMarkerSeries(results, selector) {
  const { markerKey, markerName } = selector || {};
  const filtered = (results || []).filter((r) => {
    if (markerKey === CUSTOM_MARKER_KEY || markerKey?.startsWith?.('custom:')) {
      return r.markerKey === CUSTOM_MARKER_KEY && r.markerName === (markerName || selector.markerName);
    }
    if (typeof markerKey === 'string' && markerKey.startsWith('custom:')) {
      return r.markerKey === CUSTOM_MARKER_KEY && r.markerName === markerKey.slice(7);
    }
    return r.markerKey === markerKey;
  });
  return filtered
    .filter((r) => r.value != null && Number.isFinite(Number(r.value)) && r.date)
    .map((r) => ({
      date: r.date,
      value: Number(r.value),
      unit: r.unit,
      id: r.id,
      notes: r.notes,
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
