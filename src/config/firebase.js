// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDzGVtlnIk0QzUSgK6o41KGpYKk6opdgcE",
  authDomain: "tpp-splendide.firebaseapp.com",
  projectId: "tpp-splendide",
  storageBucket: "tpp-splendide.firebasestorage.app",
  messagingSenderId: "97564473391",
  appId: "1:97564473391:web:71f235c49040e559aa6eda"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Emulators disabled - using production Firebase services
// if (import.meta.env.DEV && typeof window !== 'undefined') {
//   try {
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     connectAuthEmulator(auth, 'http://localhost:9099');
//   } catch (error) {
//     console.log('Firebase emulators not connected:', error.message);
//   }
// }

export default app;
