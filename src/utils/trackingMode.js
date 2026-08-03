/**
 * Tracking mode helpers — Simple vs Advanced researcher experience.
 * Stored in userState (cloud) and mirrored in settings.trackingMode.
 */

import { clearSettingsCache } from './settingsHelpers';

export const TRACKING_MODES = {
  SIMPLE: 'simple',
  ADVANCED: 'advanced',
};

export const TRACKING_MODE_LABELS = {
  [TRACKING_MODES.SIMPLE]: 'Simple',
  [TRACKING_MODES.ADVANCED]: 'Advanced',
};

export const TRACKING_MODE_HELPER = {
  [TRACKING_MODES.SIMPLE]: 'GLP-1 or a single peptide — a cleaner setup focused on the essentials.',
  [TRACKING_MODES.ADVANCED]: 'Multiple peptides, deep dive analytics, and full research tools.',
};

export const ONBOARDING_STEPS = {
  SPLASH: 'splash',
  RESEARCHER_TYPE: 'researcherType',
  FIRST_PROTOCOL: 'firstProtocol',
  SETUP_CHECKLIST: 'setupChecklist',
  TRIAL_PRICING: 'trialPricing',
  DONE: 'done',
};

export const DEFAULT_SETUP_CHECKLIST = {
  stockpile: false,
  orders: false,
  supplements: false,
  medications: false,
  vendors: false,
  goals: false,
};

export function normalizeTrackingMode(value) {
  if (value === TRACKING_MODES.ADVANCED || value === 'multi_protocol' || value === 'advanced') {
    return TRACKING_MODES.ADVANCED;
  }
  if (value === TRACKING_MODES.SIMPLE || value === 'single_focus' || value === 'guided' || value === 'simple') {
    return TRACKING_MODES.SIMPLE;
  }
  return TRACKING_MODES.SIMPLE;
}

export function isSimpleMode(mode) {
  return normalizeTrackingMode(mode) === TRACKING_MODES.SIMPLE;
}

export function isAdvancedMode(mode) {
  return normalizeTrackingMode(mode) === TRACKING_MODES.ADVANCED;
}

/**
 * Read tracking mode from local settings (fast, sync).
 * Falls back to simple.
 */
export function getLocalTrackingMode() {
  try {
    const raw = localStorage.getItem('tpprover_settings');
    if (!raw) return TRACKING_MODES.SIMPLE;
    const settings = JSON.parse(raw);
    return normalizeTrackingMode(settings?.trackingMode);
  } catch {
    return TRACKING_MODES.SIMPLE;
  }
}

/**
 * Persist tracking mode into settings (local + cloud sync via existing settings save).
 */
export function setLocalTrackingMode(mode) {
  const next = normalizeTrackingMode(mode);
  try {
    const raw = localStorage.getItem('tpprover_settings');
    const settings = raw ? JSON.parse(raw) : {};
    const updated = { ...settings, trackingMode: next };
    localStorage.setItem('tpprover_settings', JSON.stringify(updated));
    clearSettingsCache();
    window.dispatchEvent(new CustomEvent('tpp:tracking-mode-changed', { detail: { trackingMode: next } }));
    return next;
  } catch (e) {
    console.warn('Failed to save trackingMode locally', e);
    return next;
  }
}
