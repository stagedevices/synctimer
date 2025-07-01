import { doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { message } from 'antd';

/**
 * Remove a friend connection for both users.
 * Deletes the docs in each user's contacts subcollection.
 */
export async function removeFriend(currentUid: string, friendUid: string): Promise<void> {
  try {
    await Promise.all([
      deleteDoc(doc(db, 'users', currentUid, 'contacts', friendUid)),
      deleteDoc(doc(db, 'users', friendUid, 'contacts', currentUid)),
    ]);
    message.success('Friend removed');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    message.error(msg);
    throw e;
  }
}
