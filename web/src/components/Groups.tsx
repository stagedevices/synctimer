import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Button, Spin, Modal, Input, Select, Avatar } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { motion, useReducedMotion } from 'framer-motion';
import { cardVariants, motion as m } from '../theme/motion';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { toast } from '../lib/toast';
import { SendFilesModal } from './SendFilesModal';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  getDoc,
  updateDoc,
  increment,
  type Timestamp,
} from 'firebase/firestore';

interface Group {
  id: string;
  name: string;
  description?: string;
  managerUid: string;
  visibility: 'invite-only' | 'request-to-join';
  status: 'active' | 'archived';
  role: 'owner' | 'moderator' | 'member';
}

interface Invite {
  id: string;
  groupId: string;
  invitedByUid: string;
  invitedAt: Timestamp;
  message?: string;
  groupName?: string;
  inviterName?: string;
  inviterPronouns?: string;
  inviterPhotoURL?: string | null;
}

export function Groups() {
  const [user] = useAuthState(auth);
  const uid = user?.uid;
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;
  const [groups, setGroups] = useState<Group[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendGroupId, setSendGroupId] = useState<string | null>(null);
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
      const meta = snap.docs.map(d => ({ id: d.id, ...(d.data() as { role?: 'owner' | 'moderator' | 'member' }) }));
      const ids = meta.map(d => d.id);
      if (ids.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }
      const qs = query(collection(db, 'groups'), where('__name__', 'in', ids));
      const unsubInner = onSnapshot(qs, s => {
        const data = s.docs
          .map(d => {
            const role = meta.find(m => m.id === d.id)?.role || 'member';
            return { id: d.id, role, ...(d.data() as Omit<Group, 'id' | 'role'>) };
          })
          .filter(g => g.status !== 'archived');
        setGroups(data);
        setLoading(false);
      });
      return () => unsubInner();
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = collection(db, 'users', uid, 'invites');
    const unsub = onSnapshot(q, async snap => {
      const arr: Invite[] = [];
      for (const d of snap.docs) {
        const data = d.data() as Omit<Invite, 'id'>;
        const groupSnap = await getDoc(doc(db, 'groups', data.groupId));
        const gData = groupSnap.exists() ? (groupSnap.data() as { name?: string }) : {};
        const groupName = gData.name ?? '';
        const inviterSnap = await getDoc(doc(db, 'users', data.invitedByUid, 'profile'));
        const inviterData = inviterSnap.exists()
          ? (inviterSnap.data() as { displayName?: string; pronouns?: string; photoURL?: string })
          : {};
        arr.push({
          id: d.id,
          ...data,
          groupName,
          inviterName: inviterData.displayName || 'Unknown',
          inviterPronouns: inviterData.pronouns || 'they/them',
          inviterPhotoURL: inviterData.photoURL || null,
        });
      }
      setInvites(arr);
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
        status: 'active',
      });
      await setDoc(doc(db, 'groups', docRef.id, 'members', uid), {
        role: 'owner',
        joinedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'users', uid, 'groups', docRef.id), {
        role: 'owner',
        joinedAt: serverTimestamp(),
      });
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
    const g = groups.find(gr => gr.id === id);
    if (g && g.managerUid === uid) {
      toast.error('Only owner can delete the group.');
      return;
    }
    await deleteDoc(doc(db, 'groups', id, 'members', uid));
    await deleteDoc(doc(db, 'users', uid, 'groups', id));
  };

  const acceptInvite = async (inv: Invite) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'invites', inv.id));
      await setDoc(doc(db, 'groups', inv.groupId, 'members', uid), { role: 'member' });
      await setDoc(doc(db, 'users', uid, 'groups', inv.groupId), { role: 'member', joinedAt: serverTimestamp() });
      await updateDoc(doc(db, 'groups', inv.groupId), { memberCount: increment(1) });
      toast.success('Joined group');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const declineInvite = async (inv: Invite) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'invites', inv.id));
      toast.info('Invite declined');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (!uid || loading) return <Spin />;
  return (
    <>
      {invites.length > 0 && (
        <Card title="Group Invites" className="glass-card" style={{ margin: '2rem' }}>
          <List
            dataSource={invites}
            renderItem={inv => (
              <List.Item
                actions={[
                  <Button key="acc" type="primary" onClick={() => acceptInvite(inv)}>
                    Accept
                  </Button>,
                  <Button key="decl" onClick={() => declineInvite(inv)}>
                    Decline
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar src={inv.inviterPhotoURL || undefined} />}
                  title={inv.groupName}
                  description={`Invited by ${inv.inviterName} (${inv.inviterPronouns}) · ${inv.invitedAt.toDate().toLocaleDateString()}`}
                />
              </List.Item>
            )}
          />
        </Card>
      )}
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
              <List.Item>
                <Card
                  className="glass-card group-card"
                  hoverable
                  style={{ width: '100%' }}
                  onClick={() => navigate(`/groups/${g.id}`)}
                  actions={[
                    (g.role === 'owner' || g.role === 'moderator') && (
                      <Button key="send" onClick={e => { e.stopPropagation(); setSendGroupId(g.id); }}>
                        Send Files
                      </Button>
                    ),
                    <Button
                      key="view"
                      type="link"
                      icon={<ArrowRightOutlined />}
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/groups/${g.id}`);
                      }}
                    >
                      Manage
                    </Button>,
                    <Button key="leave" onClick={e => { e.stopPropagation(); leaveGroup(g.id); }}>
                      Leave
                    </Button>,
                  ]}
                >
                  <Card.Meta title={g.name} description={g.description} />
                </Card>
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
      {sendGroupId && (
        <SendFilesModal
          open={!!sendGroupId}
          groupId={sendGroupId}
          onClose={() => setSendGroupId(null)}
        />
      )}
    </Card>
    </>
  );
}
