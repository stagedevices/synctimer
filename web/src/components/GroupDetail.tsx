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
  Tag,
  Spin,
  Switch,
  Modal,
} from 'antd';
import { motion, useReducedMotion } from 'framer-motion';
import { cardVariants, motion as m } from '../theme/motion';
import {
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  collection,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { fetchProfile } from '../lib/profile';
import { useUserSearch } from '../hooks/useUserSearch';
import type { UserInfo } from '../hooks/useFriends';
import { toast } from '../lib/toast';
import { SendFileModal } from './SendFileModal';

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
  authorPhotoURL?: string;
}


export function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const reduce = useReducedMotion() ?? false;
  const uid = auth.currentUser?.uid;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [inviteTerm, setInviteTerm] = useState('');
  const results = useUserSearch(inviteTerm);
  const [inviting, setInviting] = useState<string | null>(null);
  const [sendModal, setSendModal] = useState(false);
  const [announcementHtml, setAnnouncementHtml] = useState('');
  const [deleteLatch, setDeleteLatch] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        const uRoot = await getDoc(doc(db, 'users', d.id));
        const handleData = uRoot.exists() ? (uRoot.data() as { handle?: string }) : {};
        const profile = await fetchProfile(d.id);
        const tagSnap = await getDocs(collection(db, 'users', d.id, 'tags'));
        const tags = tagSnap.docs.map(t => t.id);
        arr.push({
          id: d.id,
          ...(d.data() as Omit<MemberInfo, 'id' | 'displayName' | 'photoURL' | 'handle' | 'pronouns' | 'tags'>),
          ...profile,
          ...handleData,
          tags,
        });
      }
      arr.sort((a,b)=>a.displayName?.localeCompare(b.displayName||'')||0);
      setMembers(arr);
    });
    const aRef = query(
      collection(db, 'groups', groupId, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsubAnnouncements = onSnapshot(aRef, async snap => {
      const arr: Announcement[] = [];
      for (const d of snap.docs) {
        const data = d.data() as Omit<Announcement, 'id' | 'authorName' | 'authorPronouns' | 'authorPhotoURL'>;
        const prof = await fetchProfile(data.authorUid);
        arr.push({
          id: d.id,
          ...data,
          authorName: prof.displayName || 'Unknown',
          authorPronouns: prof.pronouns || 'they/them',
          authorPhotoURL: prof.photoURL,
        });
      }
      setAnnouncements(arr);
    });
    setLoading(false);
    return () => {
      unsubGroup();
      unsubMembers();
      unsubAnnouncements();
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

  const inviteUser = async (userInfo: UserInfo) => {
    if (!groupId || !uid) return;
    setInviting(userInfo.id);
    try {
      await addDoc(collection(db, 'users', userInfo.id, 'invites'), {
        groupId,
        invitedByUid: uid,
        invitedAt: serverTimestamp(),
      });
      toast.success(`Invitation sent to ${userInfo.displayName || userInfo.email}`);
    } catch (e) {
      toast.error(`Could not send invite: ${(e as Error).message}`);
    } finally {
      setInviting(null);
    }
  };

  const postAnnouncement = async () => {
    if (!groupId || !uid || !announcementHtml.trim()) return;
    try {
      await addDoc(collection(db, 'groups', groupId, 'announcements'), {
        authorUid: uid,
        contentHtml: announcementHtml,
        createdAt: serverTimestamp(),
      });
      setAnnouncementHtml('');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };


  const archiveGroup = async () => {
    if (!groupId) return;
    if (!isOwner) {
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
        placeholder="Add users by email or username…"
        style={{ marginBottom: 8 }}
        value={inviteTerm}
        onChange={e => setInviteTerm(e.target.value)}
      />
      {inviteTerm && (
        <List
          style={{ marginBottom: 8 }}
          dataSource={results}
          renderItem={u => (
            <List.Item
              actions={[
                <Button
                  key="inv"
                  type="primary"
                  loading={inviting === u.id}
                  onClick={() => inviteUser(u)}
                >
                  Invite
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar src={u.photoURL} />}
                title={u.displayName || u.email}
                description={`@${u.handle || ''}`}
              />
            </List.Item>
          )}
        />
      )}
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
          <div style={{ marginBottom: 8 }}>
            <Button onClick={() => document.execCommand('bold')} style={{ marginRight: 4 }}>
              <strong>B</strong>
            </Button>
            <Button onClick={() => document.execCommand('italic')} style={{ marginRight: 4 }}>
              <em>I</em>
            </Button>
            <Button
              onClick={() => {
                const url = prompt('Enter link URL');
                if (url) document.execCommand('createLink', false, url);
              }}
            >
              Link
            </Button>
          </div>
          <div
            contentEditable
            style={{ border: '1px solid #ccc', minHeight: 100, padding: 8, marginBottom: 8 }}
            onInput={e => setAnnouncementHtml((e.target as HTMLElement).innerHTML)}
            dangerouslySetInnerHTML={{ __html: announcementHtml }}
          />
          <Button type="primary" onClick={postAnnouncement}>
            Post Announcement
          </Button>
        </div>
      )}
      <List
        dataSource={announcements}
        renderItem={a => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar src={a.authorPhotoURL} />}
              title={`${a.authorName} (${a.authorPronouns})`}
              description={a.createdAt.toDate().toLocaleString()}
            />
            <div style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: a.contentHtml }} />
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
        <>
          <div style={{ marginBottom: 8 }}>
            <Switch checked={deleteLatch} onChange={setDeleteLatch} /> Safety Latch
          </div>
          <Button danger disabled={!deleteLatch} onClick={() => setConfirmDelete(true)}>
            Delete Group
          </Button>
          <Modal
            open={confirmDelete}
            onOk={archiveGroup}
            onCancel={() => setConfirmDelete(false)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            Deleting will remove this group forever. Consider transferring ownership or removing yourself as a member instead.
          </Modal>
        </>
      )}
    </motion.div>
  );

  const items = [
    { key: 'members', label: 'Members', children: membersTab },
    { key: 'announcements', label: 'Announcements', children: announcementsTab },
    ...(isMod ? [{ key: 'invites', label: 'Invitations', children: invitesTab }] : []),
    ...(isMod ? [{ key: 'settings', label: 'Settings', children: settingsTab }] : []),
  ];

  const requestedTab = params.get('tab') || 'members';
  const allowedKeys = items.map(i => i.key);
  const activeKey = allowedKeys.includes(requestedTab) ? requestedTab : 'members';
  if (requestedTab !== activeKey) {
    setParams({ tab: 'members' }, { replace: true });
  }

  return (
    <Card
      title={group.name}
      className="glass-card"
      style={{ margin: '2rem' }}
      extra={
        <div style={{ display: 'flex', gap: 8 }}>
          {isMod && (
            <Button onClick={() => setSendModal(true)}>Send Files</Button>
          )}
          <Button onClick={() => navigate('/groups')}>Back</Button>
        </div>
      }
    >
      <Tabs
        items={items}
        activeKey={activeKey}
        onChange={key => setParams({ tab: key })}
        destroyInactiveTabPane
        animated={{ inkBar: true, tabPane: true }}
      />
      {sendModal && (
        <SendFileModal groupId={groupId!} onClose={() => setSendModal(false)} />
      )}
    </Card>
  );
}

