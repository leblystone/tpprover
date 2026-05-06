/**
 * Post-Update Reconciliation
 *
 * After a v2.x upgrade, compares current localStorage entity counts against
 * the pre-v2 cloud snapshot's itemCounts. If any entity dropped by >20% AND
 * >5 absolute items, surfaces a one-shot event so the UI can show a
 * "Restore from backup" banner.
 */

const RECON_FLAG = 'tpprover_postUpdateReconDone_v1';

const ENTITY_KEYS = {
  protocols:      'tpprover_protocols',
  orders:         'tpprover_orders',
  stockpile:      'tpprover_stockpile',
  vendors:        'tpprover_vendors',
  supplements:    'tpprover_supplements',
  reconItems:     'tpprover_recon_items',
  reconHistory:   'tpprover_recon_history',
  metrics:        'tpprover_metrics',
  scheduledBuys:  'tpprover_scheduled_buys',
  injectionHistory: 'tpprover_injection_history',
  protocolHistory: 'tpprover_protocol_history',
  wishlist:       'tpprover_wishlist',
  userNotes:      'tpprover_user_notes',
  userGoals:      'tpprover_user_goals',
};

function countLocal(lsKey) {
  try {
    const raw = localStorage.getItem(lsKey);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : (typeof parsed === 'object' ? Object.keys(parsed).length : 0);
  } catch {
    return 0;
  }
}

/**
 * Run the post-update reconciliation check.
 * @param {Object} snapshotItemCounts - The `itemCounts` map from the pre-v2 snapshot
 * @returns {{ hasDrops: boolean, drops: Array<{ entity: string, before: number, after: number }> }}
 */
export function reconcileAfterUpdate(snapshotItemCounts) {
  if (!snapshotItemCounts || typeof snapshotItemCounts !== 'object') {
    return { hasDrops: false, drops: [] };
  }

  const drops = [];

  for (const [entity, lsKey] of Object.entries(ENTITY_KEYS)) {
    const before = snapshotItemCounts[entity] || 0;
    if (before <= 5) continue;

    const after = countLocal(lsKey);
    const drop = before - after;
    const dropPct = drop / before;

    if (drop > 5 && dropPct > 0.2) {
      drops.push({ entity, before, after });
    }
  }

  return { hasDrops: drops.length > 0, drops };
}

/**
 * Returns true if reconciliation still needs to run (flag not yet set).
 */
export function needsReconciliation() {
  return !localStorage.getItem(RECON_FLAG);
}

/**
 * Mark reconciliation as complete so the banner doesn't re-appear.
 */
export function markReconciliationDone() {
  localStorage.setItem(RECON_FLAG, '1');
}
