/**
 * Per-day schedule overrides for today's research (protocol peptides + supplements).
 * Three types of overrides:
 *   moves  – move a dose from one AM/PM slot to another on the same day
 *   skips  – remove a dose from a day entirely (no adherence penalty)
 *   extras – add a dose to a day it wasn't originally scheduled (used when
 *            rescheduling to tomorrow / to today from another day)
 */

const STORAGE_KEY = 'tpprover_task_schedule_overrides';
const SKIP_KEY = 'tpprover_task_skips';
const EXTRA_KEY = 'tpprover_task_extras';

export function getScheduleOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('taskScheduleOverrides save failed', e);
  }
  window.dispatchEvent(new CustomEvent('tpp:schedule-overrides-changed'));
}

export function buildScheduleOverrideId(spec) {
  const fs = String(spec.fromSlot || '').toUpperCase();
  if (spec.type === 'peptide') {
    return `peptide:${spec.protocolId}:${String(spec.peptideId)}:${fs}`;
  }
  return `supplement:${String(spec.name || '').trim().toLowerCase()}:${fs}`;
}

/**
 * Move a task from one slot to another for a single calendar day.
 * Pass toSlot === fromSlot (or omit move) to remove override for that task/day.
 */
export function setSlotMoveOverride(dateKey, { type, protocolId, peptideId, name, fromSlot, toSlot }) {
  if (!dateKey) return;
  const normalizedFrom = String(fromSlot || '').toUpperCase();
  const normalizedTo = toSlot != null ? String(toSlot || '').toUpperCase() : '';
  const all = getScheduleOverrides();
  const id = buildScheduleOverrideId({ type, protocolId, peptideId, name, fromSlot: normalizedFrom });
  const list = [...(all[dateKey] || [])].filter((o) => o.id !== id);

  if (!normalizedTo || normalizedTo === normalizedFrom) {
    all[dateKey] = list;
    if (!all[dateKey]?.length) delete all[dateKey];
    saveAll(all);
    return;
  }

  all[dateKey] = [
    ...list,
    {
      type,
      protocolId,
      peptideId,
      name: name || '',
      fromSlot: normalizedFrom,
      toSlot: normalizedTo,
      id,
    },
  ];
  saveAll(all);
}

/**
 * Apply stored moves to a bySlot map (mutates copies only; returns new structure).
 */
export function applyScheduleOverridesToBySlot(dateKey, bySlot) {
  if (!dateKey || !bySlot || typeof bySlot !== 'object') return bySlot || {};

  const moveList = getScheduleOverrides()[dateKey];
  const skipList = getSkipOverrides()[dateKey];
  const extraList = getExtraOverrides()[dateKey];

  // Nothing to do — return original reference for performance
  if ((!moveList || moveList.length === 0) && (!skipList || skipList.length === 0) && (!extraList || extraList.length === 0)) {
    return bySlot;
  }

  const next = JSON.parse(JSON.stringify(bySlot));
  const ensure = (slot) => {
    const s = String(slot || '').toUpperCase();
    if (!next[s]) next[s] = { peptides: [], supplements: [] };
    if (!Array.isArray(next[s].peptides)) next[s].peptides = [];
    if (!Array.isArray(next[s].supplements)) next[s].supplements = [];
  };

  const list = moveList || [];

  for (const o of list) {
    const from = String(o.fromSlot || '').toUpperCase();
    const to = String(o.toSlot || '').toUpperCase();
    if (!from || !to || from === to) continue;
    ensure(from);
    ensure(to);

    if (o.type === 'peptide') {
      const peptides = next[from].peptides || [];
      const idx = peptides.findIndex(
        (p) => p.protocolId === o.protocolId && String(p.peptideId) === String(o.peptideId)
      );
      if (idx === -1) continue;
      const [item] = peptides.splice(idx, 1);
      next[from].peptides = peptides;
      const dest = next[to].peptides || [];
      if (!dest.some((p) => p.protocolId === item.protocolId && String(p.peptideId) === String(item.peptideId))) {
        next[to].peptides = [...dest, { ...item, _movedFromSlot: from }];
      }
    } else if (o.type === 'supplement') {
      const supps = [...(next[from].supplements || [])];
      const nameMatch = (s) => (typeof s === 'object' ? s.name : s) === o.name;
      const idx = supps.findIndex(nameMatch);
      if (idx === -1) continue;
      const raw = supps[idx];
      supps.splice(idx, 1);
      next[from].supplements = supps;
      const item =
        typeof raw === 'object' ? { ...raw, _movedFromSlot: from } : { name: raw, _movedFromSlot: from };
      const toSupps = [...(next[to].supplements || [])];
      if (!toSupps.some(nameMatch)) {
        next[to].supplements = [...toSupps, item];
      }
    }
  }

  Object.keys(next).forEach((slot) => {
    const s = next[slot];
    if ((!s.peptides || s.peptides.length === 0) && (!s.supplements || s.supplements.length === 0)) {
      delete next[slot];
    }
  });

  // Apply skips
  if (skipList && skipList.length > 0) {
    for (const o of skipList) {
      const slot = String(o.slot || '').toUpperCase();
      if (!next[slot]) continue;
      if (o.type === 'peptide') {
        next[slot].peptides = (next[slot].peptides || []).filter(
          (p) => !(p.protocolId === o.protocolId && String(p.peptideId) === String(o.peptideId))
        );
      } else {
        next[slot].supplements = (next[slot].supplements || []).filter(
          (s) => (typeof s === 'object' ? s.name : s) !== o.name
        );
      }
    }
  }

  // Apply extras
  if (extraList && extraList.length > 0) {
    for (const o of extraList) {
      const slot = String(o.slot || '').toUpperCase();
      if (!next[slot]) next[slot] = { peptides: [], supplements: [] };
      if (!Array.isArray(next[slot].peptides)) next[slot].peptides = [];
      if (!Array.isArray(next[slot].supplements)) next[slot].supplements = [];
      if (o.type === 'peptide') {
        const already = next[slot].peptides.some(
          (p) => p.protocolId === o.protocolId && String(p.peptideId) === String(o.peptideId)
        );
        if (!already) {
          next[slot].peptides = [...next[slot].peptides, {
            name: o.name,
            dose: o.dose || '',
            unit: o.unit || '',
            deliveryMethod: o.deliveryMethod || '',
            penColor: o.penColor,
            penType: o.penType,
            protocolId: o.protocolId,
            peptideId: o.peptideId,
            _extraSlot: true,
          }];
        }
      } else {
        const already = next[slot].supplements.some(
          (s) => (typeof s === 'object' ? s.name : s) === o.name
        );
        if (!already) {
          next[slot].supplements = [...next[slot].supplements, {
            name: o.name,
            dose: o.dose || '',
            unit: o.unit || '',
            delivery: o.delivery || o.deliveryMethod || '',
            _extraSlot: true,
          }];
        }
      }
    }
  }

  Object.keys(next).forEach((slot) => {
    const s = next[slot];
    if ((!s.peptides || s.peptides.length === 0) && (!s.supplements || s.supplements.length === 0)) {
      delete next[slot];
    }
  });

  return next;
}

// ─── Skip overrides ──────────────────────────────────────────────────────────

function getSkipOverrides() {
  try {
    const raw = localStorage.getItem(SKIP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSkips(data) {
  try {
    localStorage.setItem(SKIP_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('taskSkipOverrides save failed', e);
  }
  window.dispatchEvent(new CustomEvent('tpp:schedule-overrides-changed'));
}

function buildSkipId(spec) {
  const slot = String(spec.slot || '').toUpperCase();
  if (spec.type === 'peptide') {
    return `skip:peptide:${spec.protocolId}:${String(spec.peptideId)}:${slot}`;
  }
  return `skip:supplement:${String(spec.name || '').trim().toLowerCase()}:${slot}`;
}

export function setSkipOverride(dateKey, { type, protocolId, peptideId, name, slot }) {
  if (!dateKey) return;
  const id = buildSkipId({ type, protocolId, peptideId, name, slot });
  const all = getSkipOverrides();
  const list = [...(all[dateKey] || [])].filter((o) => o.id !== id);
  all[dateKey] = [...list, { type, protocolId, peptideId, name: name || '', slot: String(slot || '').toUpperCase(), id }];
  saveSkips(all);
}

export function clearSkipOverride(dateKey, { type, protocolId, peptideId, name, slot }) {
  if (!dateKey) return;
  const id = buildSkipId({ type, protocolId, peptideId, name, slot });
  const all = getSkipOverrides();
  const list = (all[dateKey] || []).filter((o) => o.id !== id);
  if (list.length > 0) {
    all[dateKey] = list;
  } else {
    delete all[dateKey];
  }
  saveSkips(all);
}

// ─── Extra (cross-day) overrides ─────────────────────────────────────────────

function getExtraOverrides() {
  try {
    const raw = localStorage.getItem(EXTRA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveExtras(data) {
  try {
    localStorage.setItem(EXTRA_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('taskExtraOverrides save failed', e);
  }
  window.dispatchEvent(new CustomEvent('tpp:schedule-overrides-changed'));
}

function buildExtraId(spec) {
  const slot = String(spec.slot || '').toUpperCase();
  if (spec.type === 'peptide') {
    return `extra:peptide:${spec.protocolId}:${String(spec.peptideId)}:${slot}`;
  }
  return `extra:supplement:${String(spec.name || '').trim().toLowerCase()}:${slot}`;
}

export function setExtraOverride(dateKey, spec) {
  if (!dateKey) return;
  const id = buildExtraId(spec);
  const all = getExtraOverrides();
  const list = [...(all[dateKey] || [])].filter((o) => o.id !== id);
  all[dateKey] = [...list, { ...spec, slot: String(spec.slot || '').toUpperCase(), id }];
  saveExtras(all);
}

export function clearExtraOverride(dateKey, spec) {
  if (!dateKey) return;
  const id = buildExtraId(spec);
  const all = getExtraOverrides();
  const list = (all[dateKey] || []).filter((o) => o.id !== id);
  if (list.length > 0) {
    all[dateKey] = list;
  } else {
    delete all[dateKey];
  }
  saveExtras(all);
}
