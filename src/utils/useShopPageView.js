import { useEffect, useRef } from 'react';
import { trackShopPageView } from '../services/shopAnalytics';

const DEDUPE_PREFIX = 'tpp_shop_pv_';
const DEDUPE_MS = 30 * 60 * 1000;

function shouldFirePageView(pageKey) {
  if (!pageKey || typeof sessionStorage === 'undefined') return true;
  try {
    const raw = sessionStorage.getItem(`${DEDUPE_PREFIX}${pageKey}`);
    if (!raw) return true;
    const ts = Number(raw);
    if (Number.isNaN(ts)) return true;
    return Date.now() - ts > DEDUPE_MS;
  } catch {
    return true;
  }
}

function markPageViewFired(pageKey) {
  try {
    sessionStorage.setItem(`${DEDUPE_PREFIX}${pageKey}`, String(Date.now()));
  } catch {
    // ignore
  }
}

/**
 * Track a shop page view once per pageKey per 30-minute browser session.
 * @param {string} pageKey - e.g. 'home', 'vault', 'product:my-slug'
 * @param {object} [extra] - extra params merged into the event
 */
export function useShopPageView(pageKey, extra = {}) {
  const extraRef = useRef(extra);
  extraRef.current = extra;

  useEffect(() => {
    if (!pageKey) return;
    if (!shouldFirePageView(pageKey)) return;
    markPageViewFired(pageKey);
    trackShopPageView(pageKey, extraRef.current);
  }, [pageKey]);
}

export default useShopPageView;
