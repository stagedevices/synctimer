import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface Peer {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  linkedAt: Timestamp;
  tags: string[];
}

export function usePeers() {
  const [user] = useAuthState(auth);
  const uid = user?.uid;

  const [peers, setPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const q = query(
      collection(db, 'users', uid, 'peers'),
      orderBy('linkedAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Peer, 'id'>),
        }));
        setPeers(docs);
        setLoading(false);
      },
      (err) => {
        console.error('usePeers:onSnapshot', err);
        setError(err as Error);
        setLoading(false);
      }
    );
    return unsub;
  }, [uid]);

  return { peers, loading, error };
}
