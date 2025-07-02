import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface Profile {
  displayName?: string;
  pronouns?: string;
  photoURL?: string;
}

export async function fetchProfile(uid: string): Promise<Profile> {
  const ref = doc(db, 'users', uid, 'profile');
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Profile) : {};
}
