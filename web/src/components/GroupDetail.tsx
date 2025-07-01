import { useEffect, useState, useRef } from 'react';
import type { JSX } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tabs,
  List,
  Avatar,
  Button,
  Input,
  Tag,
  Spin,
} from 'antd';
import { motion, useReducedMotion } from 'framer-motion';
import { cardVariants, motion as m } from '../theme/motion';
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useUserSearch } from '../hooks/useUserSearch';
import { toast } from '../lib/toast';
import { shake } from '../lib/animations';

interface Group {
  id: string;
  name: string;
  description?: string;
  managerUid: string;
  visibility: 'invite-only' | 'request-to-join';
  memberCount: number;
  status: 'active' | 'archived';
  archivedAt?: Timestamp;
}

interface MemberInfo {
  id: string;
  role: 'owner' | 'moderator' | 'member';
  joinedAt: Timestamp;
  displayName?: string;
  photoURL?: string;
  handle?: string;
}

interface InviteInfo {
  id: string;
  type: 'email' | 'username';
  value: string;
  invitedBy: string;
  createdAt: Timestamp;
  status: 'pending' | 'accepted' | 'declined';
}

export function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;
  const uid = auth.currentUser?.uid;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [invites, setInvites] = useState<InviteInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [inviteTerm, setInviteTerm] = useState('');
  const results = useUserSearch(inviteTerm);

  const sendBtnRef = useRef<HTMLButtonElement>(null);

  const isOwner = uid && uid === group?.managerUid;
  const myRole = members.find(m => m.id === uid)?.role;
  const isMod = myRole === 'moderator' || isOwner;

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    const gRef = doc(db, 'groups', groupId);
    const unsubGroup = onSnapshot(gRef, snap => {
      if (snap.exists()) {
        setGroup({ id: snap.id, ...(snap.data() as Omit<Group, 'id'>) });
      } else {
        navigate('/groups');
      }
    });
    const mRef = collection(db, 'groups', groupId, 'members');
    const unsubMembers = onSnapshot(mRef, async snap => {
      const arr: MemberInfo[] = [];
      for (const d of snap.docs) {
        const u = await getDoc(doc(db, 'users', d.id));
        const data = u.exists() ? u.data() : {};
        arr.push({ id: d.id, ...(d.data() as Omit<MemberInfo, 'id' | 'displayName' | 'photoURL' | 'handle'>), ...(data as any) });
      }
      arr.sort((a,b)=>a.displayName?.localeCompare(b.displayName||'')||0);
      setMembers(arr);
    });
    const iRef = collection(db, 'groups', groupId, 'invites');
    const unsubInvites = onSnapshot(iRef, snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<InviteInfo,'id'>) }));
      setInvites(arr);
      setLoading(false);
    });
    return () => {
      unsubGroup();
      unsubMembers();
      unsubInvites();
    };
  }, [groupId, navigate]);

  const promote = async (id: string, role: 'moderator' | 'member') => {
    if (!groupId) return;
    await setDoc(doc(db, 'groups', groupId, 'members', id), { role }, { merge: true });
    await setDoc(doc(db, 'users', id, 'groups', groupId), { role }, { merge: true });
  };

  const transferOwnership = async (id: string) => {
    if (!groupId || !isOwner || !uid) return;
    await updateDoc(doc(db, 'groups', groupId), { managerUid: id });
    await setDoc(doc(db, 'groups', groupId, 'members', id), { role: 'owner' }, { merge: true });
    await setDoc(doc(db, 'users', id, 'groups', groupId), { role: 'owner' }, { merge: true });
    await setDoc(doc(db, 'groups', groupId, 'members', uid), { role: 'member' }, { merge: true });
    await setDoc(doc(db, 'users', uid, 'groups', groupId), { role: 'member' }, { merge: true });
    toast.success('Ownership transferred');
  };

  const removeMember = async (id: string) => {
    if (!groupId) return;
    await deleteDoc(doc(db, 'groups', groupId, 'members', id));
    await deleteDoc(doc(db, 'users', id, 'groups', groupId));
  };

  const sendInvite = async () => {
    if (!groupId || !uid || !inviteTerm.trim()) return;
    const value = inviteTerm.trim();
    const type = value.includes('@') ? 'email' : 'username';
    try {
      await addDoc(collection(db, 'groups', groupId, 'invites'), {
        type,
        value,
        invitedBy: uid,
        createdAt: serverTimestamp(),
        status: 'pending',
      });
      toast.success(`Invite sent to ${value}`);
      setInviteTerm('');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const cancelInvite = async (id: string) => {
    if (!groupId) return;
    await updateDoc(doc(db, 'groups', groupId, 'invites', id), { status: 'declined' });
    toast.info('Invite canceled');
  };

  const approveRequest = async (invite: InviteInfo) => {
    if (!groupId) return;
    const memberId = invite.value;
    await setDoc(doc(db, 'groups', groupId, 'members', memberId), {
      role: 'member',
      joinedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'users', memberId, 'groups', groupId), {
      role: 'member',
      joinedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'groups', groupId, 'invites', invite.id), { status: 'accepted' });
    toast.success('Member added');
  };

  const declineRequest = async (invite: InviteInfo) => {
    if (!groupId) return;
    await updateDoc(doc(db, 'groups', groupId, 'invites', invite.id), { status: 'declined' });
    toast.info('Request declined');
  };

  const archiveGroup = async () => {
    if (!groupId) return;
    if (!isOwner) {
      shake(sendBtnRef.current);
      toast.error('Only owner can delete the group.');
      return;
    }
    await updateDoc(doc(db, 'groups', groupId), {
      status: 'archived',
      archivedAt: serverTimestamp(),
    });
    toast.success('Group archived');
    navigate('/groups');
  };

  if (loading || !group) return <Spin />;

  const filteredMembers = members.filter(m => {
    const term = search.toLowerCase();
    return (
      m.displayName?.toLowerCase().includes(term) ||
      m.handle?.toLowerCase().includes(term) ||
      m.id.includes(term)
    );
  });

  const pendingInvites = invites.filter(i => i.status === 'pending' && !(i.type === 'username' && i.value === i.invitedBy));
  const joinRequests = invites.filter(i => i.status === 'pending' && i.type === 'username' && i.value === i.invitedBy);

  const membersTab = (
    <motion.div
      variants={{ show: { transition: { staggerChildren: m.durations.stagger } } }}
      initial="show"
      animate="show"
    >
      <Input
        placeholder="Search members"
        style={{ marginBottom: 16 }}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <List
        dataSource={filteredMembers}
        renderItem={memb => {
          const actions: JSX.Element[] = [];
          if (isOwner && memb.id !== uid) {
            actions.push(
              <Button key="transfer" onClick={() => transferOwnership(memb.id)}>
                Transfer Ownership
              </Button>
            );
          }
          if (isMod && memb.id !== group!.managerUid) {
            if (memb.role === 'member') {
              actions.push(
                <Button key="promote" onClick={() => promote(memb.id, 'moderator')}>
                  Promote
                </Button>
              );
            } else if (memb.role === 'moderator') {
              actions.push(
                <Button key="demote" onClick={() => promote(memb.id, 'member')}>
                  Demote
                </Button>
              );
            }
            actions.push(
              <Button key="remove" danger onClick={() => removeMember(memb.id)}>
                Remove
              </Button>
            );
          }
          return (
            <motion.div variants={cardVariants(reduce)} key={memb.id}>
              <List.Item>
                <Card className="glass-card" style={{ width: '100%' }} actions={actions}>
                  <Card.Meta
                    avatar={<Avatar src={memb.photoURL} />}
                    title={memb.displayName || memb.id}
                    description={
                      <span>
                        @{memb.handle || ''}{' '}
                        <Tag color={memb.role === 'owner' ? 'gold' : memb.role === 'moderator' ? 'blue' : undefined}>{memb.role}</Tag>
                      </span>
                    }
                  />
                </Card>
              </List.Item>
            </motion.div>
          );
        }}
      />
    </motion.div>
  );

  const invitesTab = (
    <motion.div
      variants={{ show: { transition: { staggerChildren: m.durations.stagger } } }}
      initial="show"
      animate="show"
    >
      <Input
        placeholder="Email or username"
        style={{ marginBottom: 8 }}
        value={inviteTerm}
        onChange={e => setInviteTerm(e.target.value)}
      />
      {inviteTerm && results.length > 0 && (
        <List
          style={{ marginBottom: 8 }}
          dataSource={results}
          bordered
          renderItem={u => (
            <List.Item onClick={() => { setInviteTerm(u.handle || u.email || ''); }} style={{ cursor: 'pointer' }}>
              <List.Item.Meta avatar={<Avatar src={u.photoURL} />} title={u.displayName || u.email} description={`@${u.handle || ''}`} />
            </List.Item>
          )}
        />
      )}
      <Button type="primary" onClick={sendInvite} ref={sendBtnRef} style={{ marginBottom: 16 }}>
        Send
      </Button>
      <h4>Pending Invites</h4>
      <List
        dataSource={pendingInvites}
        renderItem={inv => (
          <List.Item actions={[<Button key="cancel" onClick={() => cancelInvite(inv.id)}>Cancel</Button>]}> {inv.value} </List.Item>
        )}
      />
      {group.visibility === 'request-to-join' && (
        <>
          <h4 style={{ marginTop: 16 }}>Join Requests</h4>
          <List
            dataSource={joinRequests}
            renderItem={inv => (
              <List.Item
                actions={[
                  <Button key="app" type="primary" onClick={() => approveRequest(inv)}>Approve</Button>,
                  <Button key="decl" danger onClick={() => declineRequest(inv)}>Decline</Button>,
                ]}
              >
                {inv.value}
              </List.Item>
            )}
          />
        </>
      )}
    </motion.div>
  );

  const settingsTab = (
    <motion.div
      variants={{ show: { transition: { staggerChildren: m.durations.stagger } } }}
      initial="show"
      animate="show"
    >
      <Input
        style={{ marginBottom: 8 }}
        value={group.name}
        onChange={e => setGroup(g => g ? { ...g, name: e.target.value } : g)}
        onBlur={async e => groupId && updateDoc(doc(db, 'groups', groupId), { name: e.target.value })}
      />
      <Input.TextArea
        rows={3}
        style={{ marginBottom: 8 }}
        value={group.description}
        onChange={e => setGroup(g => g ? { ...g, description: e.target.value } : g)}
        onBlur={async e => groupId && updateDoc(doc(db, 'groups', groupId), { description: e.target.value })}
      />
      <select
        value={group.visibility}
        onChange={async e => {
          const vis = e.target.value as 'invite-only' | 'request-to-join';
          setGroup(g => g ? { ...g, visibility: vis } : g);
          if (groupId) await updateDoc(doc(db, 'groups', groupId), { visibility: vis });
        }}
        style={{ marginBottom: 16 }}
      >
        <option value="invite-only">Invite Only</option>
        <option value="request-to-join">Request to Join</option>
      </select>
      <Input.TextArea rows={3} placeholder="Announcement" style={{ marginBottom: 8 }} />
      <Button style={{ marginBottom: 16 }}>Post</Button>
      {isOwner && (
        <Button danger onClick={archiveGroup}>Delete Group</Button>
      )}
    </motion.div>
  );

  const items = [
    { key: 'members', label: 'Members', children: membersTab },
    { key: 'invites', label: 'Invitations', children: invitesTab },
    { key: 'settings', label: 'Settings', children: settingsTab },
  ];

  return (
    <Card
      title={group.name}
      className="glass-card"
      style={{ margin: '2rem' }}
      extra={<Button onClick={() => navigate('/groups')}>Back</Button>}
    >
      <Tabs
        items={items}
        destroyInactiveTabPane
        animated={{ inkBar: true, tabPane: true }}
      />
    </Card>
  );
}

