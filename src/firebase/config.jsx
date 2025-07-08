import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Replace these with your actual Firebase config values
const firebaseConfig = {
  apiKey: "AIzaSyCC0uuELp95mO6oD7fLVYtseBYdRKzrSr8",
  authDomain: "workout-tracker-app-3f74c.firebaseapp.com",
  projectId: "workout-tracker-app-3f74c",
  storageBucket: "workout-tracker-app-3f74c.firebasestorage.app",
  messagingSenderId: "645811369612",
  appId: "1:645811369612:web:23c19fb72573653dee2da9",
  measurementId: "G-NGJXYJTSKB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence
export const db = getFirestore(app);

// Enable offline persistence
try {
  enableIndexedDbPersistence(db);
} catch (err) {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
}

// Initialize Auth
export const auth = getAuth(app);

export default app;
