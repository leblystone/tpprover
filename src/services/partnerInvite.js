/**
 * Research Partner client service.
 *
 * Thin wrappers around the partner invite callables.
 * Local state is cached in localStorage so the UI renders instantly.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';

const CACHE_KEY = 'tpprover_partner';

export function getCachedPartner() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function setCachedPartner(data) {
    try {
        if (data) localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        else localStorage.removeItem(CACHE_KEY);
    } catch { /* ignore */ }
}

export async function sendPartnerInvite(email) {
    const fn = httpsCallable(getFunctions(), 'sendPartnerInvite');
    const res = await fn({ email });
    const data = res?.data || {};
    setCachedPartner({ status: 'pending', inviteeEmail: data.inviteeEmail, inviteId: data.inviteId });
    return data;
}

export async function removePartner() {
    const fn = httpsCallable(getFunctions(), 'removePartner');
    const res = await fn({});
    setCachedPartner(null);
    return res?.data || {};
}
