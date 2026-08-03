/**
 * Passkey (WebAuthn) client utilities.
 *
 * UI labels: "Face ID" / "Fingerprint" / "Face or Fingerprint" — never "Passkey".
 * Separate from biometricAuth.js (which unlocks a stored password locally).
 */

import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { isIOS, isAndroid, isNative } from './platform';

function getFns() {
  return getFunctions(getApp(), 'us-central1');
}

/**
 * Detect support and return a user-facing label.
 * @returns {Promise<{ supported: boolean, label: string }>}
 */
export async function isPasskeySupported() {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return { supported: false, label: 'Face or Fingerprint' };
    }

    let platformAuth = false;
    try {
      platformAuth = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      platformAuth = false;
    }

    // On native Cap WebViews without the Cap 8+ passkey shim, platform auth may be false.
    // Still allow the button if PublicKeyCredential exists — OS may prompt.
    const supported = !!platformAuth || (!isNative() && !!window.PublicKeyCredential);

    let label = 'Face or Fingerprint';
    if (isIOS()) {
      label = 'Face ID';
    } else if (isAndroid()) {
      label = 'Fingerprint';
    } else if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/iPhone|iPad|Macintosh/.test(ua)) label = 'Face ID';
      else if (/Android/.test(ua)) label = 'Fingerprint';
      else label = 'Face or Fingerprint Unlock';
    }

    return { supported, label };
  } catch {
    return { supported: false, label: 'Face or Fingerprint' };
  }
}

/**
 * Enroll a passkey for the currently signed-in user.
 * @param {string} [nickname]
 * @returns {Promise<{ success: boolean, credentialId?: string }>}
 */
export async function registerPasskey(nickname = 'This device') {
  const functions = getFns();
  const gen = httpsCallable(functions, 'generatePasskeyRegistrationOptions');
  const { data } = await gen({ nickname });

  const attResp = await startRegistration({ optionsJSON: data.options });

  const verify = httpsCallable(functions, 'verifyPasskeyRegistration');
  const result = await verify({
    challengeId: data.challengeId,
    response: attResp,
    nickname: data.nickname || nickname,
  });

  return result.data;
}

/**
 * Sign in with a discoverable passkey (Face ID / Fingerprint).
 * @returns {Promise<{ user: import('firebase/auth').User, email: string|null, uid: string }>}
 */
export async function loginWithPasskey() {
  const functions = getFns();
  const gen = httpsCallable(functions, 'generatePasskeyLoginOptions');
  const { data } = await gen({});

  const assertResp = await startAuthentication({ optionsJSON: data.options });

  const verify = httpsCallable(functions, 'verifyPasskeyLogin');
  const result = await verify({
    challengeId: data.challengeId,
    response: assertResp,
  });

  if (!result.data?.customToken) {
    throw new Error('Passkey sign-in failed — no session token returned.');
  }

  const auth = getAuth();
  const cred = await signInWithCustomToken(auth, result.data.customToken);

  return {
    user: cred.user,
    email: result.data.email || cred.user.email,
    uid: result.data.uid || cred.user.uid,
  };
}

/**
 * List enrolled passkeys for the current user.
 * @returns {Promise<Array<{ credentialId: string, nickname: string, createdAt: string|null, lastUsedAt: string|null }>>}
 */
export async function listPasskeys() {
  const functions = getFns();
  const fn = httpsCallable(functions, 'listPasskeys');
  const { data } = await fn({});
  return data?.passkeys || [];
}

/**
 * Remove a passkey device.
 * @param {string} credentialId
 */
export async function removePasskeyDevice(credentialId) {
  const functions = getFns();
  const fn = httpsCallable(functions, 'removePasskey');
  const { data } = await fn({ credentialId });
  return data;
}
