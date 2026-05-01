// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
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
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID')
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore - now using standard WebChannel since CapacitorHttp is disabled
export const db = getFirestore(app);

// Initialize Auth with explicit persistence fallbacks for WKWebView/iOS reliability
let authInstance;
try {
  // Required when using initializeAuth + signInWithPopup / signInWithRedirect.
  // Omitting popupRedirectResolver causes auth/argument-error on both flows.
  authInstance = initializeAuth(app, {
    persistence: [
      indexedDBLocalPersistence,
      browserLocalPersistence,
      browserSessionPersistence,
      inMemoryPersistence
    ],
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

// Initialize Analytics (non-blocking, only in browser environments that support it)
let analytics = null;
if (firebaseConfig.measurementId) {
  isAnalyticsSupported().then(supported => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch {
        // Analytics init failed (e.g. measurement ID mismatch) — skip silently
      }
    }
  }).catch(() => {});
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
