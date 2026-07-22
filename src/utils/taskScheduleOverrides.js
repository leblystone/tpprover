/**
 * Per-day schedule overrides for today's research (protocol peptides + supplements).
 * Three types of overrides:
 *   moves  – move a dose from one AM/PM slot to another on the same day
 *   skips  – mark a dose skipped or rescheduled away (visible; no adherence penalty)
 *            reason: 'skipped' | 'rescheduled' (+ optional toDateKey / toSlot)
 *   extras – add a catch-up dose on another day (reschedule target)
 *
 * Local keys: tpprover_task_schedule_overrides | tpprover_task_skips | tpprover_task_extras
 * Cloud blob: taskScheduleOverrides { moves, skips, extras, updatedAt }
 */

export const STORAGE_KEY = 'tpprover_task_schedule_overrides';
export const SKIP_KEY = 'tpprover_task_skips';
export const EXTRA_KEY = 'tpprover_task_extras';
export const LAST_UPDATE_KEY = 'tpprover_task_schedule_overrides_lastUpdate';

let cloudSyncTimeout = null;

export function getScheduleOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getSkipOverrides() {
  try {
    const raw = localStorage.getItem(SKIP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getExtraOverrides() {
  try {
    const raw = localStorage.getItem(EXTRA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Snapshot for cloud sync / AppContext */
export function getTaskScheduleOverridesForSave() {
  return {
    moves: getScheduleOverrides(),
    skips: getSkipOverrides(),
    extras: getExtraOverrides(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Apply a cloud (or merged) blob into localStorage.
 * @param {{ moves?: object, skips?: object, extras?: object, updatedAt?: string }} blob
 */
export function applyTaskScheduleOverridesFromCloud(blob) {
  if (!blob || typeof blob !== 'object') return;
  try {
    if (blob.moves && typeof blob.moves === 'object') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blob.moves));
    }
    if (blob.skips && typeof blob.skips === 'object') {
      localStorage.setItem(SKIP_KEY, JSON.stringify(blob.skips));
    }
    if (blob.extras && typeof blob.extras === 'object') {
      localStorage.setItem(EXTRA_KEY, JSON.stringify(blob.extras));
    }
    if (blob.updatedAt) {
      localStorage.setItem(LAST_UPDATE_KEY, String(Date.parse(blob.updatedAt) || Date.now()));
    }
  } catch (e) {
    console.warn('applyTaskScheduleOverridesFromCloud failed', e);
  }
  window.dispatchEvent(new CustomEvent('tpp:schedule-overrides-changed'));
}

/**
 * Merge two override blobs by newer entry-level updatedAt where present,
 * otherwise prefer local for same id, union of date keys.
 */
export function mergeTaskScheduleOverrides(localBlob, serverBlob) {
  const empty = { moves: {}, skips: {}, extras: {}, updatedAt: null };
  const local = localBlob && typeof localBlob === 'object' ? localBlob : empty;
  const server = serverBlob && typeof serverBlob === 'object' ? serverBlob : empty;

  const localTs = local.updatedAt ? Date.parse(local.updatedAt) || 0 : 0;
  const serverTs = server.updatedAt ? Date.parse(server.updatedAt) || 0 : 0;

  // Prefer whole-blob newer wins when one side is clearly newer and the other empty-ish
  const localCount =
    Object.keys(local.moves || {}).length +
    Object.keys(local.skips || {}).length +
    Object.keys(local.extras || {}).length;
  const serverCount =
    Object.keys(server.moves || {}).length +
    Object.keys(server.skips || {}).length +
    Object.keys(server.extras || {}).length;

  if (localCount === 0 && serverCount > 0) {
    return {
      moves: server.moves || {},
      skips: server.skips || {},
      extras: server.extras || {},
      updatedAt: server.updatedAt || new Date().toISOString(),
    };
  }
  if (serverCount === 0 && localCount > 0) {
    return {
      moves: local.moves || {},
      skips: local.skips || {},
      extras: local.extras || {},
      updatedAt: local.updatedAt || new Date().toISOString(),
    };
  }

  const mergeDateKeyedLists = (a, b) => {
    const out = {};
    const dates = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    dates.forEach((dateKey) => {
      const localList = Array.isArray(a?.[dateKey]) ? a[dateKey] : [];
      const serverList = Array.isArray(b?.[dateKey]) ? b[dateKey] : [];
      const byId = new Map();
      // Older first, then newer overwrites
      const ordered = localTs >= serverTs
        ? [...serverList, ...localList]
        : [...localList, ...serverList];
      ordered.forEach((entry) => {
        if (!entry || !entry.id) return;
        byId.set(entry.id, entry);
      });
      const merged = [...byId.values()];
      if (merged.length) out[dateKey] = merged;
    });
    return out;
  };

  return {
    moves: mergeDateKeyedLists(local.moves, server.moves),
    skips: mergeDateKeyedLists(local.skips, server.skips),
    extras: mergeDateKeyedLists(local.extras, server.extras),
    updatedAt: new Date(
      Math.max(localTs, serverTs, Date.now())
    ).toISOString(),
  };
}

function bumpLastUpdate() {
  try {
    localStorage.setItem(LAST_UPDATE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function syncOverridesToCloud() {
  if (cloudSyncTimeout) clearTimeout(cloudSyncTimeout);
  cloudSyncTimeout = setTimeout(async () => {
    try {
      const userData = localStorage.getItem('tpprover_user');
      if (!userData) return;
      const user = JSON.parse(userData);
      const userId = user?.uid || user?.id;
      if (!userId) return;
      const { saveAppData, loadAppData } = await import('../services/cloudStorage');
      const currentAppData = (await loadAppData(userId)) || {};
      await saveAppData(userId, {
        ...currentAppData,
        taskScheduleOverrides: getTaskScheduleOverridesForSave(),
      });
    } catch (error) {
      console.warn('⚠️ Failed to sync schedule overrides to cloud:', error);
    }
  }, 2000);
}

function notifyChanged() {
  bumpLastUpdate();
  window.dispatchEvent(new CustomEvent('tpp:schedule-overrides-changed'));
  syncOverridesToCloud();
}

function saveAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('taskScheduleOverrides save failed', e);
  }
  notifyChanged();
}

function saveSkips(data) {
  try {
    localStorage.setItem(SKIP_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('taskSkipOverrides save failed', e);
  }
  notifyChanged();
}

function saveExtras(data) {
  try {
    localStorage.setItem(EXTRA_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('taskExtraOverrides save failed', e);
  }
  notifyChanged();
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
      updatedAt: new Date().toISOString(),
    },
  ];
  saveAll(all);
}

/**
 * Apply stored moves / skips / extras to a bySlot map.
 * Skips leave the dose visible with `_skipped: true`.
 * Extras always append a Catch-up row (`_extraSlot: true`), even if the same peptide exists.
 */
export function applyScheduleOverridesToBySlot(dateKey, bySlot) {
  if (!dateKey || !bySlot || typeof bySlot !== 'object') return bySlot || {};

  const moveList = getScheduleOverrides()[dateKey];
  const skipList = getSkipOverrides()[dateKey];
  const extraList = getExtraOverrides()[dateKey];

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
        (p) => !p._extraSlot && p.protocolId === o.protocolId && String(p.peptideId) === String(o.peptideId)
      );
      if (idx === -1) continue;
      const [item] = peptides.splice(idx, 1);
      next[from].peptides = peptides;
      const dest = next[to].peptides || [];
      if (!dest.some((p) => !p._extraSlot && p.protocolId === item.protocolId && String(p.peptideId) === String(item.peptideId))) {
        next[to].peptides = [...dest, { ...item, _movedFromSlot: from }];
      }
    } else if (o.type === 'supplement') {
      const supps = [...(next[from].supplements || [])];
      const nameMatch = (s) => !s._extraSlot && (typeof s === 'object' ? s.name : s) === o.name;
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

  // Apply skips / reschedules — keep visible; mark _skipped or _rescheduled
  if (skipList && skipList.length > 0) {
    const allExtras = getExtraOverrides();
    const findLinkedCatchUpDate = (o) => {
      for (const [toKey, list] of Object.entries(allExtras || {})) {
        for (const e of list || []) {
          if (String(e.fromDateKey || '') !== String(dateKey)) continue;
          if (o.type === 'peptide' && e.type === 'peptide'
            && e.protocolId === o.protocolId
            && String(e.peptideId) === String(o.peptideId)) {
            return toKey;
          }
          if (o.type !== 'peptide' && (e.name === o.name)) return toKey;
        }
      }
      return null;
    };

    for (const o of skipList) {
      const slot = String(o.slot || '').toUpperCase();
      if (!next[slot]) continue;
      const linkedTo = o.reason === 'rescheduled'
        ? (o.toDateKey || findLinkedCatchUpDate(o))
        : findLinkedCatchUpDate(o);
      const reason = (o.reason === 'rescheduled' || linkedTo) ? 'rescheduled' : 'skipped';
      const mark = (item) => {
        if (!item || typeof item !== 'object') return item;
        if (reason === 'rescheduled') {
          return {
            ...item,
            _rescheduled: true,
            _toDateKey: o.toDateKey || linkedTo || null,
            _toSlot: o.toSlot || null,
          };
        }
        return { ...item, _skipped: true };
      };
      if (o.type === 'peptide') {
        next[slot].peptides = (next[slot].peptides || []).map((p) => {
          if (p._extraSlot) return p;
          if (p.protocolId === o.protocolId && String(p.peptideId) === String(o.peptideId)) {
            return mark(p);
          }
          return p;
        });
      } else {
        next[slot].supplements = (next[slot].supplements || []).map((s) => {
          if (s && typeof s === 'object' && s._extraSlot) return s;
          const name = typeof s === 'object' ? s.name : s;
          if (name === o.name) {
            return mark(typeof s === 'object' ? s : { name: s });
          }
          return s;
        });
      }
    }
  }

  // Apply extras — always append Catch-up rows (even if same compound already scheduled)
  if (extraList && extraList.length > 0) {
    for (const o of extraList) {
      const slot = String(o.slot || '').toUpperCase();
      ensure(slot);
      if (o.type === 'peptide') {
        const alreadyExtra = next[slot].peptides.some(
          (p) =>
            p._extraSlot &&
            p.protocolId === o.protocolId &&
            String(p.peptideId) === String(o.peptideId) &&
            String(p._fromDateKey || '') === String(o.fromDateKey || '')
        );
        if (!alreadyExtra) {
          next[slot].peptides = [
            ...next[slot].peptides,
            {
              name: o.name,
              dose: o.dose || '',
              unit: o.unit || '',
              deliveryMethod: o.deliveryMethod || '',
              penColor: o.penColor,
              penType: o.penType,
              protocolId: o.protocolId,
              peptideId: o.peptideId,
              _extraSlot: true,
              _fromDateKey: o.fromDateKey || null,
              _extraId: o.id,
            },
          ];
        }
      } else {
        const alreadyExtra = next[slot].supplements.some(
          (s) =>
            s &&
            typeof s === 'object' &&
            s._extraSlot &&
            s.name === o.name &&
            String(s._fromDateKey || '') === String(o.fromDateKey || '')
        );
        if (!alreadyExtra) {
          next[slot].supplements = [
            ...next[slot].supplements,
            {
              name: o.name,
              dose: o.dose || '',
              unit: o.unit || '',
              delivery: o.delivery || o.deliveryMethod || '',
              _extraSlot: true,
              _fromDateKey: o.fromDateKey || null,
              _extraId: o.id,
            },
          ];
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

function buildSkipId(spec) {
  const slot = String(spec.slot || '').toUpperCase();
  if (spec.type === 'peptide') {
    return `skip:peptide:${spec.protocolId}:${String(spec.peptideId)}:${slot}`;
  }
  return `skip:supplement:${String(spec.name || '').trim().toLowerCase()}:${slot}`;
}

export function setSkipOverride(dateKey, { type, protocolId, peptideId, name, slot, reason = 'skipped', toDateKey = null, toSlot = null }) {
  if (!dateKey) return;
  const id = buildSkipId({ type, protocolId, peptideId, name, slot });
  const all = getSkipOverrides();
  const list = [...(all[dateKey] || [])].filter((o) => o.id !== id);
  all[dateKey] = [
    ...list,
    {
      type,
      protocolId,
      peptideId,
      name: name || '',
      slot: String(slot || '').toUpperCase(),
      reason: reason === 'rescheduled' ? 'rescheduled' : 'skipped',
      toDateKey: toDateKey || null,
      toSlot: toSlot ? String(toSlot).toUpperCase() : null,
      id,
      updatedAt: new Date().toISOString(),
    },
  ];
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

function buildExtraId(spec) {
  const slot = String(spec.slot || '').toUpperCase();
  const from = String(spec.fromDateKey || '').trim();
  if (spec.type === 'peptide') {
    return `extra:peptide:${spec.protocolId}:${String(spec.peptideId)}:${slot}:${from}`;
  }
  return `extra:supplement:${String(spec.name || '').trim().toLowerCase()}:${slot}:${from}`;
}

export function setExtraOverride(dateKey, spec) {
  if (!dateKey) return;
  const id = buildExtraId(spec);
  const all = getExtraOverrides();
  const list = [...(all[dateKey] || [])].filter((o) => o.id !== id);
  all[dateKey] = [
    ...list,
    {
      ...spec,
      slot: String(spec.slot || '').toUpperCase(),
      id,
      updatedAt: new Date().toISOString(),
    },
  ];
  saveExtras(all);
}

export function clearExtraOverride(dateKey, spec) {
  if (!dateKey) return;
  const id = spec?.id || buildExtraId(spec);
  const all = getExtraOverrides();
  const list = (all[dateKey] || []).filter((o) => o.id !== id);
  if (list.length > 0) {
    all[dateKey] = list;
  } else {
    delete all[dateKey];
  }
  saveExtras(all);
}
