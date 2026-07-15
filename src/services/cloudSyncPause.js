/**
 * Cloud sync pause — retired.
 *
 * Sync is on for all accounts regardless of tier. Paid features are
 * gated by capability caps, not data access. This module is kept only
 * so callsites compile; isCloudSyncPaused always returns false and
 * setCloudSyncPaused(false) clears any legacy flag left in localStorage.
 */
const KEY = 'tpprover_cloud_sync_paused';

export function isCloudSyncPaused() {
    return false;
}

export function setCloudSyncPaused(paused) {
    try {
        // Always clear — never set. Removes the flag for any user who had
        // it stuck from a previous build so their sync resumes immediately.
        localStorage.removeItem(KEY);
    } catch {
        // ignore
    }
}
