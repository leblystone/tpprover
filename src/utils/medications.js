/**
 * Medications journal — common name-brand/generic meds (separate from peptides/supplements).
 * Synced via AppContext / cloudStorage as `medications`.
 *
 * Local key: tpprover_medications
 * Event: tpp:medications-updated
 */

import { prepareItemForSave } from './userDataSave';
import { recordDeletion, clearDeletionRecord } from './deletionTracking';
import { formatMedicationLabel } from '../data/commonMedications';

export const MEDICATIONS_KEY = 'tpprover_medications';
export const MEDICATIONS_EVENT = 'tpp:medications-updated';

export function getMedications() {
  try {
    const raw = localStorage.getItem(MEDICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMedications(list, options = {}) {
  const next = Array.isArray(list) ? list : [];
  try {
    localStorage.setItem(MEDICATIONS_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('Failed to save medications:', error);
  }
  try {
    window.dispatchEvent(
      new CustomEvent(MEDICATIONS_EVENT, {
        detail: { medications: next, source: options.source || 'local' },
      })
    );
  } catch {
    /* ignore */
  }
}

export function displayMedicationName(med) {
  if (!med) return 'Untitled';
  if (med.name) return med.name;
  return formatMedicationLabel(med) || 'Untitled';
}

/**
 * @param {Object} fields
 * @returns {Object} saved item
 */
export function addMedication(fields) {
  const brandName = (fields.brandName || '').trim();
  const genericName = (fields.genericName || '').trim();
  const name =
    (fields.name || '').trim() ||
    formatMedicationLabel({ brandName, genericName }) ||
    'Untitled';

  const sourceSupplementId =
    fields.sourceSupplementId || fields.movedFromSupplementId || null;
  const sourceMedicationId = fields.sourceMedicationId || null;
  // Restore prior medication id on accidental round-trip; otherwise mint new
  const restoreId = fields.id || null;

  if (restoreId) {
    clearDeletionRecord('medications', restoreId);
  }

  const entry = prepareItemForSave(
    {
      ...(restoreId ? { id: restoreId } : {}),
      name,
      brandName: brandName || undefined,
      genericName: genericName || undefined,
      catalogId: fields.catalogId || null,
      dose: fields.dose ?? '',
      unit: fields.unit || '',
      schedule: Array.isArray(fields.schedule) ? fields.schedule : ['AM'],
      days: Array.isArray(fields.days) ? fields.days : [],
      notes: fields.notes || '',
      startDate: fields.startDate || '',
      endDate: fields.endDate || '',
      protocolIds: Array.isArray(fields.protocolIds) ? fields.protocolIds : [],
      ...(sourceSupplementId ? { sourceSupplementId } : {}),
      ...(sourceMedicationId ? { sourceMedicationId } : {}),
    },
    { isNew: !restoreId }
  );

  const next = [entry, ...getMedications().filter((m) => m.id !== entry.id)];
  saveMedications(next);
  return entry;
}

/**
 * Move a supplement journal entry into medications.
 *
 * - First move: new medication id; parks supplement id as sourceSupplementId
 * - Round-trip (had sourceMedicationId): restores that medication id;
 *   current supplement id goes to the backburner as sourceSupplementId
 *
 * Caller should delete the supplement after a successful move.
 *
 * @param {Object} supplement - Current supplement (or form draft)
 * @returns {Object|null} new medication entry
 */
export function moveSupplementToMedication(supplement) {
  if (!supplement || typeof supplement !== 'object') return null;

  const name = String(supplement.name || '').trim();
  if (!name) return null;

  const currentSupplementId = supplement.id || null;
  // Accidental move back: revive prior medication id
  const restoreMedicationId = supplement.sourceMedicationId || null;

  return addMedication({
    ...(restoreMedicationId ? { id: restoreMedicationId } : {}),
    name,
    dose: supplement.dose ?? '',
    unit: supplement.unit || '',
    schedule: Array.isArray(supplement.schedule) ? supplement.schedule : ['AM'],
    days: Array.isArray(supplement.days) ? supplement.days : [],
    notes: supplement.notes || '',
    startDate: supplement.startDate || '',
    endDate: supplement.endDate || '',
    // Park the supplement id we just left
    sourceSupplementId: currentSupplementId || supplement.sourceSupplementId || null,
  });
}

/**
 * Build supplement fields from a medication.
 *
 * - First move: new supplement id; parks medication id as sourceMedicationId
 * - Round-trip (had sourceSupplementId): restores that supplement id;
 *   current medication id goes to the backburner as sourceMedicationId
 *
 * Caller should addSupplement + deleteMedication (and clearDeletion is handled here for restore).
 *
 * @param {Object} medication
 * @returns {Object|null} supplement fields (no persist)
 */
export function medicationToSupplementDraft(medication) {
  if (!medication || typeof medication !== 'object') return null;

  const name =
    String(medication.name || '').trim() ||
    formatMedicationLabel(medication) ||
    '';
  if (!name) return null;

  const doseParts = [medication.dose, medication.unit].filter((p) => String(p || '').trim());
  const dose =
    doseParts.length > 0
      ? doseParts.join(' ').trim()
      : String(medication.dose || '').trim();

  const currentMedicationId = medication.id || null;
  // Accidental move back: revive prior supplement id
  const restoreSupplementId = medication.sourceSupplementId || null;

  if (restoreSupplementId) {
    clearDeletionRecord('supplements', restoreSupplementId);
  }

  return prepareItemForSave(
    {
      ...(restoreSupplementId ? { id: restoreSupplementId } : {}),
      name,
      dose,
      schedule: Array.isArray(medication.schedule) ? medication.schedule : ['AM'],
      days: Array.isArray(medication.days) ? medication.days : [],
      delivery: medication.delivery || 'oral',
      startDate: medication.startDate || '',
      endDate: medication.endDate || '',
      notes: medication.notes || '',
      // Park the medication id we just left
      ...(currentMedicationId ? { sourceMedicationId: currentMedicationId } : {}),
    },
    { isNew: !restoreSupplementId }
  );
}

export function updateMedication(id, fields) {
  const list = getMedications();
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) return null;

  const prev = list[idx];
  const brandName = fields.brandName !== undefined ? String(fields.brandName || '').trim() : prev.brandName;
  const genericName = fields.genericName !== undefined ? String(fields.genericName || '').trim() : prev.genericName;
  const name =
    fields.name !== undefined
      ? String(fields.name || '').trim()
      : prev.name || formatMedicationLabel({ brandName, genericName });

  const updated = prepareItemForSave({
    ...prev,
    ...fields,
    id,
    name: name || prev.name,
    brandName: brandName || undefined,
    genericName: genericName || undefined,
  });

  const next = [...list];
  next[idx] = updated;
  saveMedications(next);
  return updated;
}

export function deleteMedication(id) {
  const list = getMedications();
  const item = list.find((m) => m.id === id);
  if (item) recordDeletion('medications', id, item);
  else recordDeletion('medications', id);
  const next = list.filter((m) => m.id !== id);
  saveMedications(next);
  return next;
}
