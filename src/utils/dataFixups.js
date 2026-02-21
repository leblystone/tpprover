/**
 * Data Fixup Pipeline
 * 
 * Unlike migrations (run once for structural changes), fixups retroactively
 * repair EXISTING data that was saved while a bug was present. Each fixup is
 * versioned and idempotent — it runs once per device, fixes broken entries
 * in localStorage, bumps their updatedAt so the correction syncs to cloud,
 * and marks itself complete.
 *
 * Hook: called from AppContext after initial data load + cloud merge.
 */

import { prepareItemForSave } from './userDataSave';
import { ensurePublicOrderNumbers } from './orderNumbers';

// ---------------------------------------------------------------------------
// Version tracking (shares localStorage key with migrations)
// ---------------------------------------------------------------------------

function getFixupStatus() {
  try {
    const raw = localStorage.getItem('tpprover_migration_status');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markFixupComplete(fixupId) {
  try {
    const status = getFixupStatus();
    status[fixupId] = { completed: true, version: '1.0', timestamp: new Date().toISOString() };
    localStorage.setItem('tpprover_migration_status', JSON.stringify(status));
  } catch (e) {
    console.warn(`⚠️ Failed to mark fixup complete: ${fixupId}`, e);
  }
}

function isFixupDone(fixupId) {
  return !!getFixupStatus()[fixupId]?.completed;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeParseArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeSaveArray(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch (e) {
    console.warn(`⚠️ Failed to save ${key}:`, e);
  }
}

function safeParseObject(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function safeSaveObject(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch (e) {
    console.warn(`⚠️ Failed to save ${key}:`, e);
  }
}

function touchItem(item) {
  return { ...item, updatedAt: new Date().toISOString() };
}

function formatPhoneDisplay(value) {
  if (!value || typeof value !== 'string') return value;
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value;
}

// =========================================================================
//  PROTOCOL FIXUPS
// =========================================================================

// FIXUP: Ensure all protocols have id, updatedAt; peptides have ids
function fixupProtocolsEnsureFields() {
  const ID = 'fixup_protocols_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  const protocols = safeParseArray('tpprover_protocols');
  let patched = 0;

  const fixed = protocols.map(p => {
    if (!p || typeof p !== 'object') return p;
    let changed = false;
    const copy = { ...p };

    if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }
    if (!copy.updatedAt) { copy.updatedAt = copy.createdAt || new Date().toISOString(); changed = true; }

    if (Array.isArray(copy.peptides)) {
      copy.peptides = copy.peptides.map(pep => {
        if (pep && typeof pep === 'object' && !pep.id) {
          changed = true;
          return { ...pep, id: prepareItemForSave(pep).id };
        }
        return pep;
      });
    }

    if (changed) { patched++; return touchItem(copy); }
    return p;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_protocols', fixed);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} protocols`);
  }
  markFixupComplete(ID);
  return patched;
}

// FIXUP v2: Deeper protocol structure validation
function fixupProtocolsStructureV2() {
  const ID = 'fixup_protocols_structure_v2';
  if (isFixupDone(ID)) return 0;

  const protocols = safeParseArray('tpprover_protocols');
  let patched = 0;

  const fixed = protocols.map(p => {
    if (!p || typeof p !== 'object') return p;
    let changed = false;
    const copy = { ...p };

    // peptides must be an array
    if (!Array.isArray(copy.peptides)) { copy.peptides = []; changed = true; }

    // duration must be an object with defaults
    if (!copy.duration || typeof copy.duration !== 'object') {
      copy.duration = { count: '', unit: 'weeks', noEnd: true };
      changed = true;
    }

    // washout must be an object with defaults
    if (!copy.washout || typeof copy.washout !== 'object') {
      copy.washout = { enabled: false, duration: '', unit: 'weeks' };
      changed = true;
    }

    // active must be boolean
    if (copy.active !== undefined && typeof copy.active !== 'boolean') {
      copy.active = copy.active === 'true' || copy.active === true;
      changed = true;
    }

    // Remove non-schema 'status' field from QuickStart bug
    if (copy.status === 'active' && copy.active === true) {
      delete copy.status;
      changed = true;
    }

    // Ensure every peptide has frequency.time as array
    copy.peptides = copy.peptides.map(pep => {
      if (!pep || typeof pep !== 'object') return pep;
      if (pep.frequency && pep.frequency.time && !Array.isArray(pep.frequency.time)) {
        changed = true;
        return { ...pep, frequency: { ...pep.frequency, time: [String(pep.frequency.time)] } };
      }
      if (pep.frequency && !pep.frequency.time) {
        changed = true;
        return { ...pep, frequency: { ...pep.frequency, time: ['AM'] } };
      }
      return pep;
    });

    if (changed) { patched++; return touchItem(copy); }
    return p;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_protocols', fixed);
    console.log(`🩹 [FIXUP] ${ID}: deep-validated structure on ${patched} protocols`);
  }
  markFixupComplete(ID);
  return patched;
}

// FIXUP: Remove stale endDate when duration.noEnd is true
function fixupProtocolsEndDateConflict() {
  const ID = 'fixup_protocols_endDateNoEnd_v1';
  if (isFixupDone(ID)) return 0;

  const protocols = safeParseArray('tpprover_protocols');
  let patched = 0;

  const fixed = protocols.map(p => {
    if (!p || typeof p !== 'object') return p;
    if (p.duration?.noEnd === true && p.endDate) {
      patched++;
      const copy = { ...p };
      delete copy.endDate;
      return touchItem(copy);
    }
    return p;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_protocols', fixed);
    console.log(`🩹 [FIXUP] ${ID}: cleared stale endDate on ${patched} no-end protocols`);
  }
  markFixupComplete(ID);
  return patched;
}

// FIXUP: Ensure dosageScheduleType matches actual data (titration array vs fixed)
function fixupProtocolsDosageScheduleType() {
  const ID = 'fixup_protocols_dosageScheduleType_v1';
  if (isFixupDone(ID)) return 0;

  const protocols = safeParseArray('tpprover_protocols');
  let patched = 0;

  const fixed = protocols.map(p => {
    if (!p || typeof p !== 'object' || !Array.isArray(p.peptides)) return p;
    let protocolChanged = false;
    const copy = { ...p, peptides: p.peptides.map(pep => {
      if (!pep || typeof pep !== 'object') return pep;
      const hasTitration = Array.isArray(pep.titration) && pep.titration.length > 0;
      const expectedType = hasTitration ? 'titration' : 'fixed';

      if (pep.dosageScheduleType !== expectedType) {
        protocolChanged = true;
        return { ...pep, dosageScheduleType: expectedType };
      }
      return pep;
    })};

    if (protocolChanged) { patched++; return touchItem(copy); }
    return p;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_protocols', fixed);
    console.log(`🩹 [FIXUP] ${ID}: corrected dosageScheduleType on ${patched} protocols`);
  }
  markFixupComplete(ID);
  return patched;
}

// FIXUP: Restore lost titration data from protocolHistory snapshots
function fixupProtocolsRestoreTitration() {
  const ID = 'fixup_protocols_restoreTitration_v1';
  if (isFixupDone(ID)) return 0;

  const protocols = safeParseArray('tpprover_protocols');
  const history = safeParseArray('tpprover_protocol_history');

  if (protocols.length === 0 || history.length === 0) {
    markFixupComplete(ID);
    return 0;
  }

  const historyByProtocolId = {};
  history.forEach(h => {
    if (h?.protocolId) {
      if (!historyByProtocolId[h.protocolId]) historyByProtocolId[h.protocolId] = [];
      historyByProtocolId[h.protocolId].push(h);
    }
  });

  let patched = 0;

  const fixed = protocols.map(p => {
    if (!p?.id || !p.active || !Array.isArray(p.peptides)) return p;

    const entries = historyByProtocolId[p.id];
    if (!entries || entries.length === 0) return p;

    // Find the most recent history entry with protocolData
    const sorted = [...entries].sort((a, b) =>
      new Date(b.createdAt || b.startDate || 0) - new Date(a.createdAt || a.startDate || 0)
    );
    const latestSnapshot = sorted[0]?.protocolData;
    if (!latestSnapshot?.peptides) return p;

    let protocolChanged = false;
    const copy = { ...p, peptides: p.peptides.map(pep => {
      if (!pep?.id) return pep;

      // If peptide has no titration but the history snapshot does, restore it
      const snapshotPep = latestSnapshot.peptides.find(sp =>
        sp?.id === pep.id || sp?.name === pep.name
      );
      if (!snapshotPep) return pep;

      const needsTitration = (!pep.titration || pep.titration.length === 0)
        && Array.isArray(snapshotPep.titration) && snapshotPep.titration.length > 0;

      if (needsTitration) {
        protocolChanged = true;
        return {
          ...pep,
          titration: snapshotPep.titration,
          dosageScheduleType: 'titration',
          ...(snapshotPep.dosage && !pep.dosage ? { dosage: snapshotPep.dosage } : {})
        };
      }
      return pep;
    })};

    if (protocolChanged) { patched++; return touchItem(copy); }
    return p;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_protocols', fixed);
    console.log(`🩹 [FIXUP] ${ID}: restored titration data on ${patched} protocols from history snapshots`);
  }
  markFixupComplete(ID);
  return patched;
}

// FIXUP: Recalculate linked vial cost from stockpile source
function fixupProtocolsVialCost() {
  const ID = 'fixup_protocols_vialCost_v1';
  if (isFixupDone(ID)) return 0;

  const protocols = safeParseArray('tpprover_protocols');
  const stockpile = safeParseArray('tpprover_stockpile');

  if (protocols.length === 0 || stockpile.length === 0) {
    markFixupComplete(ID);
    return 0;
  }

  const stockById = {};
  stockpile.forEach(s => { if (s?.id) stockById[s.id] = s; });

  let patched = 0;

  const fixed = protocols.map(p => {
    if (!p?.linkedItems || typeof p.linkedItems !== 'object') return p;

    let changed = false;
    const linkedCopy = { ...p.linkedItems };

    for (const [pepId, item] of Object.entries(linkedCopy)) {
      if (!item?.stockpileId) continue;
      const stockItem = stockById[item.stockpileId];
      if (!stockItem) continue;

      const priceUnit = (stockItem.priceUnit || 'vial').toLowerCase();
      const rawCost = Number(stockItem.cost) || 0;
      const qty = Number(stockItem.quantity) || 1;
      const expectedCost = priceUnit === 'vial' ? rawCost : (qty > 0 ? rawCost / qty : rawCost);

      if (Number(item.cost) !== expectedCost) {
        linkedCopy[pepId] = { ...item, cost: expectedCost };
        changed = true;
      }
    }

    if (changed) {
      patched++;
      return touchItem({ ...p, linkedItems: linkedCopy });
    }
    return p;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_protocols', fixed);
    console.log(`🩹 [FIXUP] ${ID}: recalculated vial cost on ${patched} protocols`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  VENDOR FIXUPS
// =========================================================================

// FIXUP: Ensure vendors have id, updatedAt, contacts array; format phones
function fixupVendorsEnsureFields() {
  const ID = 'fixup_vendors_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  const vendors = safeParseArray('tpprover_vendors');
  let patched = 0;

  const fixed = vendors.map(v => {
    if (!v || typeof v !== 'object') return v;
    let changed = false;
    const copy = { ...v };

    if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }
    if (!copy.updatedAt) { copy.updatedAt = copy.createdAt || new Date().toISOString(); changed = true; }
    if (!Array.isArray(copy.contacts)) { copy.contacts = []; changed = true; }
    if (typeof copy.rating !== 'number') {
      copy.rating = Number(copy.rating) || 0;
      changed = true;
    }
    if (!Array.isArray(copy.labels)) { copy.labels = []; changed = true; }

    // Format phone contacts
    copy.contacts = copy.contacts.map(c => {
      if (c?.type === 'phone' && c.value) {
        const formatted = formatPhoneDisplay(c.value);
        if (formatted !== c.value) {
          changed = true;
          return { ...c, value: formatted };
        }
      }
      return c;
    });

    if (changed) { patched++; return touchItem(copy); }
    return v;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_vendors', fixed);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} vendors (fields + phone formatting)`);
  }
  markFixupComplete(ID);
  return patched;
}

// FIXUP v2: Validate vendor contacts have type+value, filter out empties
function fixupVendorsContactsV2() {
  const ID = 'fixup_vendors_contacts_v2';
  if (isFixupDone(ID)) return 0;

  const vendors = safeParseArray('tpprover_vendors');
  let patched = 0;

  const fixed = vendors.map(v => {
    if (!v || typeof v !== 'object' || !Array.isArray(v.contacts)) return v;
    const cleaned = v.contacts.filter(c =>
      c && typeof c === 'object' && c.type && c.value && String(c.value).trim() !== ''
    );
    if (cleaned.length !== v.contacts.length) {
      patched++;
      return touchItem({ ...v, contacts: cleaned });
    }
    return v;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_vendors', fixed);
    console.log(`🩹 [FIXUP] ${ID}: cleaned invalid contacts on ${patched} vendors`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  STOCKPILE FIXUPS
// =========================================================================

// FIXUP: Ensure stockpile items have id, updatedAt, default mgUnit/unit
function fixupStockpileEnsureFields() {
  const ID = 'fixup_stockpile_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  const items = safeParseArray('tpprover_stockpile');
  let patched = 0;

  const fixed = items.map(item => {
    if (!item || typeof item !== 'object') return item;
    let changed = false;
    const copy = { ...item };

    if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }
    if (!copy.updatedAt) { copy.updatedAt = copy.createdAt || new Date().toISOString(); changed = true; }
    if (!copy.unit) { copy.unit = 'vial'; changed = true; }
    if (!copy.mgUnit) { copy.mgUnit = 'mg'; changed = true; }
    if (copy.quantity === undefined || copy.quantity === null) { copy.quantity = 1; changed = true; }

    if (changed) { patched++; return touchItem(copy); }
    return item;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_stockpile', fixed);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} stockpile items`);
  }
  markFixupComplete(ID);
  return patched;
}

// FIXUP v2: Add priceUnit default, backfill vendorId from vendor name
function fixupStockpileV2() {
  const ID = 'fixup_stockpile_v2';
  if (isFixupDone(ID)) return 0;

  const items = safeParseArray('tpprover_stockpile');
  const vendors = safeParseArray('tpprover_vendors');

  const vendorByName = {};
  vendors.forEach(v => {
    if (v?.name && v?.id) vendorByName[v.name.toLowerCase().trim()] = v.id;
  });

  let patched = 0;

  const fixed = items.map(item => {
    if (!item || typeof item !== 'object') return item;
    let changed = false;
    const copy = { ...item };

    if (!copy.priceUnit) { copy.priceUnit = 'vial'; changed = true; }

    if (!copy.vendorId && copy.vendor && typeof copy.vendor === 'string') {
      const match = vendorByName[copy.vendor.toLowerCase().trim()];
      if (match) { copy.vendorId = match; changed = true; }
    }

    if (changed) { patched++; return touchItem(copy); }
    return item;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_stockpile', fixed);
    console.log(`🩹 [FIXUP] ${ID}: strengthened ${patched} stockpile items (priceUnit/vendorId)`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  ORDER FIXUPS
// =========================================================================

// FIXUP: Ensure orders have id, updatedAt, status, items array, publicOrderNumber
function fixupOrdersEnsureFields() {
  const ID = 'fixup_orders_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  let orders = safeParseArray('tpprover_orders');
  let patched = 0;

  orders = orders.map(order => {
    if (!order || typeof order !== 'object') return order;
    let changed = false;
    const copy = { ...order };

    if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }
    if (!copy.updatedAt) { copy.updatedAt = copy.createdAt || copy.date || new Date().toISOString(); changed = true; }
    if (!copy.status) { copy.status = 'Order Placed'; changed = true; }
    if (!Array.isArray(copy.items)) { copy.items = []; changed = true; }

    if (changed) { patched++; return touchItem(copy); }
    return order;
  });

  // Ensure publicOrderNumbers are assigned
  const withNumbers = ensurePublicOrderNumbers(orders);
  const numberPatched = withNumbers.filter((o, i) => o !== orders[i]).length;
  patched += numberPatched;

  if (patched > 0) {
    safeSaveArray('tpprover_orders', withNumbers);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} orders`);
  }
  markFixupComplete(ID);
  return patched;
}

// FIXUP v2: Coerce shippingCost, validate items[] entries
function fixupOrdersV2() {
  const ID = 'fixup_orders_v2';
  if (isFixupDone(ID)) return 0;

  const orders = safeParseArray('tpprover_orders');
  let patched = 0;

  const fixed = orders.map(order => {
    if (!order || typeof order !== 'object') return order;
    let changed = false;
    const copy = { ...order };

    if (copy.shippingCost !== undefined && typeof copy.shippingCost !== 'number') {
      copy.shippingCost = Number(copy.shippingCost) || 0;
      changed = true;
    }

    if (Array.isArray(copy.items)) {
      copy.items = copy.items.map(it => {
        if (!it || typeof it !== 'object') return it;
        let itemChanged = false;
        const ic = { ...it };
        if (!ic.id) { ic.id = prepareItemForSave(ic).id; itemChanged = true; }
        if (!ic.unit) { ic.unit = 'vial'; itemChanged = true; }
        if (!ic.mgUnit) { ic.mgUnit = 'mg'; itemChanged = true; }
        if (itemChanged) { changed = true; return ic; }
        return it;
      });
    }

    if (changed) { patched++; return touchItem(copy); }
    return order;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_orders', fixed);
    console.log(`🩹 [FIXUP] ${ID}: strengthened ${patched} orders (shippingCost/items)`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  RECON FIXUPS
// =========================================================================

// FIXUP: Ensure recon items have id, updatedAt, date
function fixupReconItemsEnsureFields() {
  const ID = 'fixup_reconItems_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  const items = safeParseArray('tpprover_recon_items');
  let patched = 0;

  const fixed = items.map(item => {
    if (!item || typeof item !== 'object') return item;
    let changed = false;
    const copy = { ...item };

    if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }
    if (!copy.updatedAt) { copy.updatedAt = copy.date || copy.createdAt || new Date().toISOString(); changed = true; }
    if (!copy.date) { copy.date = copy.createdAt || copy.updatedAt || new Date().toISOString(); changed = true; }

    if (changed) { patched++; return touchItem(copy); }
    return item;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_recon_items', fixed);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} recon items`);
  }
  markFixupComplete(ID);
  return patched;
}

// FIXUP: Ensure recon history items have id, updatedAt, usedDate
function fixupReconHistoryEnsureFields() {
  const ID = 'fixup_reconHistory_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  const items = safeParseArray('tpprover_recon_history');
  let patched = 0;

  const fixed = items.map(item => {
    if (!item || typeof item !== 'object') return item;
    let changed = false;
    const copy = { ...item };

    if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }
    if (!copy.updatedAt) { copy.updatedAt = copy.usedDate || copy.date || new Date().toISOString(); changed = true; }
    if (!copy.usedDate) { copy.usedDate = copy.date || copy.updatedAt || new Date().toISOString(); changed = true; }

    if (changed) { patched++; return touchItem(copy); }
    return item;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_recon_history', fixed);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} recon history items`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  SCHEDULED BUYS FIXUPS
// =========================================================================

// FIXUP: Ensure scheduled buys have id, updatedAt; normalize name field
function fixupScheduledBuysEnsureFields() {
  const ID = 'fixup_scheduledBuys_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  const items = safeParseArray('tpprover_scheduled_buys');
  let patched = 0;

  const fixed = items.map(item => {
    if (!item || typeof item !== 'object') return item;
    let changed = false;
    const copy = { ...item };

    if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }
    if (!copy.updatedAt) { copy.updatedAt = copy.createdAt || new Date().toISOString(); changed = true; }
    if (!copy.createdAt) { copy.createdAt = copy.updatedAt; changed = true; }

    // Normalize name: item → name, peptideName → name
    if (!copy.name && copy.item) { copy.name = copy.item; delete copy.item; changed = true; }
    if (!copy.name && copy.peptideName) { copy.name = copy.peptideName; changed = true; }

    if (changed) { patched++; return touchItem(copy); }
    return item;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_scheduled_buys', fixed);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} scheduled buys`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  WISHLIST FIXUPS
// =========================================================================

// FIXUP: Ensure wishlist items have id, updatedAt; normalize name; add mgUnit
function fixupWishlistEnsureFields() {
  const ID = 'fixup_wishlist_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  const items = safeParseArray('tpprover_wishlist');
  let patched = 0;

  const fixed = items.map(item => {
    if (!item || typeof item !== 'object') return item;
    let changed = false;
    const copy = { ...item };

    if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }
    if (!copy.updatedAt) { copy.updatedAt = copy.createdAt || new Date().toISOString(); changed = true; }

    // Normalize field names
    if (!copy.name && copy.item) { copy.name = copy.item; delete copy.item; changed = true; }
    if (!copy.notes && copy.description) { copy.notes = copy.description; delete copy.description; changed = true; }
    if (copy.mgAmount && !copy.mgUnit) { copy.mgUnit = 'mg'; changed = true; }

    if (changed) { patched++; return touchItem(copy); }
    return item;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_wishlist', fixed);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} wishlist items`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  USER NOTES FIXUPS
// =========================================================================

// FIXUP: Ensure all userNotes have required fields
function fixupUserNotesEnsureFields() {
  const ID = 'fixup_userNotes_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  const notes = safeParseArray('tpprover_user_notes');
  let patched = 0;

  const fixed = notes.map(note => {
    if (!note || typeof note !== 'object') return note;
    let changed = false;
    const copy = { ...note };

    if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }
    if (!copy.createdAt) { copy.createdAt = copy.updatedAt || new Date().toISOString(); changed = true; }
    if (!copy.updatedAt) { copy.updatedAt = copy.createdAt || new Date().toISOString(); changed = true; }
    if (copy.protocolId === '') { delete copy.protocolId; changed = true; }
    if (copy.protocolName === '') { delete copy.protocolName; changed = true; }

    if (changed) { patched++; return touchItem(copy); }
    return note;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_user_notes', fixed);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} notes with missing fields`);
  }
  markFixupComplete(ID);
  return patched;
}

// FIXUP: Re-link orphaned research notes to protocols by name matching
function fixupRepairProtocolNoteLinks() {
  const ID = 'fixup_repairProtocolNoteLinks_v1';
  if (isFixupDone(ID)) return 0;

  const notes = safeParseArray('tpprover_user_notes');
  const protocols = safeParseArray('tpprover_protocols');

  if (notes.length === 0 || protocols.length === 0) {
    markFixupComplete(ID);
    return 0;
  }

  const protocolByName = {};
  protocols.forEach(p => {
    if (p?.protocolName && p?.id) {
      protocolByName[p.protocolName.toLowerCase().trim()] = p;
    }
  });
  const protocolById = {};
  protocols.forEach(p => { if (p?.id) protocolById[p.id] = p; });

  let patched = 0;

  const fixed = notes.map(note => {
    if (!note || typeof note !== 'object') return note;

    // Has protocolName but no protocolId — try to link
    if (note.protocolName && !note.protocolId) {
      const match = protocolByName[note.protocolName.toLowerCase().trim()];
      if (match) { patched++; return touchItem({ ...note, protocolId: match.id, protocolName: match.protocolName }); }
    }

    // Has protocolId that doesn't match any protocol — try name match
    if (note.protocolId && !protocolById[note.protocolId] && note.protocolName) {
      const match = protocolByName[note.protocolName.toLowerCase().trim()];
      if (match) { patched++; return touchItem({ ...note, protocolId: match.id, protocolName: match.protocolName }); }
    }

    // Has protocolId but protocolName is missing — backfill name
    if (note.protocolId && protocolById[note.protocolId] && !note.protocolName) {
      patched++;
      return touchItem({ ...note, protocolName: protocolById[note.protocolId].protocolName });
    }

    return note;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_user_notes', fixed);
    console.log(`🩹 [FIXUP] ${ID}: re-linked ${patched} research notes to protocols`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  PROTOCOL HISTORY FIXUPS
// =========================================================================

// FIXUP: Ensure protocolHistory entries have notes arrays and required fields
function fixupProtocolHistoryEntries() {
  const ID = 'fixup_protocolHistory_ensureNotesArray_v1';
  if (isFixupDone(ID)) return 0;

  const history = safeParseArray('tpprover_protocol_history');
  let patched = 0;

  const fixed = history.map(entry => {
    if (!entry || typeof entry !== 'object') return entry;
    let changed = false;
    const copy = { ...entry };

    if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }
    if (!copy.updatedAt) { copy.updatedAt = copy.createdAt || new Date().toISOString(); changed = true; }
    if (!Array.isArray(copy.notes)) { copy.notes = []; changed = true; }

    copy.notes = copy.notes.map(n => {
      if (!n || typeof n !== 'object') return n;
      if (!n.id) {
        changed = true;
        return { ...n, id: prepareItemForSave(n).id, createdAt: n.createdAt || new Date().toISOString() };
      }
      return n;
    });

    if (changed) { patched++; return touchItem(copy); }
    return entry;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_protocol_history', fixed);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} protocol history entries`);
  }
  markFixupComplete(ID);
  return patched;
}

// FIXUP: Backfill protocolName on protocolHistory from matching protocol
function fixupProtocolHistoryBackfillNames() {
  const ID = 'fixup_protocolHistory_backfillNames_v1';
  if (isFixupDone(ID)) return 0;

  const history = safeParseArray('tpprover_protocol_history');
  const protocols = safeParseArray('tpprover_protocols');

  if (history.length === 0) { markFixupComplete(ID); return 0; }

  const protocolById = {};
  protocols.forEach(p => { if (p?.id) protocolById[p.id] = p; });

  let patched = 0;

  const fixed = history.map(entry => {
    if (!entry || typeof entry !== 'object') return entry;
    if (entry.protocolId && !entry.protocolName && protocolById[entry.protocolId]) {
      patched++;
      return touchItem({ ...entry, protocolName: protocolById[entry.protocolId].protocolName });
    }
    return entry;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_protocol_history', fixed);
    console.log(`🩹 [FIXUP] ${ID}: backfilled names on ${patched} protocol history entries`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  USER GOALS FIXUPS
// =========================================================================

// FIXUP: Ensure user goals have id, updatedAt
function fixupUserGoalsEnsureFields() {
  const ID = 'fixup_userGoals_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  const goals = safeParseArray('tpprover_user_goals');
  let patched = 0;

  const fixed = goals.map(goal => {
    if (!goal || typeof goal !== 'object') return goal;
    let changed = false;
    const copy = { ...goal };

    if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }
    if (!copy.updatedAt) { copy.updatedAt = copy.createdAt || new Date().toISOString(); changed = true; }
    if (!copy.createdAt) { copy.createdAt = copy.updatedAt; changed = true; }

    if (changed) { patched++; return touchItem(copy); }
    return goal;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_user_goals', fixed);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} user goals`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  SUPPLEMENTS FIXUPS
// =========================================================================

// FIXUP: Ensure supplements have id (string), updatedAt, schedule array, delivery default
function fixupSupplementsEnsureFields() {
  const ID = 'fixup_supplements_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  const items = safeParseArray('tpprover_supplements');
  let patched = 0;

  const fixed = items.map(item => {
    if (!item || typeof item !== 'object') return item;
    let changed = false;
    const copy = { ...item };

    // Numeric id from Date.now() -> string UUID
    if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }
    else if (typeof copy.id === 'number') { copy.id = String(copy.id); changed = true; }

    if (!copy.updatedAt) { copy.updatedAt = copy.createdAt || new Date().toISOString(); changed = true; }

    // schedule should be an array, not a string
    if (copy.schedule && !Array.isArray(copy.schedule)) {
      copy.schedule = [String(copy.schedule)];
      changed = true;
    }
    if (!copy.schedule) { copy.schedule = ['AM']; changed = true; }

    if (!copy.delivery) { copy.delivery = 'oral'; changed = true; }

    // days should be an array
    if (copy.days && !Array.isArray(copy.days)) { copy.days = []; changed = true; }
    if (!copy.days) { copy.days = []; changed = true; }

    if (changed) { patched++; return touchItem(copy); }
    return item;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_supplements', fixed);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} supplements`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  METRICS FIXUPS
// =========================================================================

// FIXUP: Ensure metrics have id, updatedAt
function fixupMetricsEnsureFields() {
  const ID = 'fixup_metrics_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  const items = safeParseArray('tpprover_metrics');
  let patched = 0;

  const fixed = items.map(item => {
    if (!item || typeof item !== 'object') return item;
    let changed = false;
    const copy = { ...item };

    if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }
    if (!copy.updatedAt) { copy.updatedAt = copy.createdAt || copy.date || new Date().toISOString(); changed = true; }

    if (changed) { patched++; return touchItem(copy); }
    return item;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_metrics', fixed);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} metrics`);
  }
  markFixupComplete(ID);
  return patched;
}

// ---------------------------------------------------------------------------
// FIXUP: Flag ghost protocols with no startDate (can't schedule without one)
// Sets startDate to createdAt or updatedAt so they at least appear correctly
// ---------------------------------------------------------------------------

function fixupProtocolsGhostStartDate() {
  const ID = 'fixup_protocols_ghostStartDate_v1';
  if (isFixupDone(ID)) return 0;

  const protocols = safeParseArray('tpprover_protocols');
  const history = safeParseArray('tpprover_protocol_history');

  const historyByProtocolId = {};
  history.forEach(h => {
    if (h?.protocolId && h?.startDate) {
      if (!historyByProtocolId[h.protocolId] ||
          new Date(h.startDate) > new Date(historyByProtocolId[h.protocolId].startDate)) {
        historyByProtocolId[h.protocolId] = h;
      }
    }
  });

  let patched = 0;

  const fixed = protocols.map(p => {
    if (!p || typeof p !== 'object') return p;
    if (p.active && !p.startDate) {
      const historyEntry = p.id ? historyByProtocolId[p.id] : null;
      const restoredDate = historyEntry?.startDate || p.createdAt || p.updatedAt || new Date().toISOString();
      patched++;
      return touchItem({ ...p, startDate: restoredDate });
    }
    return p;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_protocols', fixed);
    console.log(`🩹 [FIXUP] ${ID}: restored startDate on ${patched} ghost protocols`);
  }
  markFixupComplete(ID);
  return patched;
}

// ---------------------------------------------------------------------------
// FIXUP: Restore protocol startDate from history when it was reset to today
// If the protocol's startDate doesn't match what's in the history snapshot,
// and the history has an older (more correct) date, restore it.
// ---------------------------------------------------------------------------

function fixupProtocolsRestoreStartDate() {
  const ID = 'fixup_protocols_restoreStartDate_v1';
  if (isFixupDone(ID)) return 0;

  const protocols = safeParseArray('tpprover_protocols');
  const history = safeParseArray('tpprover_protocol_history');

  if (protocols.length === 0 || history.length === 0) {
    markFixupComplete(ID);
    return 0;
  }

  const historyByProtocolId = {};
  history.forEach(h => {
    if (h?.protocolId && h?.startDate) {
      if (!historyByProtocolId[h.protocolId] ||
          new Date(h.createdAt || h.startDate) > new Date(historyByProtocolId[h.protocolId].createdAt || historyByProtocolId[h.protocolId].startDate)) {
        historyByProtocolId[h.protocolId] = h;
      }
    }
  });

  let patched = 0;

  const fixed = protocols.map(p => {
    if (!p?.id || !p.active || !p.startDate) return p;

    const entry = historyByProtocolId[p.id];
    if (!entry?.startDate) return p;

    const protocolStart = new Date(p.startDate);
    const historyStart = new Date(entry.startDate);

    // If the protocol's startDate is AFTER the history's startDate,
    // it was likely reset to "today" by the bug — restore the older date
    if (protocolStart > historyStart) {
      patched++;
      return touchItem({ ...p, startDate: entry.startDate });
    }
    return p;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_protocols', fixed);
    console.log(`🩹 [FIXUP] ${ID}: restored original startDate on ${patched} protocols from history`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  CALENDAR NOTES FIXUPS
// =========================================================================

// FIXUP: Ensure every note inside calendarNotes has id, createdAt, updatedAt
function fixupCalendarNotesEnsureFields() {
  const ID = 'fixup_calendarNotes_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  const data = safeParseObject('tpprover_calendar_notes');
  if (!data) { markFixupComplete(ID); return 0; }

  let patched = 0;

  for (const dateKey of Object.keys(data)) {
    const entry = data[dateKey];
    if (!entry || !Array.isArray(entry.notes)) continue;

    let dayChanged = false;
    entry.notes = entry.notes.map(note => {
      if (!note || typeof note !== 'object') return note;
      let changed = false;
      const copy = { ...note };

      if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }
      if (!copy.createdAt) { copy.createdAt = copy.updatedAt || new Date().toISOString(); changed = true; }
      if (!copy.updatedAt) { copy.updatedAt = copy.createdAt || new Date().toISOString(); changed = true; }
      if (copy.text === undefined) { copy.text = ''; changed = true; }

      if (changed) { dayChanged = true; return copy; }
      return note;
    });

    if (dayChanged) patched++;
  }

  if (patched > 0) {
    safeSaveObject('tpprover_calendar_notes', data);
    console.log(`🩹 [FIXUP] ${ID}: patched notes in ${patched} calendar days`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  WATER TRACKER FIXUPS
// =========================================================================

// FIXUP: Ensure waterTracker entries have numeric glasses/goal, unit, lastUpdated
function fixupWaterTrackerEnsureFields() {
  const ID = 'fixup_waterTracker_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  const data = safeParseObject('tpprover_water_tracker');
  if (!data) { markFixupComplete(ID); return 0; }

  let patched = 0;

  for (const dateKey of Object.keys(data)) {
    const entry = data[dateKey];
    if (!entry || typeof entry !== 'object') continue;
    let changed = false;

    if (typeof entry.glasses !== 'number') {
      entry.glasses = Number(entry.glasses) || 0;
      changed = true;
    }
    if (typeof entry.goal !== 'number' || entry.goal < 1) {
      entry.goal = Number(entry.goal) || 8;
      changed = true;
    }
    if (!entry.unit) {
      entry.unit = 'glasses';
      changed = true;
    }
    if (!entry.lastUpdated) {
      entry.lastUpdated = new Date().toISOString();
      changed = true;
    }

    if (changed) patched++;
  }

  if (patched > 0) {
    safeSaveObject('tpprover_water_tracker', data);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} water tracker day entries`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  INJECTION HISTORY FIXUPS
// =========================================================================

// FIXUP: Ensure injection history records have id, updatedAt, ISO timestamp
function fixupInjectionHistoryEnsureFields() {
  const ID = 'fixup_injectionHistory_ensureFields_v1';
  if (isFixupDone(ID)) return 0;

  const items = safeParseArray('tpprover_injection_history');
  if (items.length === 0) { markFixupComplete(ID); return 0; }

  let patched = 0;

  const fixed = items.map(item => {
    if (!item || typeof item !== 'object') return item;
    let changed = false;
    const copy = { ...item };

    if (!copy.id) { copy.id = prepareItemForSave(copy).id; changed = true; }

    // Normalize numeric timestamp to ISO string
    if (typeof copy.timestamp === 'number') {
      copy.timestamp = new Date(copy.timestamp).toISOString();
      changed = true;
    }

    if (!copy.updatedAt) {
      copy.updatedAt = copy.timestamp || copy.date || new Date().toISOString();
      changed = true;
    }

    if (changed) { patched++; return touchItem(copy); }
    return item;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_injection_history', fixed);
    console.log(`🩹 [FIXUP] ${ID}: patched ${patched} injection history records`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  INJECTION STATS FIXUPS
// =========================================================================

// FIXUP: Validate injectionStats structure and ensure numeric fields
function fixupInjectionStatsValidate() {
  const ID = 'fixup_injectionStats_validate_v1';
  if (isFixupDone(ID)) return 0;

  const data = safeParseObject('tpprover_injection_stats');
  if (!data) { markFixupComplete(ID); return 0; }

  let changed = false;

  if (!data.global || typeof data.global !== 'object') {
    data.global = { totalInjections: 0, sites: {}, lastInjection: null };
    changed = true;
  } else {
    if (typeof data.global.totalInjections !== 'number') {
      data.global.totalInjections = Number(data.global.totalInjections) || 0;
      changed = true;
    }
    if (!data.global.sites || typeof data.global.sites !== 'object') {
      data.global.sites = {};
      changed = true;
    }
    // Ensure all site counts are numbers
    for (const site of Object.keys(data.global.sites)) {
      if (typeof data.global.sites[site] !== 'number') {
        data.global.sites[site] = Number(data.global.sites[site]) || 0;
        changed = true;
      }
    }
  }

  if (!data.tasks || typeof data.tasks !== 'object') {
    data.tasks = {};
    changed = true;
  }

  if (changed) {
    safeSaveObject('tpprover_injection_stats', data);
    console.log(`🩹 [FIXUP] ${ID}: validated injectionStats structure`);
  }
  markFixupComplete(ID);
  return changed ? 1 : 0;
}

// =========================================================================
//  USER GOALS FIELD NORMALIZATION
// =========================================================================

// FIXUP: Normalize goal field names (text->title, dueDate->targetDate)
function fixupUserGoalsNormalizeFields() {
  const ID = 'fixup_userGoals_normalizeFields_v1';
  if (isFixupDone(ID)) return 0;

  const goals = safeParseArray('tpprover_user_goals');
  let patched = 0;

  const fixed = goals.map(goal => {
    if (!goal || typeof goal !== 'object') return goal;
    let changed = false;
    const copy = { ...goal };

    // GoalModal uses text/dueDate, GoalsOnlyWidget uses title/targetDate
    // Normalize to have BOTH so both editors work
    if (copy.text && !copy.title) { copy.title = copy.text; changed = true; }
    if (copy.title && !copy.text) { copy.text = copy.title; changed = true; }
    if (copy.dueDate && !copy.targetDate) { copy.targetDate = copy.dueDate; changed = true; }
    if (copy.targetDate && !copy.dueDate) { copy.dueDate = copy.targetDate; changed = true; }

    if (changed) { patched++; return touchItem(copy); }
    return goal;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_user_goals', fixed);
    console.log(`🩹 [FIXUP] ${ID}: normalized field names on ${patched} goals`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  USER NOTES GLOSSARY NORMALIZATION
// =========================================================================

// FIXUP: Normalize glossary-created notes (name->title, dateCreated->createdAt, numeric id)
function fixupUserNotesGlossaryNormalize() {
  const ID = 'fixup_userNotes_glossaryNormalize_v1';
  if (isFixupDone(ID)) return 0;

  const notes = safeParseArray('tpprover_user_notes');
  let patched = 0;

  const fixed = notes.map(note => {
    if (!note || typeof note !== 'object') return note;
    let changed = false;
    const copy = { ...note };

    // Numeric id from Date.now() -> string
    if (typeof copy.id === 'number') {
      copy.id = String(copy.id);
      changed = true;
    }

    // GlossaryQuickModal uses 'name' instead of 'title'
    if (copy.name && !copy.title) { copy.title = copy.name; changed = true; }

    // dateCreated -> createdAt
    if (copy.dateCreated && !copy.createdAt) {
      copy.createdAt = copy.dateCreated;
      delete copy.dateCreated;
      changed = true;
    }

    // dateModified -> updatedAt
    if (copy.dateModified && !copy.updatedAt) {
      copy.updatedAt = copy.dateModified;
      delete copy.dateModified;
      changed = true;
    }

    if (changed) { patched++; return touchItem(copy); }
    return note;
  });

  if (patched > 0) {
    safeSaveArray('tpprover_user_notes', fixed);
    console.log(`🩹 [FIXUP] ${ID}: normalized ${patched} glossary-created notes`);
  }
  markFixupComplete(ID);
  return patched;
}

// =========================================================================
//  MASTER REGISTRY & RUNNER
// =========================================================================

const ALL_FIXUPS = [
  // Protocols
  { id: 'fixup_protocols_ensureFields_v1', fn: fixupProtocolsEnsureFields },
  { id: 'fixup_protocols_endDateNoEnd_v1', fn: fixupProtocolsEndDateConflict },
  { id: 'fixup_protocols_dosageScheduleType_v1', fn: fixupProtocolsDosageScheduleType },
  { id: 'fixup_protocols_restoreTitration_v1', fn: fixupProtocolsRestoreTitration },
  { id: 'fixup_protocols_vialCost_v1', fn: fixupProtocolsVialCost },
  { id: 'fixup_protocols_ghostStartDate_v1', fn: fixupProtocolsGhostStartDate },
  { id: 'fixup_protocols_restoreStartDate_v1', fn: fixupProtocolsRestoreStartDate },
  { id: 'fixup_protocols_structure_v2', fn: fixupProtocolsStructureV2 },
  // Vendors
  { id: 'fixup_vendors_ensureFields_v1', fn: fixupVendorsEnsureFields },
  { id: 'fixup_vendors_contacts_v2', fn: fixupVendorsContactsV2 },
  // Stockpile
  { id: 'fixup_stockpile_ensureFields_v1', fn: fixupStockpileEnsureFields },
  { id: 'fixup_stockpile_v2', fn: fixupStockpileV2 },
  // Orders
  { id: 'fixup_orders_ensureFields_v1', fn: fixupOrdersEnsureFields },
  { id: 'fixup_orders_v2', fn: fixupOrdersV2 },
  // Recon
  { id: 'fixup_reconItems_ensureFields_v1', fn: fixupReconItemsEnsureFields },
  { id: 'fixup_reconHistory_ensureFields_v1', fn: fixupReconHistoryEnsureFields },
  // Scheduled Buys
  { id: 'fixup_scheduledBuys_ensureFields_v1', fn: fixupScheduledBuysEnsureFields },
  // Wishlist
  { id: 'fixup_wishlist_ensureFields_v1', fn: fixupWishlistEnsureFields },
  // User Notes
  { id: 'fixup_userNotes_ensureFields_v1', fn: fixupUserNotesEnsureFields },
  { id: 'fixup_repairProtocolNoteLinks_v1', fn: fixupRepairProtocolNoteLinks },
  { id: 'fixup_userNotes_glossaryNormalize_v1', fn: fixupUserNotesGlossaryNormalize },
  // Protocol History
  { id: 'fixup_protocolHistory_ensureNotesArray_v1', fn: fixupProtocolHistoryEntries },
  { id: 'fixup_protocolHistory_backfillNames_v1', fn: fixupProtocolHistoryBackfillNames },
  // User Goals
  { id: 'fixup_userGoals_ensureFields_v1', fn: fixupUserGoalsEnsureFields },
  { id: 'fixup_userGoals_normalizeFields_v1', fn: fixupUserGoalsNormalizeFields },
  // Supplements
  { id: 'fixup_supplements_ensureFields_v1', fn: fixupSupplementsEnsureFields },
  // Metrics
  { id: 'fixup_metrics_ensureFields_v1', fn: fixupMetricsEnsureFields },
  // Calendar Notes
  { id: 'fixup_calendarNotes_ensureFields_v1', fn: fixupCalendarNotesEnsureFields },
  // Water Tracker
  { id: 'fixup_waterTracker_ensureFields_v1', fn: fixupWaterTrackerEnsureFields },
  // Injection History
  { id: 'fixup_injectionHistory_ensureFields_v1', fn: fixupInjectionHistoryEnsureFields },
  // Injection Stats
  { id: 'fixup_injectionStats_validate_v1', fn: fixupInjectionStatsValidate },
];

/**
 * Run all pending data fixups. Call AFTER initial data load + merge so
 * localStorage has the latest merged data. Fixed items get bumped updatedAt
 * so the normal auto-sync pushes corrections to cloud automatically.
 *
 * @returns {{ totalPatched: number, ran: string[] }}
 */
export function runDataFixups() {
  const results = { totalPatched: 0, ran: [] };

  for (const fixup of ALL_FIXUPS) {
    if (isFixupDone(fixup.id)) continue;

    try {
      const patched = fixup.fn();
      if (patched > 0) {
        results.totalPatched += patched;
      }
      results.ran.push(fixup.id);
    } catch (e) {
      console.error(`❌ [FIXUP] ${fixup.id} failed:`, e);
    }
  }

  if (results.totalPatched > 0) {
    console.log(`🩹 [DATA FIXUPS] Done — ${results.totalPatched} items repaired across ${results.ran.length} fixups`);
  }

  return results;
}

/**
 * Check how many fixups are still pending (useful for diagnostics).
 */
export function getPendingFixupCount() {
  return ALL_FIXUPS.filter(f => !isFixupDone(f.id)).length;
}
