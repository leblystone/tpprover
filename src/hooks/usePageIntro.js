import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getIntroForRoute } from '../data/pageIntros';
import { featureFlags } from '../config/featureFlags';

const STORAGE_KEY = 'tpprover_page_intros_seen';

/**
 * Stored shape: { [routeKey]: number }
 * A route is considered "seen" when its stored version >= the intro's current version.
 * Bumping `version` in pageIntros.js re-shows that page's tip for everyone.
 */
function loadSeenMap() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        // Migrate legacy format (array → object with version 1 for all seen routes)
        if (Array.isArray(parsed)) {
            const migrated = {};
            parsed.forEach((key) => { migrated[key] = 1; });
            return migrated;
        }
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
        return {};
    }
}

function persistSeenMap(map) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
        // ignore quota errors
    }
}

/**
 * Page intro hook.
 *
 * - Watches the current route.
 * - If a matching intro exists AND the user's stored version for that route
 *   is behind the intro's current version (or missing), surfaces the modal.
 * - Marks the route as seen at the current version when `dismiss()` is called.
 *
 * To re-show a tip for ALL users after a significant page update, increment
 * that page's `version` in pageIntros.js. No copy changes needed.
 *
 * Respects `featureFlags.ENABLE_PAGE_INTROS`. Also suppressed if the
 * user has disabled tips in Settings → Preferences via
 * `tpprover_page_intros_disabled=true`.
 *
 * Manual replay: users can call `replay()` to force-show the current page's
 * intro. Admin/dev can call the exported `resetAllIntros()` to wipe seen
 * history entirely.
 */
export function usePageIntro() {
    const location = useLocation();
    const [seenMap, setSeenMap] = useState(() => loadSeenMap());
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

    const currentVersion = intro?.version ?? 1;
    const seenVersion = seenMap[routeKey] ?? 0;
    const alreadySeen = seenVersion >= currentVersion;

    const shouldShow = !disabled && !!intro && (forceShow || !alreadySeen);

    const dismiss = () => {
        if (!routeKey) return;
        setSeenMap((prev) => {
            const next = { ...prev, [routeKey]: currentVersion };
            persistSeenMap(next);
            return next;
        });
        setForceShow(false);
    };

    // Bottom nav tap clears any visible page tip
    useEffect(() => {
        const onNav = () => {
            if (!shouldShow) return;
            dismiss();
        };
        window.addEventListener('tpp:bottom-nav-click', onNav);
        return () => window.removeEventListener('tpp:bottom-nav-click', onNav);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldShow, routeKey, currentVersion]);

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
