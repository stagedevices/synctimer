import { useState, type ChangeEvent } from 'react';
import {
  Card,
  List,
  Tabs,
  Button,
  Modal,
  Input,
  Avatar,
  Badge,
  message,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { AssignmentModal } from './AssignmentModal';
import { motion, useReducedMotion } from 'framer-motion';
import { cardVariants, motion as m } from '../theme/motion';
import {
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { removeFriend } from '../lib/friends';
import { toast } from '../lib/toast';
import { useFriends } from '../hooks/useFriends';
import { useUserSearch } from '../hooks/useUserSearch';
import type { UserInfo } from '../hooks/useFriends';

export function Contacts() {
  const reduce = useReducedMotion() ?? false;
  const {
    contacts,
    incoming,
    outgoing,
    loading,
    refetch,
    removeLocal,
  } = useFriends();


  const [search, setSearch] = useState('');
  const results = useUserSearch(search);
  const [selected, setSelected] = useState<UserInfo | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [assignContact, setAssignContact] = useState<string | null>(null);

  const sendRequest = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !selected) return;
    if (selected.id === uid) {
      message.error("Can't add yourself");
      return;
    }
    if (contacts.some(c => c.id === selected.id) ||
        outgoing.some(o => o.id === selected.id) ||
        incoming.some(i => i.id === selected.id)) {
      message.error('Already connected or pending');
      return;
    }
    setAdding(true);
    try {
      await setDoc(doc(db, 'users', uid, 'outgoingRequests', selected.id), {});
      await setDoc(doc(db, 'users', selected.id, 'incomingRequests', uid), {});
      message.success('Request sent');
      setSelected(null);
      setSearch('');
    } catch (e: unknown) {
      message.error((e as Error).message || String(e));
    } finally {
      setAdding(false);
    }
  };

  const accept = async (other: UserInfo) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await setDoc(doc(db, 'users', uid, 'contacts', other.id), {});
      await setDoc(doc(db, 'users', other.id, 'contacts', uid), {});
      await deleteDoc(doc(db, 'users', uid, 'incomingRequests', other.id));
      await deleteDoc(doc(db, 'users', other.id, 'outgoingRequests', uid));
      message.success('Friend added');
    } catch (e: unknown) {
      message.error((e as Error).message || String(e));
    }
  };

  const decline = async (other: UserInfo) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'incomingRequests', other.id));
      await deleteDoc(doc(db, 'users', other.id, 'outgoingRequests', uid));
    } catch (e: unknown) {
      message.error((e as Error).message || String(e));
    }
  };

  const cancel = async (other: UserInfo) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'outgoingRequests', other.id));
      await deleteDoc(doc(db, 'users', other.id, 'incomingRequests', uid));
    } catch (e: unknown) {
      message.error((e as Error).message || String(e));
    }
  };

  const remove = async (other: UserInfo) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    Modal.confirm({
      title: 'Remove contact?',
      okButtonProps: { danger: true },
      onOk: async () => {
        setRemoving(other.id);
        // Optimistically remove the friend from local state
        removeLocal(other.id);
        try {
          await removeFriend(other.id);
          toast.success(
            `Removed ${other.displayName ?? other.email ?? 'user'} from your contacts.`,
          );
        } catch (e: unknown) {
          // If an error occurs, restore the contact list
          await refetch();
          toast.error((e as Error).message || String(e));
        } finally {
          setRemoving(null);
        }
      },
    });
  };

  const tabItems = [
    {
      key: 'contacts',
      label: 'Contacts',
      children: (
        <motion.div
          variants={{ show: { transition: { staggerChildren: m.durations.stagger } } }}
          initial="show"
          animate="show"
        >
          <List
            loading={loading}
            dataSource={contacts}
            renderItem={c => (
              <motion.div variants={cardVariants(reduce)} key={c.id}>
                <List.Item>
                  <Card
                    className="glass-card"
                    style={{ width: '100%' }}
                  actions={[
                    <Button key="send" onClick={() => setAssignContact(c.id)}>
                      Send Parts ➔
                    </Button>,
                    <Button
                      key="del"
                      danger
                        icon={<DeleteOutlined />}
                        disabled={removing === c.id}
                        onClick={() => remove(c)}
                      >
                        Remove
                      </Button>,
                    ]}
                  >
                    <Card.Meta
                      avatar={<Avatar src={c.photoURL} />}
                      title={c.displayName || c.email}
                      description={`@${c.handle || ''}`}
                    />
                  </Card>
                </List.Item>
              </motion.div>
            )}
          />
        </motion.div>
      ),
    },
    {
      key: 'outgoing',
      label: 'Requests Sent',
      children: (
        <motion.div
          variants={{ show: { transition: { staggerChildren: m.durations.stagger } } }}
          initial="show"
          animate="show"
        >
          <List
            dataSource={outgoing}
            renderItem={o => (
              <motion.div variants={cardVariants(reduce)} key={o.id}>
                <List.Item>
                  <Card
                    className="glass-card"
                    style={{ width: '100%' }}
                    actions={[
                      <Button key="cancel" onClick={() => cancel(o)}>
                        Cancel Request
                      </Button>,
                    ]}
                  >
                    <Card.Meta
                      avatar={<Avatar src={o.photoURL} />}
                      title={o.displayName || o.email}
                      description={`@${o.handle || ''}`}
                    />
                  </Card>
                </List.Item>
              </motion.div>
            )}
          />
        </motion.div>
      ),
    },
    {
      key: 'incoming',
      label: (
        <span>
          Requests Received{' '}
          <Badge count={incoming.length} style={{ backgroundColor: '#70c73c' }} />
        </span>
      ),
      children: (
        <motion.div
          variants={{ show: { transition: { staggerChildren: m.durations.stagger } } }}
          initial="show"
          animate="show"
        >
          <List
            dataSource={incoming}
            renderItem={i => (
              <motion.div variants={cardVariants(reduce)} key={i.id}>
                <List.Item>
                  <Card
                    className="glass-card"
                    style={{ width: '100%' }}
                    actions={[
                      <Button
                        key="accept"
                        type="primary"
                        onClick={() => accept(i)}
                      >
                        Accept
                      </Button>,
                      <Button key="decline" danger onClick={() => decline(i)}>
                        Decline
                      </Button>,
                    ]}
                  >
                    <Card.Meta
                      avatar={<Avatar src={i.photoURL} />}
                      title={i.displayName || i.email}
                      description={`@${i.handle || ''}`}
                    />
                  </Card>
                </List.Item>
              </motion.div>
            )}
          />
        </motion.div>
      ),
    },
  ];

  return (
    <Card className="glass-card" style={{ margin: '2rem' }} title="Contacts">
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Add users..."
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
        {search && results.length > 0 && (
          <List
            style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}
            dataSource={results}
            bordered
            renderItem={u => (
              <List.Item onClick={() => setSelected(u)} style={{ cursor: 'pointer' }}>
                <List.Item.Meta
                  avatar={<Avatar src={u.photoURL} />}
                  title={u.displayName || u.email}
                  description={`@${u.handle || ''}`}
                />
              </List.Item>
            )}
          />
        )}
      </div>
      <Tabs items={tabItems} />
      <Modal
        title={selected?.displayName || selected?.email}
        open={!!selected}
        onOk={sendRequest}
        okText="Add Friend"
        confirmLoading={adding}
        onCancel={() => setSelected(null)}
      >
        <p>@{selected?.handle}</p>
      </Modal>
      {assignContact && (
        <AssignmentModal
          open={!!assignContact}
          onClose={() => setAssignContact(null)}
          context="contacts"
          entityId={assignContact}
        />
      )}
    </Card>
  );
}
