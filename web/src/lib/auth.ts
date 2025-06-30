import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
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
