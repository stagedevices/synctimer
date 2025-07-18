import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Button, Spin, Modal, Input, Select } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { motion, useReducedMotion } from 'framer-motion';
import { cardVariants, motion as m } from '../theme/motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { toast } from '../lib/toast';
import { SendFilesModal } from './SendFilesModal';
import { AssignmentModal } from './AssignmentModal';
import {
  collection,
  collectionGroup,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';

interface Group {
  id: string;
  name: string;
  description?: string;
  managerUid: string;
  visibility: 'invite-only' | 'request-to-join';
  status: 'active' | 'archived';
  // 1️⃣ Soft-delete flag on group documents
  isDeleted?: boolean;
  deletedAt?: Timestamp;
  role: 'owner' | 'moderator' | 'member';
}

interface Invite {
  id: string;
  groupId: string;
  inviterUid: string;
  invitedAt: Timestamp;
  groupName: string;
  inviterName: string;
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
  const [assignGroupId, setAssignGroupId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [shakeId, setShakeId] = useState<string | null>(null);
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
          .filter(g => g.status !== 'archived')
          // 4️⃣ Exclude or placeholder-render deleted groups
          .filter(g => {
            if (!g.isDeleted) return true;
            if (!g.deletedAt) return false;
            const fifteen = 15 * 24 * 60 * 60 * 1000;
            return Date.now() - g.deletedAt.toMillis() <= fifteen;
          });
        setGroups(data);
        setLoading(false);
      });
      return () => unsubInner();
    });
    return unsub;
  }, [uid]);

  // 1) Subscribe to pending invites
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collectionGroup(db, 'invites'),
      where('inviteeUid', '==', uid),
      orderBy('invitedAt', 'desc')
    );
    const unsub = onSnapshot(q, async snap => {
      const arr: Invite[] = [];
      for (const d of snap.docs) {
        const data = d.data() as {
          groupId: string;
          inviterUid: string;
          invitedAt: Timestamp;
        };
        const groupId = data.groupId;
        const groupSnap = await getDoc(doc(db, 'groups', groupId));
        const gName = groupSnap.exists()
          ? ((groupSnap.data() as { name?: string }).name || '')
          : '';
        const inviterSnap = await getDoc(doc(db, 'users', data.inviterUid, 'profile'));
        const iName = inviterSnap.exists()
          ? ((inviterSnap.data() as { displayName?: string }).displayName || 'Unknown')
          : 'Unknown';
        arr.push({
          id: d.id,
          groupId,
          inviterUid: data.inviterUid,
          invitedAt: data.invitedAt,
          groupName: gName,
          inviterName: iName,
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
        isDeleted: false,
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

  // 3) Handle Accept / Reject
  const acceptInvite = async (inv: Invite) => {
    if (!uid) return;
    setBusyIds(b => ({ ...b, [inv.id]: true }));
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'groups', inv.groupId, 'members', uid), { role: 'member' });
      batch.delete(doc(db, 'groups', inv.groupId, 'invites', inv.id));
      await batch.commit();
      setInvites(prev => prev.filter(i => i.id !== inv.id));
      toast.success(`Joined “${inv.groupName}”`);
    } catch (e) {
      setBusyIds(b => ({ ...b, [inv.id]: false }));
      setShakeId(inv.id);
      toast.error((e as Error).message);
    }
  };

  const declineInvite = async (inv: Invite) => {
    if (!uid) return;
    setBusyIds(b => ({ ...b, [inv.id]: true }));
    try {
      await deleteDoc(doc(db, 'groups', inv.groupId, 'invites', inv.id));
      setInvites(prev => prev.filter(i => i.id !== inv.id));
      toast.info(`Invite to “${inv.groupName}” rejected`);
    } catch (e) {
      setBusyIds(b => ({ ...b, [inv.id]: false }));
      setShakeId(inv.id);
      toast.error((e as Error).message);
    }
  };

  if (!uid || loading) return <Spin />;
  return (
    <>
      {/* 2) Render Invitations Card */}
      {invites.length > 0 && (
        <Card title="Invitations" className="glass-card" style={{ margin: '2rem' }}>
          <List
            dataSource={invites}
            renderItem={inv => (
              <motion.div
                animate={shakeId === inv.id ? { x: [-8, 8, -8, 0] } : false}
                onAnimationComplete={() => setShakeId(null)}
                key={inv.id}
              >
                <List.Item
                  actions={[
                    <Button
                      key="acc"
                      type="primary"
                      style={{ backgroundColor: '#70C73C', borderColor: '#70C73C' }}
                      disabled={busyIds[inv.id]}
                      onClick={() => acceptInvite(inv)}
                    >
                      Accept
                    </Button>,
                    <Button
                      key="decl"
                      danger
                      disabled={busyIds[inv.id]}
                      onClick={() => declineInvite(inv)}
                    >
                      Reject
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={inv.groupName}
                    description={`Invited by ${inv.inviterName} · ${formatDistanceToNow(inv.invitedAt.toDate(), { addSuffix: true })}`}
                  />
                </List.Item>
              </motion.div>
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
                {g.isDeleted ? (
                  // 4️⃣ Exclude or placeholder-render deleted groups
                  <Card className="glass-card group-card" style={{ width: '100%', opacity: 0.5 }}>
                    <Card.Meta
                      title="Group Deleted"
                      description="This group was deleted. If you need help, visit support."
                    />
                  </Card>
                ) : (
                  <Card
                    className="glass-card group-card"
                    hoverable
                    style={{ width: '100%' }}
                    onClick={() => navigate(`/groups/${g.id}`)}
                    actions={[
                      (g.role === 'owner' || g.role === 'moderator') && (
                        <Button key="send" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setSendGroupId(g.id); }}>
                          Send Files
                        </Button>
                      ),
                      (g.role === 'owner' || g.role === 'moderator') && (
                        <Button key="assign" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setAssignGroupId(g.id); }}>
                          Assign to Group ➔
                        </Button>
                      ),
                      <Button
                        key="view"
                        type="link"
                        icon={<ArrowRightOutlined />}
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          navigate(`/groups/${g.id}`);
                        }}
                      >
                        Manage
                      </Button>,
                      <Button key="leave" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); leaveGroup(g.id); }}>
                        Leave
                      </Button>,
                    ]}
                  >
                    <Card.Meta title={g.name} description={g.description} />
                  </Card>
                )}
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, name: e.target.value })}
        />
        <Input.TextArea
          rows={3}
          placeholder="Description"
          style={{ marginBottom: 8 }}
          value={values.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setValues({ ...values, description: e.target.value })}
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
      {assignGroupId && (
        <AssignmentModal
          open={!!assignGroupId}
          onClose={() => setAssignGroupId(null)}
          context="groups"
          entityId={assignGroupId}
        />
      )}
    </Card>
    </>
  );
}
