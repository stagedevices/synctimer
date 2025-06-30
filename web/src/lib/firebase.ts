// web/src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  unlink,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);

// — Auth setup —
export const auth: Auth = getAuth(app);
if (import.meta.env.DEV) {
  // point Auth to emulator on 9099
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
}

// — Firestore setup —
export const db: Firestore = getFirestore(app);
if (import.meta.env.DEV) {
  // point Firestore to emulator on 8080
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

async function writeProfile(cred: UserCredential) {
  const u = cred.user;
  await setDoc(
    doc(db, 'users', u.uid),
    {
      displayName: u.displayName,
      email: u.email,
      photoURL: u.photoURL,
      lastSignedInAt: serverTimestamp(),
      ensembles: [],
    },
    { merge: true }
  );
}

export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  await writeProfile(cred);
  return cred;
}

export async function signInWithApple() {
  const cred = await signInWithPopup(auth, appleProvider);
  await writeProfile(cred);
  return cred;
}

export async function unlinkProvider(providerId: string) {
  if (!auth.currentUser) throw new Error('No current user');
  return unlink(auth.currentUser, providerId);
}
