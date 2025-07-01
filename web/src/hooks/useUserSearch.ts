import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  limit,
  orderBy,
  startAt,
  endAt,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

import type { UserInfo } from './useFriends';

export function useUserSearch(term: string): UserInfo[] {
  const [results, setResults] = useState<UserInfo[]>([]);

  useEffect(() => {
    if (!term) {
      setResults([]);
      return;
    }
    const t = term.toLowerCase();
    (async () => {
      const arr: UserInfo[] = [];
      const byHandle = query(
        collection(db, 'users'),
        orderBy('handle'),
        startAt(t),
        endAt(t + '\uf8ff'),
        limit(5),
      );
      const handleSnap = await getDocs(byHandle);
      handleSnap.forEach(d => arr.push({ id: d.id, ...(d.data() as DocumentData) }));

      if (term.includes('@')) {
        const byEmail = query(
          collection(db, 'users'),
          orderBy('email'),
          startAt(t),
          endAt(t + '\uf8ff'),
          limit(5),
        );
        const emailSnap = await getDocs(byEmail);
        emailSnap.forEach(d => {
          if (!arr.some(u => u.id === d.id))
            arr.push({ id: d.id, ...(d.data() as DocumentData) });
        });
      }
      setResults(arr);
    })();
  }, [term]);

  return results;
}
