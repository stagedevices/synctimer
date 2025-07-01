import { useEffect, useState } from 'react';
import { Card, List, Button, Spin, Modal, Input, Select } from 'antd';
import { motion, useReducedMotion } from 'framer-motion';
import { cardVariants, motion as m } from '../theme/motion';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';

interface Group {
  id: string;
  name: string;
  description?: string;
  managerUid: string;
  visibility: 'invite-only' | 'request-to-join';
}

export function Groups() {
  const [user] = useAuthState(auth);
  const uid = user?.uid;
  const reduce = useReducedMotion() ?? false;
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState({
    name: '',
    description: '',
    visibility: 'invite-only' as 'invite-only' | 'request-to-join',
  });

  useEffect(() => {
    if (!uid) return;
    const q = collection(db, 'users', uid, 'groups');
    const unsub = onSnapshot(q, async snap => {
      const ids = snap.docs.map(d => d.id);
      if (ids.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }
      const qs = query(collection(db, 'groups'), where('__name__', 'in', ids));
      const unsubInner = onSnapshot(qs, s => {
        const data = s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Group,'id'>) }));
        setGroups(data);
        setLoading(false);
      });
      return () => unsubInner();
    });
    return unsub;
  }, [uid]);

  const createGroup = async () => {
    if (!uid) return;
    const { name, description, visibility } = values;
    if (!name.trim()) return;
    setCreating(true);
    try {
      const docRef = await addDoc(collection(db, 'groups'), {
        name: name.trim(),
        description,
        managerUid: uid,
        visibility,
        memberCount: 1,
      });
      await setDoc(doc(db, 'groups', docRef.id, 'members', uid), { role: 'manager' });
      await setDoc(doc(db, 'users', uid, 'groups', docRef.id), { role: 'manager' });
      setModalOpen(false);
      setValues({ name: '', description: '', visibility: 'invite-only' });
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const leaveGroup = async (id: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'groups', id, 'members', uid));
    await deleteDoc(doc(db, 'users', uid, 'groups', id));
  };

  if (!uid || loading) return <Spin />;
  return (
    <div className="page-content">
      <Card title="My Groups" className="glass-card" style={{ margin: '2rem' }}>
      <Button onClick={() => setModalOpen(true)} style={{ marginBottom: 16 }}>
        Create Group
      </Button>
      <motion.div
        variants={{ show: { transition: { staggerChildren: m.durations.stagger } } }}
        initial="show"
        animate="show"
      >
        <List
          dataSource={groups}
          renderItem={g => (
            <motion.div variants={cardVariants(reduce)} key={g.id}>
              <List.Item
                actions={[
                  <Button key="leave" onClick={() => leaveGroup(g.id)}>
                    Leave
                  </Button>,
                ]}
              >
                <List.Item.Meta title={g.name} description={g.description} />
              </List.Item>
            </motion.div>
          )}
        />
      </motion.div>
      <Modal
        title="Create Group"
        open={modalOpen}
        onOk={createGroup}
        confirmLoading={creating}
        onCancel={() => setModalOpen(false)}
      >
        <Input
          placeholder="Group Name"
          style={{ marginBottom: 8 }}
          value={values.name}
          onChange={e => setValues({ ...values, name: e.target.value })}
        />
        <Input.TextArea
          rows={3}
          placeholder="Description"
          style={{ marginBottom: 8 }}
          value={values.description}
          onChange={e => setValues({ ...values, description: e.target.value })}
        />
        <Select
          style={{ width: '100%' }}
          value={values.visibility}
          onChange={v => setValues({ ...values, visibility: v })}
          options={[
            { value: 'invite-only', label: 'Invite Only' },
            { value: 'request-to-join', label: 'Request to Join' },
          ]}
        />
      </Modal>
      </Card>
    </div>
  );
}
