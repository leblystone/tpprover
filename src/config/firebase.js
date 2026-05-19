// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeFirestore, getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import {
  getAuth,
  initializeAuth,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported as isAnalyticsSupported, logEvent as firebaseLogEvent } from 'firebase/analytics';
import { getEnvVar } from './appConfig.js';

// Your web app's Firebase configuration
const measurementId = getEnvVar('VITE_FIREBASE_MEASUREMENT_ID');
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
  // Omit when unset — avoids Analytics “measurement ID mismatch” if env is stale vs Firebase Console
  ...(measurementId ? { measurementId } : {}),
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore: iOS WKWebView blocks WebSocket/gRPC connections used by Firestore's default transport.
// Force long-polling on native iOS so every read/write goes over plain HTTP instead.
// On web/Android we use auto-detect (try WebSocket first, fall back if blocked).
const nativeIOSForFirestore =
  typeof window !== 'undefined' &&
  Capacitor.isNativePlatform() &&
  Capacitor.getPlatform() === 'ios';

let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    ...(nativeIOSForFirestore
      ? { experimentalForceLongPolling: true }   // plain HTTP — works in WKWebView
      : { experimentalAutoDetectLongPolling: true }), // WebSocket preferred elsewhere
    ignoreUndefinedProperties: true,
  });
} catch {
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

// IndexedDB first can hang on some iOS WKWebView builds; prefer localStorage-style persistence on native iOS.
const nativeIOS =
  typeof window !== 'undefined' &&
  Capacitor.isNativePlatform() &&
  Capacitor.getPlatform() === 'ios';
const authPersistence = nativeIOS
  ? [browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence, inMemoryPersistence]
  : [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence];

// Initialize Auth with explicit persistence fallbacks for WKWebView/iOS reliability
let authInstance;
try {
  // Required when using initializeAuth + signInWithPopup / signInWithRedirect.
  // Omitting popupRedirectResolver causes auth/argument-error on both flows.
  authInstance = initializeAuth(app, {
    persistence: authPersistence,
    popupRedirectResolver: browserPopupRedirectResolver
  });
} catch {
  // Already initialized (or unsupported path) - fallback to default getter
  authInstance = getAuth(app);
}
export const auth = authInstance;

// Initialize Functions with correct region
export const functions = getFunctions(app, 'us-central1');

// Initialize Storage
export const storage = getStorage(app);

// Initialize Analytics (non-blocking). Omit measurementId in .env if Analytics isn't
// enabled in Firebase Console — avoids "measurement ID mismatch" console noise.
let analytics = null;
if (measurementId && typeof window !== 'undefined') {
  const suppressAnalyticsNoise = (...args) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('measurement ID') || msg.includes('@firebase/analytics')) return;
    return false;
  };
  const _warn = console.warn;
  console.warn = (...args) => {
    if (suppressAnalyticsNoise(...args)) return;
    _warn.apply(console, args);
  };
  isAnalyticsSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch {
        // Analytics init failed — skip silently
      }
    }
    console.warn = _warn;
  }).catch(() => {
    console.warn = _warn;
  });
}

export { analytics };

/**
 * Log a custom event to Firebase Analytics (payment funnel, etc.)
 * Safe to call even if analytics isn't initialized yet.
 */
export function logAnalyticsEvent(eventName, params = {}) {
  if (analytics) {
    firebaseLogEvent(analytics, eventName, params);
  }
}

// Emulators disabled - using production Firebase services
// if (import.meta.env.DEV && typeof window !== 'undefined') {
//   try {
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     connectAuthEmulator(auth, 'http://localhost:9099');
//     connectFunctionsEmulator(functions, 'localhost', 5001);
//   } catch (error) {
//     console.log('Firebase emulators not connected:', error.message);
//   }
// }

export default app;
