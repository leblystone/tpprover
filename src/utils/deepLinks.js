import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

const APP_HOSTS = new Set(['thepepplanner.app', 'www.thepepplanner.app']);
const CUSTOM_SCHEME = 'thepepplanner';
const ANDROID_PACKAGE = 'com.thepepplanner.app';

/**
 * Normalize an incoming deep link (https Universal Link or custom scheme)
 * into a path the React router can navigate to.
 */
export function pathFromDeepLink(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);

    // thepepplanner://magic-link?oobCode=...
    // thepepplanner://app/dashboard?verified=1
    if (parsed.protocol === `${CUSTOM_SCHEME}:`) {
      const hostOrPath = parsed.hostname || parsed.pathname.replace(/^\//, '');
      if (hostOrPath === 'magic-link' || url.includes('mode=signIn') || url.includes('oobCode=')) {
        const search = parsed.search || '';
        return `/magic-link${search}`;
      }
      // Custom-scheme host becomes first path segment: app/dashboard → /app/dashboard
      if (parsed.hostname) {
        const rest = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
        return `/${parsed.hostname}${rest}${parsed.search || ''}`;
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
  const replace = path.startsWith('/magic-link') || path.includes('oobCode=') || path.includes('verified=1');
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
    return `intent://magic-link${q ? `?${q}` : ''}#Intent;scheme=${CUSTOM_SCHEME};package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
  } catch {
    return buildAppMagicLinkSchemeUrl(href);
  }
}

/** After email verification in the browser, reopen the native app on dashboard. */
export function buildAppVerifyReturnSchemeUrl(path = '/app/dashboard') {
  const clean = path.startsWith('/') ? path.slice(1) : path;
  const [pathname, query = ''] = clean.split('?');
  const q = new URLSearchParams(query);
  q.set('verified', '1');
  return `${CUSTOM_SCHEME}://${pathname}?${q.toString()}`;
}

export function buildAndroidVerifyReturnIntentUrl(path = '/app/dashboard') {
  const clean = path.startsWith('/') ? path.slice(1) : path;
  const [pathname, query = ''] = clean.split('?');
  const q = new URLSearchParams(query);
  q.set('verified', '1');
  const fallback = encodeURIComponent(`https://thepepplanner.app/${pathname}?${q.toString()}`);
  return `intent://${pathname}?${q.toString()}#Intent;scheme=${CUSTOM_SCHEME};package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
}

/** Try to hand the user back to the installed native app after web verification. */
export function openNativeAppAfterVerification() {
  if (typeof window === 'undefined') return;
  const ua = navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);
  try {
    window.location.href = isAndroid
      ? buildAndroidVerifyReturnIntentUrl()
      : buildAppVerifyReturnSchemeUrl();
  } catch {
    window.location.href = buildAppVerifyReturnSchemeUrl();
  }
}

/** Current client surface for verification return routing. */
export function getVerificationReturnTo() {
  try {
    if (Capacitor.isNativePlatform()) return 'native';
  } catch {
    // ignore
  }
  return 'web';
}

export function isMobileBrowserUserAgent(ua = navigator.userAgent || '') {
  return /android|iphone|ipad|ipod/i.test(ua);
}

export { CUSTOM_SCHEME };
