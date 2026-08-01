import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

const APP_HOSTS = new Set(['thepepplanner.app', 'www.thepepplanner.app']);
const CUSTOM_SCHEME = 'thepepplanner';

/**
 * Normalize an incoming deep link (https Universal Link or custom scheme)
 * into a path the React router can navigate to.
 */
export function pathFromDeepLink(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);

    // thepepplanner://magic-link?oobCode=...
    if (parsed.protocol === `${CUSTOM_SCHEME}:`) {
      const hostOrPath = parsed.hostname || parsed.pathname.replace(/^\//, '');
      if (hostOrPath === 'magic-link' || url.includes('mode=signIn') || url.includes('oobCode=')) {
        const search = parsed.search || '';
        return `/magic-link${search}`;
      }
      const path = parsed.pathname || '/';
      return `${path.startsWith('/') ? path : `/${path}`}${parsed.search || ''}`;
    }

    // https://thepepplanner.app/magic-link?...
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      if (!APP_HOSTS.has(parsed.hostname) && !url.includes('mode=signIn')) {
        return null;
      }
      return `${parsed.pathname || '/'}${parsed.search || ''}`;
    }
  } catch {
    return null;
  }

  return null;
}

function navigateToDeepLink(url, navigate) {
  const path = pathFromDeepLink(url);
  if (!path || typeof navigate !== 'function') return false;

  // Magic-link / auth callbacks should replace so back doesn't re-trigger.
  const replace = path.startsWith('/magic-link') || path.includes('oobCode=');
  navigate(path, { replace });
  return true;
}

/**
 * Wire Capacitor appUrlOpen + cold-start launch URL into the SPA router.
 * Call once after RouterProvider is ready (pass router.navigate).
 */
export async function setupNativeDeepLinks(navigate) {
  if (!Capacitor.isNativePlatform() || typeof navigate !== 'function') {
    return () => {};
  }

  const handleUrl = (url) => {
    if (!url) return;
    try {
      navigateToDeepLink(url, navigate);
    } catch (err) {
      console.warn('Deep link navigation failed:', err);
    }
  };

  try {
    const launch = await CapApp.getLaunchUrl();
    if (launch?.url) handleUrl(launch.url);
  } catch {
    // getLaunchUrl unsupported / nothing pending
  }

  const listener = await CapApp.addListener('appUrlOpen', ({ url }) => {
    handleUrl(url);
  });

  return () => {
    try {
      listener?.remove?.();
    } catch {
      // ignore
    }
  };
}

/**
 * Build a custom-scheme URL that opens the native app with the same query
 * string as the current magic-link page.
 */
export function buildAppMagicLinkSchemeUrl(href = window.location.href) {
  try {
    const parsed = new URL(href);
    return `${CUSTOM_SCHEME}://magic-link${parsed.search || ''}`;
  } catch {
    return `${CUSTOM_SCHEME}://magic-link`;
  }
}

/**
 * Android Intent URL that prefers the installed app, with https fallback.
 */
export function buildAndroidMagicLinkIntentUrl(href = window.location.href) {
  try {
    const parsed = new URL(href);
    const q = (parsed.search || '').replace(/^\?/, '');
    const fallback = encodeURIComponent(href);
    return `intent://magic-link${q ? `?${q}` : ''}#Intent;scheme=${CUSTOM_SCHEME};package=com.thepepplanner.app;S.browser_fallback_url=${fallback};end`;
  } catch {
    return buildAppMagicLinkSchemeUrl(href);
  }
}

export function isMobileBrowserUserAgent(ua = navigator.userAgent || '') {
  return /android|iphone|ipad|ipod/i.test(ua);
}

export { CUSTOM_SCHEME };
