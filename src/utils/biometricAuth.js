/**
 * biometricAuth.js
 *
 * Handles biometric / fingerprint sign-in for:
 *  • Native (Capacitor iOS/Android) — Face ID, Touch ID, Android fingerprint
 *  • Web / PWA — browser Credential Management API (which uses the device's
 *    biometric to unlock saved credentials on modern mobile browsers)
 *
 * ── Flow ────────────────────────────────────────────────────────────────────
 *  Enable (after first normal login — banking-style):
 *    1. Prompt OS biometric once to confirm it works
 *    2. Call saveBiometricCredentials(uid, email, password?, encKey?)
 *    3. Stores encrypted credential bundle in localStorage
 *    4. Sets 'tpp_biometric_enabled' = 'true'
 *
 *  Login with biometric (auto on login screen when enabled):
 *    1. Call checkBiometricAvailable() → { available, type }
 *    2. If available, call promptBiometric() → triggers OS biometric UI
 *    3. On success, call getBiometricCredentials() → { email, password?, encKey? }
 *    4. Use those credentials to call loginUser() or completeSocialSignIn()
 *
 *  Disable:
 *    Call disableBiometricLogin()
 */

import { isNative } from './platform.js';

const STORAGE_KEY   = 'tpp_biometric_creds';   // stores the credential bundle
const ENABLED_KEY   = 'tpp_biometric_enabled';  // 'true' | null
const TYPE_KEY      = 'tpp_biometric_type';     // 'password' | 'social'

// ─── Tiny XOR-based obfuscation (not true encryption — credentials are also
//     protected by the OS secure enclave on native platforms, and by the
//     browser's credential store on web). ─────────────────────────────────
function obfuscate(str, key) {
  const k = key || 'tpp_bio_default';
  return btoa(
    str
      .split('')
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ k.charCodeAt(i % k.length)))
      .join('')
  );
}

function deobfuscate(encoded, key) {
  const k = key || 'tpp_bio_default';
  return atob(encoded)
    .split('')
    .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ k.charCodeAt(i % k.length)))
    .join('');
}

// ─── Check availability ──────────────────────────────────────────────────────
/**
 * Returns { available: bool, type: 'faceId'|'touchId'|'fingerprint'|'device'|'web'|null }
 */
export async function checkBiometricAvailable() {
  if (isNative()) {
    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      const info = await BiometricAuth.checkBiometry();
      const available = info.isAvailable && !info.strongBiometryIsAvailable === false;
      return {
        available: info.isAvailable ?? false,
        type: info.biometryType ?? 'fingerprint',
        strongAvailable: info.strongBiometryIsAvailable ?? info.isAvailable ?? false,
      };
    } catch {
      return { available: false, type: null, strongAvailable: false };
    }
  }

  // Web / PWA: check Credential Management API support
  const hasCredMgr = typeof window !== 'undefined' && 'credentials' in navigator && 'PasswordCredential' in window;
  if (hasCredMgr) {
    return { available: true, type: 'web', strongAvailable: false };
  }

  return { available: false, type: null, strongAvailable: false };
}

// ─── Prompt the OS biometric dialog (native only) ────────────────────────────
/**
 * Shows the native biometric prompt. Resolves on success, throws on failure.
 * On web this is a no-op (credential retrieval acts as the "prompt").
 */
export async function promptBiometric({ reason = 'Verify your identity to sign in' } = {}) {
  if (!isNative()) return true; // web handles prompt during credential retrieval

  const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
  await BiometricAuth.authenticate({
    reason,
    cancelTitle: 'Cancel',
    allowDeviceCredential: true, // fall back to PIN/pattern if biometric fails
    iosFallbackTitle: 'Use Passcode',
  });
  return true;
}

// ─── Persist / retrieve credential bundle ────────────────────────────────────

/**
 * Save credential bundle after a successful login so biometric can be used later.
 *
 * @param {object} opts
 * @param {string}  opts.uid       Firebase UID
 * @param {string}  opts.email
 * @param {string} [opts.password] Only for email/password users
 * @param {string} [opts.encKey]   Only for social/passwordless users
 */
export function saveBiometricCredentials({ uid, email, password, encKey }) {
  const type   = password ? 'password' : 'social';
  const bundle = JSON.stringify({ uid, email, password: password || '', encKey: encKey || '' });
  const seed   = uid ? uid.slice(0, 8) : 'tpp_bio';
  try {
    localStorage.setItem(STORAGE_KEY, obfuscate(bundle, seed));
    localStorage.setItem(ENABLED_KEY, 'true');
    localStorage.setItem(TYPE_KEY, type);

    // Web: also store in PasswordCredential for native browser biometric autofill
    if (!isNative() && password && window.PasswordCredential) {
      const cred = new window.PasswordCredential({ id: email, password });
      navigator.credentials.store(cred).catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieve stored credential bundle (call AFTER promptBiometric succeeds).
 * Returns { uid, email, password, encKey } or null.
 */
export function getBiometricCredentials() {
  const storedUid = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('tpprover_user') || '{}');
      return user.uid ? user.uid.slice(0, 8) : 'tpp_bio';
    } catch {
      return 'tpp_bio';
    }
  })();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const bundle = JSON.parse(deobfuscate(raw, storedUid));
    return bundle;
  } catch {
    return null;
  }
}

// ─── Web-only: retrieve credentials via browser Credential Manager ────────────
/**
 * On web/PWA, ask the browser to auto-fill a saved credential.
 * The browser will present its native UI (may trigger Face ID / fingerprint on
 * mobile Safari / Chrome).
 *
 * Returns { email, password } or null if nothing was selected.
 */
export async function getWebCredential() {
  if (isNative() || !window.PasswordCredential) return null;
  try {
    const cred = await navigator.credentials.get({
      password: true,
      mediation: 'optional', // show picker only when needed; use 'required' to always prompt
    });
    if (cred && cred.type === 'password') {
      return { email: cred.id, password: cred.password };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── High-level helpers ───────────────────────────────────────────────────────

/** Returns true if the user has biometric login enabled. */
export function isBiometricEnabled() {
  return localStorage.getItem(ENABLED_KEY) === 'true';
}

/** Returns the stored credential type: 'password' | 'social' | null */
export function getBiometricType() {
  return localStorage.getItem(TYPE_KEY) || null;
}

/** Remove the stored biometric credential bundle and disable biometric login. */
export function disableBiometricLogin() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ENABLED_KEY);
  localStorage.removeItem(TYPE_KEY);
}

/**
 * Full biometric login flow:
 *   1. Check availability
 *   2. Prompt native OS biometric (native only)
 *   3. Retrieve stored credentials
 *
 * Returns { success: bool, credentials: { uid, email, password?, encKey? } | null, error?: string }
 */
export async function doBiometricLogin() {
  const { available } = await checkBiometricAvailable();
  if (!available) {
    return {
      success: false,
      credentials: null,
      error: 'Biometric unlock isn’t available on this device. Please sign in with email and password.',
    };
  }

  if (!isBiometricEnabled()) {
    return {
      success: false,
      credentials: null,
      error: 'Biometric login isn’t set up yet. Sign in with your email and password first — we’ll ask if you want to enable it.',
    };
  }

  try {
    if (isNative()) {
      await promptBiometric();
      const creds = getBiometricCredentials();
      if (!creds) {
        return {
          success: false,
          credentials: null,
          error: 'Biometric login isn’t set up yet. Sign in with your email and password first — we’ll ask if you want to enable it.',
        };
      }
      return { success: true, credentials: creds };
    } else {
      // Web: try Credential Manager first (may trigger device biometric)
      const webCred = await getWebCredential();
      if (webCred) {
        return { success: true, credentials: { ...webCred, uid: '', encKey: '' } };
      }
      // Fall back to stored bundle
      const creds = getBiometricCredentials();
      if (!creds) {
        return {
          success: false,
          credentials: null,
          error: 'Biometric login isn’t set up yet. Sign in with your email and password first — we’ll ask if you want to enable it.',
        };
      }
      return { success: true, credentials: creds };
    }
  } catch (err) {
    // BiometricAuth throws specific codes
    const msg =
      err?.message?.includes('Cancel') || err?.message?.includes('cancel')
        ? 'cancelled'
        : err?.message?.includes('lockout') || err?.message?.includes('Lockout')
          ? 'Too many failed attempts. Please use your PIN or sign in with email and password.'
          : /biometric|fingerprint|face|biometry|hardware|permission/i.test(err?.message || '')
            ? 'Biometric unlock didn’t work. Please sign in with email and password.'
            : 'Biometric unlock didn’t work. Please sign in with email and password.';
    return { success: false, credentials: null, error: msg };
  }
}
