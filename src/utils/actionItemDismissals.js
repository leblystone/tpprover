/**
 * Persist To-Do dismissals in settings (syncs via preferences with the rest of tpprover_settings).
 * Keys match action item ids from buildActionItems (e.g. protocol-abc, stockpile-xyz).
 */

import { clearSettingsCache, getDefaultSettings, loadSettings, saveSettings } from './settingsHelpers';

export function getDismissedActionItems() {
  try {
    const settings = loadSettings() || getDefaultSettings();
    const map = settings?.dismissedActionItems;
    return map && typeof map === 'object' ? map : {};
  } catch {
    return {};
  }
}

export function isActionItemDismissed(id, dismissedMap = getDismissedActionItems()) {
  if (!id) return false;
  return Boolean(dismissedMap?.[id]);
}

/**
 * Dismiss an action item. Returns the updated dismissal map.
 */
export function dismissActionItem(id) {
  if (!id) return getDismissedActionItems();
  const settings = loadSettings() || getDefaultSettings();
  const prev = settings.dismissedActionItems && typeof settings.dismissedActionItems === 'object'
    ? settings.dismissedActionItems
    : {};
  const nextMap = {
    ...prev,
    [id]: { dismissedAt: new Date().toISOString() },
  };
  saveSettings({ ...settings, dismissedActionItems: nextMap });
  clearSettingsCache();
  window.dispatchEvent(new CustomEvent('tpp:action-items-dismissed-changed', { detail: { id, map: nextMap } }));
  return nextMap;
}

/**
 * Restore a dismissed item (undo). Returns the updated dismissal map.
 */
export function undismissActionItem(id) {
  if (!id) return getDismissedActionItems();
  const settings = loadSettings() || getDefaultSettings();
  const prev = settings.dismissedActionItems && typeof settings.dismissedActionItems === 'object'
    ? { ...settings.dismissedActionItems }
    : {};
  delete prev[id];
  saveSettings({ ...settings, dismissedActionItems: prev });
  clearSettingsCache();
  window.dispatchEvent(new CustomEvent('tpp:action-items-dismissed-changed', { detail: { id, map: prev, undid: true } }));
  return prev;
}

/**
 * Drop dismissal keys that no longer match any active item (keeps settings tidy).
 */
export function pruneDismissedActionItems(activeIds = []) {
  const settings = loadSettings() || getDefaultSettings();
  const prev = settings.dismissedActionItems && typeof settings.dismissedActionItems === 'object'
    ? settings.dismissedActionItems
    : {};
  const active = new Set(activeIds);
  let changed = false;
  const next = {};
  Object.entries(prev).forEach(([key, val]) => {
    if (active.has(key)) {
      next[key] = val;
    } else {
      changed = true;
    }
  });
  if (!changed) return prev;
  saveSettings({ ...settings, dismissedActionItems: next });
  clearSettingsCache();
  return next;
}
