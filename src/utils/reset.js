// Simple localStorage utilities for resetting app data

export function getAppStorageKeys(prefix = 'tpprover_') {
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(prefix)) keys.push(k)
    }
    return keys
  } catch {
    return []
  }
}

const PRESERVED_KEYS = [
  'tpprover_auth_token',
  'tpprover_user',
  'tpprover_theme',
  'tpprover_has_onboarded',
  'tpprover_settings',
  'tpprover_auth_users',
  'tpprover_has_seeded',
  'tpprover_demo_data_cleared',
  'tpprover_demo_banner_dismissed',
];

export function clearAppData(prefix = 'tpprover_') {
  try {
    const toRemove = getAppStorageKeys(prefix).filter(k => !PRESERVED_KEYS.includes(k));
    for (const k of toRemove) localStorage.removeItem(k)
    return toRemove
  } catch {
    return []
  }
}

export function clearSpecific(keys = []) {
  const removed = []
  try {
    for (const k of keys) {
      if (localStorage.getItem(k) != null) {
        localStorage.removeItem(k)
        removed.push(k)
      }
    }
  } catch {}
  return removed
}


