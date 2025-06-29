// web/src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  connectAuthEmulator,
} from "firebase/auth";
import type { Auth } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
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

// auto‐anonymous sign‐in
onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch((e) => {
      console.error("Anon sign-in failed:", e);
    });
  }
});

// — Firestore setup —
export const db: Firestore = getFirestore(app);
if (import.meta.env.DEV) {
  // point Firestore to emulator on 8080
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
