/**
 * Centralized FCM token persistence for native + web push.
 * CRITICAL: never write a partial `notificationSettings` object — Firestore merge
 * replaces the whole map and wipes AM/PM reminder flags (which clears the queue).
 */
import { Capacitor } from '@capacitor/core';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCurrentDeviceInfo } from './deviceDetection';

const PENDING_TOKEN_KEY = 'tpprover_pending_fcm_token';

function resolveUserId(explicitUserId = null) {
  if (explicitUserId) return explicitUserId;
  try {
    const authUid = typeof window !== 'undefined' && window.__TPP_AUTH_UID__;
    if (authUid) return authUid;
  } catch {
    // ignore
  }
  try {
    const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
    // Only accept Firebase Auth UIDs — never email-keyed docs (rules require auth.uid == docId)
    if (user?.uid) return user.uid;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Save FCM/push token to users/{uid}. Token fields only — no nested settings wipe.
 */
export async function saveFcmTokenToFirestore(token, options = {}) {
  if (!token || typeof token !== 'string') {
    console.warn('📱 saveFcmTokenToFirestore: missing token');
    return { success: false, error: 'missing_token' };
  }

  const userId = resolveUserId(options.userId);
  if (!userId) {
    localStorage.setItem(PENDING_TOKEN_KEY, token);
    console.warn('📱 No auth UID yet — FCM token stored pending login');
    return { success: false, error: 'no_uid', pending: true };
  }

  try {
    const userRef = doc(db, 'users', userId);
    const payload = {
      fcmToken: token,
      pushToken: token,
      deviceInfo: {
        ...getCurrentDeviceInfo(),
        ...(options.deviceInfoExtra || {}),
      },
    };
    await setDoc(userRef, payload, { merge: true });
    localStorage.removeItem(PENDING_TOKEN_KEY);
    console.log('✅ FCM token saved to Firestore');
    return { success: true, userId };
  } catch (error) {
    console.warn('📱 Direct FCM token write failed, trying callable fallback:', error?.message || error);
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const register = httpsCallable(getFunctions(), 'registerFcmToken');
      await register({
        token,
        deviceInfo: {
          ...getCurrentDeviceInfo(),
          ...(options.deviceInfoExtra || {}),
        },
      });
      localStorage.removeItem(PENDING_TOKEN_KEY);
      console.log('✅ FCM token saved via registerFcmToken callable');
      return { success: true, userId, via: 'callable' };
    } catch (callableError) {
      localStorage.setItem(PENDING_TOKEN_KEY, token);
      console.error('❌ Failed to save FCM token:', callableError);
      return { success: false, error: callableError.message || error.message || 'save_failed' };
    }
  }
}

/**
 * If a token was captured before login, write it now.
 */
export async function flushPendingFcmToken(userId = null) {
  const pending = localStorage.getItem(PENDING_TOKEN_KEY);
  if (!pending) return { success: false, error: 'no_pending' };
  return saveFcmTokenToFirestore(pending, { userId });
}

/**
 * Ensure native push registration + Firestore token sync.
 * Safe to call on every cold start when permission is already granted.
 */
export async function ensureNativePushRegistration(userId = null) {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'not_native' };
  }

  // Always try pending flush first (covers first-launch-before-login)
  const pendingResult = await flushPendingFcmToken(userId);

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const permissionResult = await PushNotifications.checkPermissions();
    if (permissionResult.receive !== 'granted') {
      return {
        success: pendingResult?.success === true,
        error: 'permission_not_granted',
        permission: permissionResult.receive,
        pendingFlushed: pendingResult?.success === true,
      };
    }

    let registrationHandle;
    let errorHandle;
    const tokenPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Android often does not re-emit registration if already registered this session.
        // Pending flush above still covers the pre-login token case.
        resolve({ timedOut: true, pendingFlushed: pendingResult?.success === true });
      }, 8000);

      PushNotifications.addListener('registration', async (token) => {
        clearTimeout(timeout);
        console.log('📱 FCM token received:', token.value?.slice?.(0, 12) + '…');
        const result = await saveFcmTokenToFirestore(token.value, { userId });
        resolve({ token: token.value, save: result });
      }).then((h) => {
        registrationHandle = h;
      });

      PushNotifications.addListener('registrationError', (error) => {
        clearTimeout(timeout);
        console.error('❌ Push registration error:', JSON.stringify(error));
        reject(new Error(error?.error || JSON.stringify(error)));
      }).then((h) => {
        errorHandle = h;
      });
    });

    await PushNotifications.register();
    const result = await tokenPromise;

    try {
      registrationHandle?.remove?.();
      errorHandle?.remove?.();
    } catch {
      // ignore
    }

    return result;
  } catch (error) {
    console.warn('📱 ensureNativePushRegistration failed:', error?.message || error);
    return {
      success: false,
      error: error?.message || 'register_failed',
      pendingFlushed: pendingResult?.success === true,
    };
  }
}

export { PENDING_TOKEN_KEY };
