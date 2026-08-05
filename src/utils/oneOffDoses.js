/**
 * One-off dose logs — standalone dose entries (no protocol required).
 * Synced via AppContext / cloudStorage as `oneOffDoses`.
 *
 * Local key: tpprover_one_off_doses
 * Event: tpp:one-off-doses-updated
 */

import { prepareItemForSave } from './userDataSave';
import { recordDeletion } from './deletionTracking';
import { generateId } from './string';

export const ONE_OFF_DOSES_KEY = 'tpprover_one_off_doses';
export const ONE_OFF_DOSES_EVENT = 'tpp:one-off-doses-updated';

/**
 * @returns {Array}
 */
export function getOneOffDoses() {
  try {
    const raw = localStorage.getItem(ONE_OFF_DOSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * @param {Array} doses
 * @param {{ source?: string }} [options]
 */
export function saveOneOffDoses(doses, options = {}) {
  const list = Array.isArray(doses) ? doses : [];
  try {
    localStorage.setItem(ONE_OFF_DOSES_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('Failed to save one-off doses:', error);
  }
  try {
    window.dispatchEvent(
      new CustomEvent(ONE_OFF_DOSES_EVENT, {
        detail: { oneOffDoses: list, source: options.source || 'local' },
      })
    );
  } catch {
    /* ignore */
  }
}

/**
 * Create and persist a one-off dose entry.
 * @param {Object} fields
 * @returns {Object} saved item
 */
export function appendOneOffDose(fields) {
  const entry = prepareItemForSave(
    {
      peptideName: (fields.peptideName || '').trim(),
      dose: fields.dose ?? '',
      unit: fields.unit || 'mg',
      dateKey: fields.dateKey,
      timeSlot: fields.timeSlot || 'AM',
      deliveryMethod: fields.deliveryMethod || '',
      notes: fields.notes || '',
      injectionSite: fields.injectionSite || '',
      protocolId: fields.protocolId ?? null,
      createdAt: new Date().toISOString(),
    },
    { isNew: true }
  );

  const next = [entry, ...getOneOffDoses()];
  // Soft cap to avoid unbounded growth
  if (next.length > 2000) next.length = 2000;
  saveOneOffDoses(next);
  return entry;
}

/**
 * Update an existing one-off dose by id.
 * @param {string} id
 * @param {Object} patch
 * @returns {Object|null}
 */
export function updateOneOffDose(id, patch) {
  const list = getOneOffDoses();
  const idx = list.findIndex((d) => d && d.id === id);
  if (idx < 0) return null;
  const updated = prepareItemForSave({ ...list[idx], ...patch }, { isNew: false });
  const next = [...list];
  next[idx] = updated;
  saveOneOffDoses(next);
  return updated;
}

/**
 * Link a one-off dose to a promoted as-needed protocol.
 * @param {string} doseId
 * @param {string} protocolId
 */
export function linkOneOffDoseToProtocol(doseId, protocolId) {
  return updateOneOffDose(doseId, { protocolId });
}

/**
 * @param {string} id
 */
export function deleteOneOffDose(id) {
  const list = getOneOffDoses();
  const target = list.find((d) => d && d.id === id);
  if (target) recordDeletion('oneOffDoses', id, target);
  else recordDeletion('oneOffDoses', id);
  saveOneOffDoses(list.filter((d) => d && d.id !== id));
}

/**
 * Doses for a given YYYY-MM-DD.
 * @param {string} dateKey
 * @param {Array} [doses]
 */
export function getOneOffDosesForDate(dateKey, doses) {
  const list = Array.isArray(doses) ? doses : getOneOffDoses();
  return list.filter((d) => d && d.dateKey === dateKey);
}

/**
 * Build a display task-like object for calendar/today UI.
 * @param {Object} dose
 */
export function oneOffDoseToDisplayTask(dose) {
  if (!dose) return null;
  const name = dose.peptideName || 'One-off dose';
  const doseLabel = dose.dose ? `${dose.dose}${dose.unit || ''}` : '';
  return {
    id: `oneoff-${dose.id}`,
    oneOffDoseId: dose.id,
    name,
    type: 'one_off',
    isOneOff: true,
    completed: true,
    time: dose.timeSlot || 'AM',
    dose: dose.dose,
    unit: dose.unit,
    deliveryMethod: dose.deliveryMethod,
    notes: dose.notes,
    injectionSite: dose.injectionSite,
    protocolId: dose.protocolId,
    label: doseLabel ? `${name} ${doseLabel}` : name,
    subtitle: 'One-off',
  };
}

/**
 * Normalize a peptide/protocol name for duplicate matching:
 * strips emoji, "(as needed)", and non-alphanumerics.
 * @param {string} name
 * @returns {string}
 */
export function normalizePeptideNameForMatch(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\(as\s*needed\)/gi, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^a-z0-9]+/g, '');
}

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/**
 * Find an active as-needed protocol whose peptide roughly matches the given name.
 * Tolerates emoji, "(as needed)" suffixes, and small typos (edit distance ≤ 2).
 * @param {Array} protocols
 * @param {string} peptideName
 * @returns {Object|null}
 */
export function findExistingAsNeededProtocol(protocols, peptideName) {
  if (!Array.isArray(protocols) || !peptideName) return null;
  const needle = normalizePeptideNameForMatch(peptideName);
  if (!needle) return null;

  return (
    protocols.find((p) => {
      if (!p || p.active === false) return false;
      const peptides = Array.isArray(p.peptides) ? p.peptides : [];
      return peptides.some((pep) => {
        if ((pep.frequency?.type || '') !== 'as_needed') return false;
        const cand = normalizePeptideNameForMatch(pep.name);
        if (!cand) return false;
        if (cand === needle) return true;
        // Near-match for typos like Cagrilintide vs Cagrilinitide
        if (needle.length >= 6 && cand.length >= 6 && editDistance(needle, cand) <= 2) {
          return true;
        }
        return false;
      });
    }) || null
  );
}

/**
 * Create an as-needed protocol payload from a one-off dose (caller adds via addProtocol).
 * @param {Object} dose
 * @returns {Object}
 */
export function buildAsNeededProtocolFromOneOff(dose) {
  const peptideId = generateId(10);
  const name = (dose.peptideName || 'As needed').trim();
  const unit = dose.unit || 'mg';
  const amount = dose.dose != null ? String(dose.dose) : '';
  return prepareItemForSave(
    {
      name: `${name} (as needed)`,
      protocolName: `${name} (as needed)`,
      purpose: 'As needed',
      active: true,
      startDate: dose.dateKey,
      endDate: null,
      duration: { count: '', unit: 'weeks', noEnd: true },
      blendMode: 'separate',
      protocolType: 'separate',
      washout: { enabled: false, duration: '', unit: 'weeks' },
      notes: '',
      linkedItems: {},
      peptides: [
        {
          id: peptideId,
          name,
          dosage: { amount, unit },
          dosageScheduleType: 'fixed',
          deliveryMethod: dose.deliveryMethod || 'pipette',
          frequency: { type: 'as_needed', time: [dose.timeSlot || 'AM'] },
        },
      ],
    },
    { isNew: true }
  );
}
