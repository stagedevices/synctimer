import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  Tabs,
  List,
  Avatar,
  Button,
  Input,
  Switch,
  Modal,
  Tag,
  Spin,
} from 'antd';
import { motion, useReducedMotion } from 'framer-motion';
import { cardVariants, motion as m } from '../theme/motion';
import {
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  collection,
  query,
  orderBy,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { toast } from '../lib/toast';
import { SendFilesModal } from './SendFilesModal';

interface Group {
  id: string;
  name: string;
  description?: string;
  managerUid: string;
  visibility: 'invite-only' | 'request-to-join';
  memberCount: number;
  status: 'active' | 'archived';
  archivedAt?: Timestamp;
  // 1️⃣ Soft-delete flag on group documents
  isDeleted?: boolean;
  deletedAt?: Timestamp;
}

interface MemberInfo {
  id: string;
  role: 'owner' | 'moderator' | 'member';
  joinedAt: Timestamp;
  displayName?: string;
  photoURL?: string;
  handle?: string;
  pronouns?: string;
  tags?: string[];
}

interface Announcement {
  id: string;
  authorUid: string;
  contentHtml: string;
  createdAt: Timestamp;
  authorName?: string;
  authorPronouns?: string;
  authorPhotoURL?: string | null;
}

interface SentInvite {
  id: string;
  invitedBy: string;
  invitedAt?: Timestamp;
  targetUid: string;
}


export function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;
  const uid = auth.currentUser?.uid;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [inviteTerm, setInviteTerm] = useState('');
  const [inviting, setInviting] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [announceContent, setAnnounceContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('members');
  const [safetyOn, setSafetyOn] = useState(false);

  const isOwner = uid && uid === group?.managerUid;
  const myRole = members.find(m => m.id === uid)?.role;
  const isMod = myRole === 'moderator' || isOwner;

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    const gRef = doc(db, 'groups', groupId);
    const unsubGroup = onSnapshot(gRef, snap => {
      if (snap.exists()) {
        const data = snap.data() as Omit<Group, 'id'>;
        setGroup({ id: snap.id, ...data });
        // 3️⃣ Membership list and owner inclusion
        getDoc(doc(db, 'groups', groupId, 'members', data.managerUid)).then(ms => {
          if (!ms.exists()) {
            setDoc(doc(db, 'groups', groupId, 'members', data.managerUid), {
              role: 'owner',
              joinedAt: serverTimestamp(),
            });
          }
        });
      } else {
        navigate('/groups');
      }
    });
    const mRef = collection(db, 'groups', groupId, 'members');
    const unsubMembers = onSnapshot(mRef, async snap => {
      const arr: MemberInfo[] = [];
      for (const d of snap.docs) {
        const u = await getDoc(doc(db, 'users', d.id, 'profile'));
        const data = u.exists()
          ? (u.data() as { displayName?: string; photoURL?: string; handle?: string; pronouns?: string })
          : {};
        const tagSnap = await getDocs(collection(db, 'users', d.id, 'tags'));
        const tags = tagSnap.docs.map(t => t.id);
        arr.push({
          id: d.id,
          ...(d.data() as Omit<MemberInfo, 'id' | 'displayName' | 'photoURL' | 'handle' | 'pronouns' | 'tags'>),
          ...data,
          tags,
        });
      }
      arr.sort((a,b)=>a.displayName?.localeCompare(b.displayName||'')||0);
      setMembers(arr);
    });
    setLoading(false);
    return () => {
      unsubGroup();
      unsubMembers();
    };
  }, [groupId, navigate]);

  useEffect(() => {
    if (!groupId) return;
    const q = query(collection(db, 'groups', groupId, 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, async snap => {
      const arr: Announcement[] = [];
      for (const d of snap.docs) {
        const data = d.data() as Omit<Announcement, 'id' | 'authorName' | 'authorPronouns' | 'authorPhotoURL'>;
        const profSnap = await getDoc(doc(db, 'users', data.authorUid, 'profile'));
        const p = profSnap.exists() ? (profSnap.data() as { displayName?: string; pronouns?: string; photoURL?: string }) : {};
        arr.push({
          id: d.id,
          ...data,
          authorName: p.displayName || 'Unknown',
          authorPronouns: p.pronouns || 'they/them',
          authorPhotoURL: p.photoURL || null,
        });
      }
      setAnnouncements(arr);
    });
    return unsub;
  }, [groupId]);

  // Fetch pending invites
  useEffect(() => {
    if (!groupId) return;
    const q = collection(db, 'groups', groupId, 'invites');
    const unsub = onSnapshot(q, snap => {
      const arr: SentInvite[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<SentInvite, 'id'>),
      }));
      setSentInvites(arr);
    });
    return unsub;
  }, [groupId]);

  useEffect(() => {
    const tab = searchParams.get('tab') || 'members';
    const allowed = ['members', 'announcements'];
    if (isMod) allowed.push('invites', 'settings');
    if (!allowed.includes(tab)) {
      setActiveTab('members');
      setSearchParams({ tab: 'members' }, { replace: true });
    } else {
      setActiveTab(tab);
    }
  }, [searchParams, isMod, setSearchParams]);

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

  const inviteUser = async () => {
    if (!groupId || !uid || !inviteTerm.trim()) return;
    const handle = inviteTerm.trim().replace(/^@+/, '').toLowerCase();
    setInviting(true);
    try {
      // Lookup target UID
      const snap = await getDoc(doc(db, 'usernames', handle));
      if (!snap.exists()) {
        toast.error(`User '${handle}' not found.`);
        return;
      }
      const targetUid = (snap.data() as { uid: string }).uid;
      // Send invite to Firestore
      await setDoc(doc(db, 'groups', groupId, 'invites', targetUid), {
        invitedBy: uid,
        invitedAt: serverTimestamp(),
        targetUid,
      });
      toast.success(`Invitation sent to @${handle}`);
      setInviteTerm('');
    } catch (e) {
      toast.error(`Could not send invite: ${(e as Error).message}`);
    } finally {
      setInviting(false);
    }
  };

  const revokeInvite = async (inviteeUid: string) => {
    if (!groupId) return;
    await deleteDoc(doc(db, 'groups', groupId, 'invites', inviteeUid));
  };

  const postAnnouncement = async () => {
    if (!groupId || !uid || !announceContent.trim()) return;
    setPosting(true);
    try {
      await addDoc(collection(db, 'groups', groupId, 'announcements'), {
        authorUid: uid,
        contentHtml: announceContent,
        createdAt: serverTimestamp(),
      });
      setAnnounceContent('');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPosting(false);
    }
  };


  // 1️⃣ Soft-delete flag on group documents
  const archiveGroup = async () => {
    if (!groupId) return;
    if (!isOwner) {
      toast.error('Only owner can delete the group.');
      return;
    }
    await updateDoc(doc(db, 'groups', groupId), {
      isDeleted: true,
      deletedAt: serverTimestamp(),
    });
    toast.success('Group deleted');
    navigate('/groups');
  };

  const confirmDelete = () => {
    if (!safetyOn) {
      toast.warning('Flip the safety latch first');
      return;
    }
    Modal.confirm({
      title: 'Delete Group?',
      content:
        'Deleting will remove this group forever. Consider transferring ownership or removing yourself as a member instead.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: archiveGroup,
    });
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
                    title={
                      <span>
                        {memb.displayName || memb.id}{' '}
                        <Tag color={memb.role === 'owner' ? 'gold' : memb.role === 'moderator' ? 'blue' : undefined}>{memb.role}</Tag>
                      </span>
                    }
                    description={
                      <div>
                        <div>{memb.pronouns || 'they/them'}</div>
                        <div>
                          {memb.tags?.map(t => (
                            <Tag key={t} style={{ marginRight: 4 }}>#{t}</Tag>
                          ))}
                        </div>
                      </div>
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
        placeholder="Invite by handle…"
        style={{ marginBottom: 8 }}
        value={inviteTerm}
        onChange={e => setInviteTerm(e.target.value)}
        onPressEnter={inviteUser}
        disabled={inviting}
      />
      <Button type="primary" onClick={inviteUser} loading={inviting} style={{ marginBottom: 16 }}>
        Invite
      </Button>
      <List
        header="Pending Invites"
        dataSource={sentInvites}
        renderItem={inv => (
          <List.Item
            actions={[<Button key="rev" danger onClick={() => revokeInvite(inv.id)}>Revoke</Button>]}
          >
            <List.Item.Meta
              title={`@${inv.id}`}
              description={inv.invitedAt?.toDate().toLocaleDateString()}
            />
          </List.Item>
        )}
      />
    </motion.div>
  );

  const announcementsTab = (
    <motion.div
      variants={{ show: { transition: { staggerChildren: m.durations.stagger } } }}
      initial="show"
      animate="show"
    >
      {isMod && (
        <div style={{ marginBottom: 16 }}>
          <Input.TextArea
            rows={4}
            placeholder="Write an announcement…"
            value={announceContent}
            onChange={e => setAnnounceContent(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <Button type="primary" onClick={postAnnouncement} loading={posting}>
            Post Announcement
          </Button>
        </div>
      )}
      <List
        dataSource={announcements}
        renderItem={ann => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar src={ann.authorPhotoURL || undefined} />}
              title={`${ann.authorName} (${ann.authorPronouns})`}
              description={ann.createdAt.toDate().toLocaleString()}
            />
            <div
              dangerouslySetInnerHTML={{ __html: ann.contentHtml }}
              style={{ marginTop: 8 }}
            />
          </List.Item>
        )}
      />
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
      {isOwner && (
        <div style={{ marginTop: 16 }}>
          <Switch checked={safetyOn} onChange={setSafetyOn} style={{ marginRight: 8 }} />
          Safety Latch
          <div style={{ marginTop: 8 }}>
            <Button danger disabled={!safetyOn} onClick={confirmDelete}>
              Delete Group
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );

  const items = [
    { key: 'members', label: 'Members', children: membersTab },
    { key: 'announcements', label: 'Announcements', children: announcementsTab },
    ...(isMod ? [{ key: 'invites', label: 'Invitations', children: invitesTab }] : []),
    ...(isMod ? [{ key: 'settings', label: 'Settings', children: settingsTab }] : []),
  ];

  return (
    <Card
      title={group.name}
      className="glass-card"
      style={{ margin: '2rem' }}
      extra={
        <>
          {isMod && (
            <Button style={{ marginRight: 8 }} onClick={() => setSendOpen(true)}>
              Send Files
            </Button>
          )}
          <Button onClick={() => navigate('/groups')}>Back</Button>
        </>
      }
    >
      <Tabs
        items={items}
        destroyInactiveTabPane
        animated={{ inkBar: true, tabPane: true }}
        activeKey={activeTab}
        onChange={key => {
          setActiveTab(key);
          setSearchParams({ tab: key }, { replace: true });
        }}
      />
      {isMod && (
        <SendFilesModal open={sendOpen} onClose={() => setSendOpen(false)} groupId={groupId!} />
      )}
    </Card>
  );
}

