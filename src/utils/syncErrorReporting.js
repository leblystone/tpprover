/**
 * Central place for sync/merge error reporting.
 * Use in saveAppData and merge catch paths so failures are visible (logs + optional Sentry/Crashlytics).
 *
 * To wire Sentry later:
 *   window.__reportSyncError = (code, context) => {
 *     Sentry.captureMessage(`Sync: ${code}`, { extra: context, level: 'error' });
 *   };
 * Or use Firebase Crashlytics in a similar way.
 */

/**
 * Report a sync or merge error. No PII — only codes and data type names.
 * @param {string} code - e.g. 'sync_failed', 'merge_error'
 * @param {Object} context - Optional: { dataType?: string, skipMerge?: boolean }
 */
export function reportSyncError(code, context = {}) {
  const payload = { code, ...context };
  console.error('[Sync error]', payload);
  if (typeof window !== 'undefined' && typeof window.__reportSyncError === 'function') {
    try {
      window.__reportSyncError(code, context);
    } catch (e) {
      console.warn('Sync error reporter failed:', e);
    }
  }
}
