/**
 * Subscription state override for UI testing.
 * Restricted to a single test account UID — invisible to all other users.
 * Safe to ship in production; the UID gate prevents any real user from seeing it.
 */

const KEY = 'tpp_dev_sub_override';

/** Only this account can see and use the dev toolbar. */
export const DEV_TEST_UID = 'G2Msgqiu28PVc2B2WjsE4ciVz5W2';

export const DEV_STATES = [
  'off',
  'trialing',
  'free',
  'founder_active',
  'founder_lapsed',
  'research_plus',
];

export const DEV_STATE_META = {
  off:            { label: 'Real',            dot: '#9ca3af', tier: null },
  trialing:       { label: 'Trialing',        dot: '#3b82f6', tier: 'research_plus' },
  free:           { label: 'Free (lapsed)',    dot: '#f59e0b', tier: 'free' },
  founder_active: { label: 'Founder Active',  dot: '#D4A030', tier: 'founder' },
  founder_lapsed: { label: 'Founder Lapsed',  dot: '#b45309', tier: 'free' },
  research_plus:  { label: 'Research+',       dot: '#10b981', tier: 'research_plus' },
};

export const DEV_STATE_LABELS = Object.fromEntries(
  Object.entries(DEV_STATE_META).map(([k, v]) => [k, v.label])
);

export function getDevOverride(uid) {
  if (uid && uid !== DEV_TEST_UID) return 'off';
  try { return localStorage.getItem(KEY) || 'off'; } catch { return 'off'; }
}

export function setDevOverride(state) {
  try {
    if (state === 'off') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, state);
  } catch { /* ignore */ }
  window.dispatchEvent(new Event('tpp:dev-override-changed'));
}

export function cycleDevOverride() {
  const cur = getDevOverride();
  const next = DEV_STATES[(DEV_STATES.indexOf(cur) + 1) % DEV_STATES.length];
  setDevOverride(next);
  return next;
}
