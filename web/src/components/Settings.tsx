import { useEffect, useState } from 'react';
import { Card, Tag, Input, Button, Spin, message } from 'antd';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

export default function Settings() {
  const [user] = useAuthState(auth);
  const uid = user?.uid;
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const ref = collection(db, 'users', uid, 'tags');
    const unsub = onSnapshot(
      ref,
      snap => {
        setTags(snap.docs.map(d => d.id));
        setLoading(false);
      },
      err => {
        message.error(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [uid]);

  const addTag = async () => {
    const t = newTag.trim();
    if (!uid || !t) return;
    try {
      await setDoc(doc(db, 'users', uid, 'tags', t), { name: t });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      message.error(msg);
    }
    setNewTag('');
  };

  const removeTag = async (t: string) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'tags', t));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      message.error(msg);
    }
  };

  if (!uid || loading) return <Spin />;

  return (
    <Card title="Settings" className="glass-card" style={{ margin: '2rem', borderRadius: '1.5rem' }}>
      {tags.map(t => (
        <Tag key={t} closable onClose={() => removeTag(t)} style={{ marginBottom: 4 }}>
          {t}
        </Tag>
      ))}
      <Input
        value={newTag}
        onChange={e => setNewTag(e.target.value)}
        onPressEnter={addTag}
        placeholder="Add tag"
        style={{ width: 200, marginRight: 8 }}
      />
      <Button onClick={addTag}>Add</Button>
    </Card>
  );
}
