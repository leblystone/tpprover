/**
 * DEV-ONLY: Subscription state override for UI testing.
 * Cycles: off → trialing → free → off
 *
 * Remove this file (and usages) before shipping to production,
 * or leave it — all code paths guard on import.meta.env.DEV so it
 * tree-shakes away in production builds.
 */

const KEY = 'tpp_dev_sub_override';
export const DEV_STATES = ['off', 'trialing', 'free'];

export const DEV_STATE_LABELS = {
  off:      'Real',
  trialing: 'Trial',
  free:     'Free',
};

export function getDevOverride() {
  if (!import.meta.env.DEV) return 'off';
  try { return localStorage.getItem(KEY) || 'off'; } catch { return 'off'; }
}

export function cycleDevOverride() {
  const cur = getDevOverride();
  const next = DEV_STATES[(DEV_STATES.indexOf(cur) + 1) % DEV_STATES.length];
  try {
    if (next === 'off') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch { /* ignore */ }
  window.dispatchEvent(new Event('tpp:dev-override-changed'));
  return next;
}
