import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Your Firebase config - you'll need to get this from Firebase Console
const firebaseConfig = {
  // TODO: Replace with your actual Firebase config
  // You'll get this from Firebase Console > Project Settings > General > Your apps
  apiKey: "your-api-key-here",
  authDomain: "tpp-splendide.firebaseapp.com",
  projectId: "tpp-splendide",
  storageBucket: "tpp-splendide.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Connect to emulators in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Only connect to emulators if not already connected
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
  } catch (error) {
    // Emulators already connected or not available
    console.log('Firebase emulators not connected:', error.message);
  }
}

export default app;
