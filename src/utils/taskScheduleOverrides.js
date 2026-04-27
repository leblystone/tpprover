/**
 * Per-day AM/PM moves for today's research (protocol peptides + supplements).
 * Stored locally and merged into calendar/dashboard scheduled data so adherence
 * follows the moved slot (one planned dose stays one planned dose).
 */

const STORAGE_KEY = 'tpprover_task_schedule_overrides';

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
  const list = getScheduleOverrides()[dateKey];
  if (!list || list.length === 0) return bySlot;

  const next = JSON.parse(JSON.stringify(bySlot));
  const ensure = (slot) => {
    const s = String(slot || '').toUpperCase();
    if (!next[s]) next[s] = { peptides: [], supplements: [] };
    if (!Array.isArray(next[s].peptides)) next[s].peptides = [];
    if (!Array.isArray(next[s].supplements)) next[s].supplements = [];
  };

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

  return next;
}
