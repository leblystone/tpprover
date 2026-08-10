/**
 * Dev-only UI page previews for orphan/gated screens (verify email, login, etc.).
 * Gated to the same test UID as the subscription override toolbar.
 */
import { DEV_TEST_UID } from './devSubscriptionOverride';

export function isDevUiPreviewAllowed(uid) {
  if (!import.meta.env.DEV) return false;
  // No uid yet (mount race / public page) or the allowed test account
  return !uid || uid === DEV_TEST_UID;
}

/** True when ?devPreview=1 in local DEV (blocked for non-test accounts). */
export function isDevUiPreview(searchParams, uid) {
  if (!isDevUiPreviewAllowed(uid)) return false;
  try {
    const flag =
      typeof searchParams?.get === 'function'
        ? searchParams.get('devPreview')
        : new URLSearchParams(window.location.search).get('devPreview');
    return flag === '1';
  } catch {
    return false;
  }
}

/**
 * Consolidated verify shell — one route (`/verify-email`), phase via `state=`.
 * Shown as its own section in Preview Update UX.
 */
export const DEV_VERIFY_EMAIL_PREVIEWS = [
  { label: 'waiting', path: '/verify-email?devPreview=1&state=waiting' },
  { label: 'verifying', path: '/verify-email?devPreview=1&state=verifying' },
  { label: 'success', path: '/verify-email?devPreview=1&state=success' },
  { label: 'success → app', path: '/verify-email?devPreview=1&state=success&returnTo=native' },
  { label: 'already verified', path: '/verify-email?devPreview=1&state=already' },
  { label: 'already → app', path: '/verify-email?devPreview=1&state=already&returnTo=native' },
  { label: 'error', path: '/verify-email?devPreview=1&state=error' },
];

/** Other pages that are hard to reach from normal app navigation. */
export const DEV_UI_PAGES = [
  { label: 'Activate · expired', path: '/activate?devPreview=1&state=expired' },
  { label: 'Activate · activating', path: '/activate?devPreview=1&state=activating' },
  { label: 'Activate · success', path: '/activate?devPreview=1&state=success' },
  { label: 'Reset password · form', path: '/reset-password?devPreview=1&state=form' },
  { label: 'Reset password · invalid link', path: '/reset-password?devPreview=1&state=invalid' },
  { label: 'Login', path: '/login?devPreview=1' },
  { label: 'Login · enable biometric', path: '/login?devPreview=1&bioSetup=1' },
  { label: 'Login · biometric unlock', path: '/login?devPreview=1&bioUnlock=1' },
  { label: 'Signup', path: '/login?signup=true&devPreview=1' },
  { label: 'Magic link', path: '/magic-link?devPreview=1' },
  { label: 'Redeem lifetime', path: '/research-lifetime?devPreview=1' },
  { label: 'Redeem annual', path: '/research-annual?devPreview=1' },
  { label: 'Delete account (public)', path: '/delete-account?devPreview=1' },
  { label: 'Launch coming soon', path: '/launch-coming-soon' },
];
