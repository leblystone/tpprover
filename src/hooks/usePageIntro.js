import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getIntroForRoute } from '../data/pageIntros';
import { featureFlags } from '../config/featureFlags';

const STORAGE_KEY = 'tpprover_page_intros_seen';

function loadSeenSet() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
        return new Set();
    }
}

function persistSeenSet(set) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
    } catch {
        // ignore quota errors
    }
}

/**
 * Page intro hook.
 *
 * - Watches the current route.
 * - If a matching intro exists AND the user hasn't seen it yet, exposes
 *   `{ intro, dismiss, replay }` so a shell component can render a modal.
 * - Marks the route as seen when `dismiss()` is called.
 *
 * Respects `featureFlags.ENABLE_PAGE_INTROS`. Also suppressed if the
 * user has disabled tips in Settings → Preferences via
 * `tpprover_page_intros_disabled=true`.
 *
 * Manual replay: users can call the `replay()` helper to show the current
 * page's intro again; admin/dev can call the exported `resetAllIntros()`
 * to wipe seen history entirely.
 */
export function usePageIntro() {
    const location = useLocation();
    const [seen, setSeen] = useState(() => loadSeenSet());
    const [forceShow, setForceShow] = useState(false);

    const disabled = !featureFlags.ENABLE_PAGE_INTROS
        || (typeof localStorage !== 'undefined'
            && localStorage.getItem('tpprover_page_intros_disabled') === 'true');

    const intro = getIntroForRoute(location.pathname, location.search || '');
    const pathBase = (location.pathname || '').split('?')[0].split('#')[0].replace(/\/$/, '');
    const tab = new URLSearchParams(location.search || '').get('tab');
    const routeKey = pathBase === '/app/vendors' && tab === 'community'
        ? '/app/vendors/tab/community'
        : pathBase;

    const shouldShow = !disabled && !!intro && (forceShow || !seen.has(routeKey));

    const dismiss = () => {
        if (!routeKey) return;
        setSeen((prev) => {
            const next = new Set(prev);
            next.add(routeKey);
            persistSeenSet(next);
            return next;
        });
        setForceShow(false);
    };

    const replay = () => setForceShow(true);

    // Reset forceShow when the route changes
    useEffect(() => {
        setForceShow(false);
    }, [routeKey]);

    return {
        intro: shouldShow ? intro : null,
        routeKey,
        dismiss,
        replay,
        disabled,
    };
}

export function resetAllIntros() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('tpp:page-intros-reset'));
    } catch {
        // ignore
    }
}
