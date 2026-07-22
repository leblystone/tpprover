/**
 * adminSessionCache — TTL-backed sessionStorage cache for the admin panel.
 *
 * WHY sessionStorage (not memory / useRef)?
 * -----------------------------------------
 * React state and useRef are lost on page refresh. Navigating within the admin
 * panel is already fast thanks to useRef guards in AdminContext, but whenever
 * the admin opens the panel fresh (new tab, F5, back-button) every expensive
 * Firestore / Cloud Function call fires again.
 *
 * sessionStorage persists for the life of the browser tab (cleared on close),
 * which is exactly the right scope for admin work-session data.
 *
 * USAGE
 * -----
 *   import { adminCacheGet, adminCacheSet, adminCacheInvalidate } from '../../utils/adminSessionCache';
 *
 *   // Read (returns null on miss or expired):
 *   const cached = adminCacheGet('admin:orders');
 *   if (cached) { setOrders(cached); return; }
 *
 *   // Write with TTL:
 *   const rows = await fetchOrders();
 *   adminCacheSet('admin:orders', rows, 5 * 60 * 1000); // 5-min TTL
 *
 *   // Force-invalidate (e.g. after a mutation or manual refresh):
 *   adminCacheInvalidate('admin:orders');
 *
 * SERIALIZATION NOTE
 * ------------------
 * Firestore Timestamp objects serialise to { seconds, nanoseconds } which is
 * the same shape the admin helper functions already accept, so round-tripping
 * through JSON is transparent for all existing date-handling code.
 *
 * RECOMMENDED TTLs
 * ----------------
 *   users / analytics        10 min  — large collection scan, rarely changes
 *   shop orders               5 min  — moderate mutation rate
 *   revenue metrics          15 min  — Cloud Fn + Stripe API, expensive
 *   AI cost limits/stats      3 min  — near-real-time monitoring
 *   PiP query log / cache     5 min  — read-heavy, low mutation
 *   sync errors               2 min  — want reasonably fresh, but not live
 */

const PREFIX = 'tpp_admin_cache:';

/**
 * Read a cached value.
 * Returns the stored data (any JSON-serialisable value) or `null` on miss/expiry.
 *
 * @param {string} key
 * @returns {any|null}
 */
export function adminCacheGet(key) {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      sessionStorage.removeItem(PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Store a value in the cache with a TTL.
 *
 * @param {string} key
 * @param {any}    data        — must be JSON-serialisable
 * @param {number} ttlMs       — time-to-live in milliseconds
 */
export function adminCacheSet(key, data, ttlMs) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({
      data,
      expiresAt: Date.now() + ttlMs,
    }));
  } catch {
    // sessionStorage full or unavailable — silently ignore; the page still works without cache
  }
}

/**
 * Remove a specific cache entry (e.g. after a mutation so the next read is fresh).
 *
 * @param {string} key
 */
export function adminCacheInvalidate(key) {
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/**
 * Remove all admin cache entries (e.g. on admin logout / hard refresh).
 */
export function adminCacheInvalidateAll() {
  try {
    const toRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
