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
