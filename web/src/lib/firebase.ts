// web/src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  unlink,
  type Auth,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from 'firebase/storage';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(config);

// — Auth setup —
export const auth: Auth = getAuth(app);
if (import.meta.env.DEV) {
  // point Auth to emulator on 9099. use localhost to match the dev site
  connectAuthEmulator(auth, "http://localhost:9099", {
    disableWarnings: true,
  });
}

// — Firestore setup —
export const db: Firestore = getFirestore(app);
const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true';
if (import.meta.env.DEV && useEmulator) {
  // point Firestore to emulator on 8080
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

// — Storage setup —
export const storage: FirebaseStorage = getStorage(app);
if (import.meta.env.DEV) {
  // point Storage to emulator on 9199
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}

export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signInWithApple() {
  return signInWithPopup(auth, appleProvider);
}

export async function unlinkProvider(providerId: string) {
  if (!auth.currentUser) throw new Error('No current user');
  return unlink(auth.currentUser, providerId);
}
