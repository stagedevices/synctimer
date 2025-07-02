import { doc, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Remove a friend connection for both users.
 * Deletes the docs in each user's contacts subcollection.
 */
export async function removeFriend(friendUid: string): Promise<void> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) throw new Error('Not authenticated');

  const batch = writeBatch(db);
  const meRef = doc(db, 'users', currentUid, 'contacts', friendUid);
  const youRef = doc(db, 'users', friendUid, 'contacts', currentUid);
  batch.delete(meRef);
  batch.delete(youRef);
  await batch.commit();
}
