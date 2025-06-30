import { useEffect, useState } from 'react';
import { Card, Tag, Input, Button, Spin, message } from 'antd';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

export default function Settings() {
  const [user] = useAuthState(auth);
  const uid = user?.uid;
  const [ensembles, setEnsembles] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, 'users', uid, 'profile');
    const unsub = onSnapshot(
      ref,
      snap => {
        const data = snap.exists() ? snap.data() as { ensembles?: string[] } : {};
        setEnsembles(data.ensembles || []);
        setLoading(false);
      },
      err => {
        message.error(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [uid]);

  const addTag = () => {
    const t = newTag.trim();
    if (t && !ensembles.includes(t)) setEnsembles([...ensembles, t]);
    setNewTag('');
  };

  const removeTag = (t: string) => setEnsembles(ensembles.filter(e => e !== t));

  const save = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid, 'profile'), { ensembles });
      message.success('Saved');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!uid || loading) return <Spin tip="Loading settings…" />;

  return (
    <Card title="Settings" className="glass-card" style={{ margin: '2rem', borderRadius: '1.5rem' }}>
      {ensembles.map(t => (
        <Tag key={t} closable onClose={() => removeTag(t)} style={{ marginBottom: 4 }}>
          {t}
        </Tag>
      ))}
      <Input
        value={newTag}
        onChange={e => setNewTag(e.target.value)}
        onPressEnter={addTag}
        placeholder="Add ensemble"
        style={{ width: 200, marginRight: 8 }}
      />
      <Button onClick={addTag}>Add</Button>
      <div style={{ marginTop: 8 }}>
        <Button type="primary" onClick={save} loading={saving}>
          Save Ensembles
        </Button>
      </div>
    </Card>
  );
}
