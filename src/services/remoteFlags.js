/**
 * Remote feature flags service.
 *
 * Flags are stored in Firestore at `config/featureFlags` so the admin
 * can toggle them live from the Admin Panel without a redeploy.
 *
 * Priority order (highest wins):
 *   1. Firestore `config/featureFlags` (admin-controlled, live)
 *   2. localStorage dev overrides (dev / QA only)
 *   3. VITE_ env vars (CI / build-time)
 *   4. LOCAL_DEV_OVERRIDES in featureFlags.js (fallback)
 *
 * Call `loadRemoteFlags()` once on app mount. It patches `featureFlags`
 * in memory and stores in localStorage so the next load is instant.
 *
 * Call `setRemoteFlag(name, value)` from the admin panel to persist a
 * flag change to Firestore + apply it immediately.
 */

import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { featureFlags } from '../config/featureFlags';

const CACHE_KEY = 'tpprover_remote_flags';
const FLAG_DOC = 'config/featureFlags';

function applyFlags(data) {
    Object.entries(data).forEach(([k, v]) => {
        if (k in featureFlags && typeof v === 'boolean') {
            featureFlags[k] = v;
        }
    });
}

/** Load flags from Firestore and patch the live featureFlags object. */
export async function loadRemoteFlags() {
    try {
        // Apply cached version instantly (avoid flash of wrong UI).
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) applyFlags(JSON.parse(cached));

        const db = getFirestore();
        const snap = await getDoc(doc(db, FLAG_DOC));
        if (snap.exists()) {
            const data = snap.data();
            applyFlags(data);
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        }
    } catch {
        // Firestore unavailable (offline / no auth) — fall through to defaults.
    }
}

/** Subscribe to live flag changes (admin panel updates propagate in real time). */
export function subscribeRemoteFlags(onChange) {
    try {
        const db = getFirestore();
        return onSnapshot(doc(db, FLAG_DOC), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                applyFlags(data);
                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
                if (onChange) onChange(data);
            }
        });
    } catch {
        return () => {};
    }
}

/** Set a single flag in Firestore (admin only). */
export async function setRemoteFlag(flagName, value) {
    const db = getFirestore();
    await setDoc(doc(db, FLAG_DOC), { [flagName]: Boolean(value) }, { merge: true });
    featureFlags[flagName] = Boolean(value);
    // Update local cache.
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        const prev = cached ? JSON.parse(cached) : {};
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ...prev, [flagName]: Boolean(value) }));
    } catch { /* ignore */ }
}

/** Fetch all flags from Firestore for the admin panel. */
export async function getRemoteFlags() {
    const db = getFirestore();
    const snap = await getDoc(doc(db, FLAG_DOC));
    return snap.exists() ? snap.data() : {};
}
