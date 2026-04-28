/**
 * Research+ Wave — cloud sync pause switch.
 *
 * When a user is soft-downgraded to Free, we keep all local data intact
 * but stop writing to Firestore so their paid-tier snapshot isn't
 * overwritten by free-tier changes. Uploads resume automatically on
 * upgrade (the next mutation flushes).
 *
 * Stored in localStorage so the flag survives reloads and is accessible
 * from non-React modules (e.g. `services/cloudStorage.js`).
 */
const KEY = 'tpprover_cloud_sync_paused';

export function isCloudSyncPaused() {
    try {
        return localStorage.getItem(KEY) === '1';
    } catch {
        return false;
    }
}

export function setCloudSyncPaused(paused) {
    try {
        if (paused) {
            localStorage.setItem(KEY, '1');
        } else {
            localStorage.removeItem(KEY);
        }
        window.dispatchEvent(new CustomEvent('tpp:cloud-sync-pause', {
            detail: { paused: Boolean(paused) },
        }));
    } catch {
        // ignore
    }
}
