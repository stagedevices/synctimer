import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  type User,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * Sign a user in using either email or handle.
 * The persistence is set based on the `remember` flag.
 */
export async function signIn(
  handleOrEmail: string,
  password: string,
  remember: boolean,
): Promise<User> {
  await setPersistence(
    auth,
    remember ? browserLocalPersistence : browserSessionPersistence,
  );
  let email = handleOrEmail;
  if (!handleOrEmail.includes('@')) {
    const snap = await getDocs(
      query(collection(db, 'users'), where('handle', '==', handleOrEmail.toLowerCase())),
    );
    if (snap.empty) {
      throw new Error('auth/user-not-found');
    }
    email = (snap.docs[0].data() as { email: string }).email;
  }
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/**
 * Create a user account and store the handle in Firestore.
 */
export async function signUp(
  email: string,
  handle: string,
  fullName: string,
  password: string,
): Promise<User> {
  const h = handle.toLowerCase();
  const existing = await getDocs(
    query(collection(db, 'users'), where('handle', '==', h)),
  );
  if (!existing.empty) {
    throw new Error('Handle already taken');
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (fullName) await updateProfile(cred.user, { displayName: fullName });
  await setDoc(doc(db, 'users', cred.user.uid), {
    email,
    handle: h,
    name: fullName || null,
    createdAt: serverTimestamp(),
  });
  return cred.user;
}

/**
 * Send a password reset email. Handles lookups by handle if necessary.
 */
export async function sendReset(handleOrEmail: string): Promise<void> {
  let email = handleOrEmail;
  if (!handleOrEmail.includes('@')) {
    const snap = await getDocs(
      query(collection(db, 'users'), where('handle', '==', handleOrEmail.toLowerCase())),
    );
    if (snap.empty) throw new Error('auth/user-not-found');
    email = (snap.docs[0].data() as { email: string }).email;
  }
  await sendPasswordResetEmail(auth, email);
}

// Legacy exports used in older parts of the app
export const createAccount = signUp;
export const signInWithIdentifier = (
  identifier: string,
  password: string,
  remember = true,
) => signIn(identifier, password, remember);
export { sendPasswordResetEmail } from 'firebase/auth';

export async function createAccount(
  email: string,
  password: string,
  handle: string,
  name: string
) {
  const h = handle.toLowerCase();
  const existing = await getDocs(
    query(collection(db, 'users'), where('handle', '==', h))
  );
  if (!existing.empty) {
    throw new Error('Handle already taken');
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, 'users', cred.user.uid), {
    email,
    handle: h,
    name: name || null,
    createdAt: serverTimestamp(),
  });
  return cred.user;
}

export async function signInWithIdentifier(
  identifier: string,
  password: string,
  remember = true,
) {
  let email = identifier;
  if (!identifier.includes('@')) {
    const q = query(collection(db, 'users'), where('handle', '==', identifier.toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('User not found');
    email = (snap.docs[0].data() as { email: string }).email;
  }
  await setPersistence(
    auth,
    remember ? browserLocalPersistence : browserSessionPersistence
  );
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export { sendPasswordResetEmail };
