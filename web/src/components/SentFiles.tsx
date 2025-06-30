import React, { useEffect, useState } from 'react';
import { List, Card, Button, Spin } from 'antd';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';

export function SentFiles() {
  const [files, setFiles] = useState<Array<{ id: string; title: string; createdAt: Date }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(
      collection(db, 'users', uid, 'sent'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({
        id: d.id,
        title: d.data().title,
        createdAt: d.data().createdAt.toDate(),
      }));
      setFiles(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleResend = async () => {
    // Optional: re-trigger parseUpload or sharing logic
  };

  const handleDelete = async (id: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'sent', id));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem' }}>Sent Files</h1>
      {loading ? (
        <Spin size="large" />
      ) : files.length === 0 ? (
        <p>No sent files yet — send one from Validate page.</p>
      ) : (
        <List
          grid={{ gutter: 16, column: 2 }}
          dataSource={files}
          renderItem={file => (
            <List.Item key={file.id}>
              <Card title={file.title}>
                <p>Sent at: {format(file.createdAt, 'PPPpp')}</p>
                <Button type="link" onClick={handleResend}>
                  Resend
                </Button>
                <Button danger onClick={() => handleDelete(file.id)}>
                  Delete
                </Button>
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
