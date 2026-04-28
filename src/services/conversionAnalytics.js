/**
 * Conversion analytics — Research+ Wave.
 *
 * Thin wrapper on top of `logAnalyticsEvent` (Firebase Analytics) that
 * also mirrors every event into a user-scoped Firestore collection so
 * the admin dashboard can build funnel reports without depending on GA
 * export latency.
 *
 * Events are best-effort — if analytics isn't supported (SSR, private
 * mode, blocked trackers) we still write the Firestore row, and if the
 * Firestore write fails we at least have console breadcrumbs in dev.
 *
 * Usage:
 *   import { trackConversion } from 'services/conversionAnalytics';
 *   trackConversion('upgrade_cta_click', { location: 'trial_banner' });
 */
import { logAnalyticsEvent } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// Canonical event names — keep stable, add new ones at the bottom.
export const EVENTS = {
    SIGNUP_STARTED: 'signup_started',
    SIGNUP_COMPLETED: 'signup_completed',
    TRIAL_STARTED: 'trial_started',
    TRIAL_EXPIRED: 'trial_expired',
    DOWNGRADED_TO_FREE: 'downgraded_to_free',
    UPGRADE_CTA_CLICK: 'upgrade_cta_click',
    UPGRADE_PLAN_VIEWED: 'upgrade_plan_viewed',
    UPGRADE_CHECKOUT_STARTED: 'upgrade_checkout_started',
    UPGRADE_CHECKOUT_COMPLETED: 'upgrade_checkout_completed',
    UPGRADE_CHECKOUT_ABANDONED: 'upgrade_checkout_abandoned',
    REFERRAL_LINK_COPIED: 'referral_link_copied',
    REFERRAL_REDEEMED: 'referral_redeemed',
    AI_PROMPT_SENT: 'ai_prompt_sent',
    AI_LIBRARY_SAVED: 'ai_library_saved',
    AI_QUOTA_EXHAUSTED: 'ai_quota_exhausted',
    BUDDY_INVITED: 'buddy_invited',
    COMMUNITY_ADDED: 'community_added',
    PAGE_INTRO_COMPLETED: 'page_intro_completed',
    FEATURE_LOCK_HIT: 'feature_lock_hit',
};

const FUNNEL_COLLECTION = 'conversionFunnel';

function sanitizeParams(params = {}) {
    // Firebase Analytics rejects objects and long strings silently.
    // Stringify + truncate to stay inside GA4's 100-char value limit.
    const out = {};
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (typeof value === 'object') {
            try {
                out[key] = JSON.stringify(value).slice(0, 100);
            } catch {
                // skip un-serializable values
            }
            return;
        }
        out[key] = String(value).slice(0, 100);
    });
    return out;
}

/**
 * Fire a conversion-funnel event.
 *
 * @param {string} eventName - ideally pulled from `EVENTS` for consistency
 * @param {object} params    - flat key/value pairs (nested objects get stringified)
 */
export async function trackConversion(eventName, params = {}) {
    if (!eventName) return;
    const payload = sanitizeParams(params);

    try {
        logAnalyticsEvent(eventName, payload);
    } catch (err) {
        if (import.meta?.env?.DEV) {
            console.warn('[analytics] logAnalyticsEvent failed', err);
        }
    }

    // Mirror into Firestore for in-app funnel dashboards. Fire-and-forget
    // so UI isn't blocked waiting on network.
    try {
        const user = auth?.currentUser;
        await addDoc(collection(db, FUNNEL_COLLECTION), {
            eventName,
            params: payload,
            uid: user?.uid || null,
            email: user?.email || null,
            createdAt: serverTimestamp(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 160) : null,
        });
    } catch (err) {
        if (import.meta?.env?.DEV) {
            console.warn('[analytics] Firestore mirror failed', err);
        }
    }
}

/**
 * Track an upgrade CTA click with a `location` tag (e.g. `trial_banner`,
 * `ai_lock`, `community_lock`). Kept as its own helper so grep surfaces
 * every CTA surface quickly during funnel audits.
 */
export function trackUpgradeCta(location, extra = {}) {
    return trackConversion(EVENTS.UPGRADE_CTA_CLICK, { location, ...extra });
}

export default {
    EVENTS,
    trackConversion,
    trackUpgradeCta,
};
