import React, { useEffect, useState } from 'react';
import { Card, List, Spin } from 'antd';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

interface FileDoc {
  id: string;
  title: string;
  createdAt: { seconds: number };
}

export function MyFiles() {
  const [user] = useAuthState(auth);
  const [files, setFiles] = useState<FileDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const col = collection(db, 'users', user.uid, 'files');
    const q   = query(col, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setFiles(docs);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  if (!user) return <Spin tip="Signing in…" />;
  return (
    <Card title="My Files" style={{ margin: '2rem', borderRadius: '1.5rem' }}>
      {loading ? (
        <Spin tip="Loading files…" />
      ) : (
        <List
          dataSource={files}
          renderItem={f => (
            <List.Item>
              <List.Item.Meta
                title={f.title}
                description={new Date(f.createdAt.seconds * 1e3).toLocaleString()}
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
