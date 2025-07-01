import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  collection,
  doc,
  onSnapshot,
  getDoc,
  getDocs,
  type DocumentData,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface UserInfo {
  id: string;
  displayName?: string;
  handle?: string;
  photoURL?: string;
  email?: string;
}

export interface FriendsState {
  contacts: UserInfo[];
  incoming: UserInfo[];
  outgoing: UserInfo[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useFriends(): FriendsState {
  const [user] = useAuthState(auth);
  const uid = user?.uid;

  const [contacts, setContacts] = useState<UserInfo[]>([]);
  const [incoming, setIncoming] = useState<UserInfo[]>([]);
  const [outgoing, setOutgoing] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    if (!uid) return;
    setLoading(true);
    const snap = await getDocs(collection(db, 'users', uid, 'contacts'));
    const arr: UserInfo[] = [];
    for (const d of snap.docs) {
      const u = await getDoc(doc(db, 'users', d.id));
      if (u.exists()) {
        const data = u.data() as DocumentData;
        arr.push({ id: d.id, ...data } as UserInfo);
      }
    }
    setContacts(arr);
    setLoading(false);
  };

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const unsubContacts = onSnapshot(
      collection(db, 'users', uid, 'contacts'),
      async snap => {
        const arr: UserInfo[] = [];
        for (const d of snap.docs) {
          const u = await getDoc(doc(db, 'users', d.id));
          if (u.exists()) {
            const data = u.data() as DocumentData;
            arr.push({ id: d.id, ...data } as UserInfo);
          }
        }
        setContacts(arr);
        setLoading(false);
      },
    );
    const unsubIncoming = onSnapshot(
      collection(db, 'users', uid, 'incomingRequests'),
      async snap => {
        const arr: UserInfo[] = [];
        for (const d of snap.docs) {
          const u = await getDoc(doc(db, 'users', d.id));
          if (u.exists()) arr.push({ id: d.id, ...(u.data() as DocumentData) });
        }
        setIncoming(arr);
      },
    );
    const unsubOutgoing = onSnapshot(
      collection(db, 'users', uid, 'outgoingRequests'),
      async snap => {
        const arr: UserInfo[] = [];
        for (const d of snap.docs) {
          const u = await getDoc(doc(db, 'users', d.id));
          if (u.exists()) arr.push({ id: d.id, ...(u.data() as DocumentData) });
        }
        setOutgoing(arr);
      },
    );
    return () => {
      unsubContacts();
      unsubIncoming();
      unsubOutgoing();
    };
  }, [uid]);

  const refetch = fetchContacts;

  return { contacts, incoming, outgoing, loading, refetch };
}

export function useIncomingCount(): number {
  const [user] = useAuthState(auth);
  const uid = user?.uid;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, 'users', uid, 'incomingRequests'), snap => {
      setCount(snap.size);
    });
    return unsub;
  }, [uid]);
  return count;
}
