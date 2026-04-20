/**
 * Referral service (Research+ Wave).
 *
 * Thin client wrapper around the `getMyReferralCode` and
 * `redeemReferral` callables. Local storage is used for a lightweight
 * cache so the referral banner renders instantly on mount.
 */
import { httpsCallable, getFunctions } from 'firebase/functions';

const CACHE_KEY = 'tpprover_referral_code';
const PENDING_KEY = 'tpprover_pending_referral';

/**
 * Capture a referral code from a URL search string (e.g. `?ref=ABC123`).
 *
 * Stored in localStorage so it survives the signup redirect and can be
 * redeemed automatically once the new user finishes authentication.
 * Existing values are not overwritten — the first touch wins, matching
 * typical attribution behaviour.
 */
export function capturePendingReferral(search = typeof window !== 'undefined' ? window.location.search : '') {
    try {
        const params = new URLSearchParams(search || '');
        const code = params.get('ref');
        if (!code) return null;
        const existing = localStorage.getItem(PENDING_KEY);
        if (existing) return existing;
        const normalized = String(code).trim().toUpperCase().slice(0, 24);
        if (!normalized) return null;
        localStorage.setItem(PENDING_KEY, normalized);
        return normalized;
    } catch {
        return null;
    }
}

export function getPendingReferral() {
    try {
        return localStorage.getItem(PENDING_KEY) || null;
    } catch {
        return null;
    }
}

export function clearPendingReferral() {
    try {
        localStorage.removeItem(PENDING_KEY);
    } catch {
        // ignore
    }
}

export function getCachedReferralCode() {
    try {
        return localStorage.getItem(CACHE_KEY) || null;
    } catch {
        return null;
    }
}

function cacheReferralCode(code) {
    try {
        if (code) localStorage.setItem(CACHE_KEY, code);
    } catch {
        // ignore
    }
}

export async function fetchMyReferralCode() {
    const cached = getCachedReferralCode();
    if (cached) return cached;
    try {
        const call = httpsCallable(getFunctions(), 'getMyReferralCode');
        const res = await call({});
        const code = res?.data?.code || null;
        if (code) cacheReferralCode(code);
        return code;
    } catch (err) {
        console.warn('[referrals] getMyReferralCode failed', err);
        return null;
    }
}

export async function redeemReferralCode(code) {
    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized) throw new Error('Referral code is required.');
    const call = httpsCallable(getFunctions(), 'redeemReferral');
    const res = await call({ code: normalized });
    return res?.data || {};
}

export function buildReferralUrl(code, { base } = {}) {
    const origin = base || (typeof window !== 'undefined' ? window.location.origin : '');
    if (!origin || !code) return '';
    return `${origin}/signup?ref=${encodeURIComponent(code)}`;
}
