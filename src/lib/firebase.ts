import { initializeApp, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

/**
 * Firebase Configuration
 * 
 * IMPORTANT: Replace these values with your Firebase project config
 * Get these from: Firebase Console > Project Settings > General > Your apps
 * 
 * For production, use environment variables:
 * - VITE_FIREBASE_API_KEY
 * - VITE_FIREBASE_AUTH_DOMAIN
 * - etc.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCYrY93JMKuAol-m0bOpByeJNL89FDNE7Q",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "issue-tracker-app-1768880804.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "issue-tracker-app-1768880804",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "issue-tracker-app-1768880804.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "812642204688",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:812642204688:web:3e8cd05d798d54837fd73b",
};

// Initialize Firebase app (handle multiple initializations)
let app;
try {
  app = getApp();
} catch {
  app = initializeApp(firebaseConfig);
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  console.log('🔧 Connected to Firebase emulators');
}

export { app };
export default app;
