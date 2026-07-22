/**
 * Central place for sync/merge error reporting.
 * Writes errors to Firestore syncErrors/{userId}/events collection
 * so they're visible in the admin panel and can trigger alerts.
 *
 * Also logs to console and optionally to Firebase Crashlytics on native.
 */

import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { DEV_TEST_UID } from './devSubscriptionOverride';

let _crashlytics = null;
if (typeof window !== 'undefined') {
  import('@capacitor/core').then(({ Capacitor }) => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor-firebase/crashlytics').then(({ FirebaseCrashlytics }) => {
        _crashlytics = FirebaseCrashlytics;
      }).catch(() => {});
    }
  }).catch(() => {});
}

/**
 * Report a sync or merge error. No PII — only codes and data type names.
 * Writes to Firestore syncErrors/{userId}/events for admin visibility.
 * @param {string} code - e.g. 'sync_failed', 'merge_error'
 * @param {Object} context - Optional: { userId?: string, dataType?: string, errorMessage?: string, skipMerge?: boolean }
 */
export function reportSyncError(code, context = {}) {
  const payload = { code, ...context };
  console.error('[Sync error]', payload);

  if (_crashlytics) {
    _crashlytics.recordException({ message: `Sync: ${code}` }).catch(() => {});
  }

  const userId = context.userId || _getCurrentUserId();
  if (!userId) return;
  if (userId === DEV_TEST_UID) return; // Never log dev account noise to the admin panel

  try {
    const eventsRef = collection(db, 'syncErrors', userId, 'events');
    addDoc(eventsRef, {
      code,
      dataType: context.dataType || null,
      errorMessage: context.errorMessage || null,
      skipMerge: context.skipMerge || false,
      platform: _getPlatform(),
      timestamp: serverTimestamp(),
    }).catch((err) => {
      console.warn('Failed to write sync error to Firestore:', err.message);
    });
  } catch (e) {
    console.warn('Sync error reporter failed:', e);
  }
}

/**
 * Dispatch a sync health event for the UI to pick up.
 * @param {'saving' | 'syncing' | 'success' | 'error'} status
 * @param {string} [message]
 */
export function dispatchSyncStatus(status, message) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('tpp:sync-status', {
    detail: { status, message, timestamp: Date.now() },
  }));
}

function _getCurrentUserId() {
  try {
    const raw = localStorage.getItem('tpprover_user');
    if (raw) {
      const user = JSON.parse(raw);
      return user?.uid || user?.id || null;
    }
  } catch { /* ignore */ }
  return null;
}

function _getPlatform() {
  try {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/android/i.test(ua)) return 'android';
      if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
    }
    return 'web';
  } catch {
    return 'unknown';
  }
}
