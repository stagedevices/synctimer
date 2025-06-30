import { useEffect, useState } from 'react';
import { Card, List, Input, Button, Spin, Switch, message } from 'antd';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getLinkToken } from '../lib/api';
import { QRCodeSVG } from 'qrcode.react';

interface Device {
  id: string;
  name: string;
  pushEnabled?: boolean;
  createdAt: Timestamp;
}

export function Devices() {
  const [user] = useAuthState(auth);
  const uid = user?.uid;

  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');

  // Fetch a one-time link token whenever the user changes
  useEffect(() => {
    if (!uid) return;
    getLinkToken(uid)
      .then(setToken)
      .catch((e) => message.error(e instanceof Error ? e.message : String(e)));
  }, [uid]);

  // Subscribe to the user's devices
  useEffect(() => {
    if (!uid) return;
    setLoadingDevices(true);
    const unsub = onSnapshot(
      collection(db, 'users', uid, 'devices'),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Device, 'id'>) }));
        setDevices(docs);
        setLoadingDevices(false);
      },
      (err) => {
        console.error('Devices:onSnapshot error', err);
        message.error('Failed to load devices');
        setLoadingDevices(false);
      },
    );
    return unsub;
  }, [uid]);

  const saveName = async (id: string) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, 'users', uid, 'devices', id), { name: nameInput });
      message.success('Device renamed');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      message.error(msg);
    }
    setEditingId(null);
  };

  const togglePush = async (id: string, checked: boolean) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, 'users', uid, 'devices', id), { pushEnabled: checked });
      message.success('Updated');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      message.error(msg);
    }
  };

  const unlink = async (id: string) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'devices', id));
      message.success('Device removed');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      message.error(msg);
    }
  };

  if (!uid) return <Spin tip="Loading user…" />;

  return (
    <Card
      title="Linked Devices"
      style={{
        margin: '2rem',
        borderRadius: '1.5rem',
        background: 'rgba(255,255,255,0.125)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.125)',
        transition: 'all 250ms',
      }}
    >
      {token ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <QRCodeSVG value={`https://synctimer.app/link?uid=${uid}&token=${token}`} />
          </div>
          {loadingDevices ? (
            <Spin tip="Loading devices…" />
          ) : (
            <List
              dataSource={devices}
              locale={{ emptyText: 'No devices linked yet' }}
              renderItem={(d) => (
                <List.Item
                  actions={[
                    <Switch
                      checked={d.pushEnabled}
                      onChange={(c) => togglePush(d.id, c)}
                      key="push"
                    />,
                    <Button danger onClick={() => unlink(d.id)} key="del">
                      Unlink
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      editingId === d.id ? (
                        <Input
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          onBlur={() => saveName(d.id)}
                          onPressEnter={() => saveName(d.id)}
                          autoFocus
                        />
                      ) : (
                        <Button type="link" onClick={() => { setEditingId(d.id); setNameInput(d.name); }}>
                          {d.name}
                        </Button>
                      )
                    }
                    description={d.createdAt?.toDate().toLocaleString()}
                  />
                </List.Item>
              )}
            />
          )}
        </>
      ) : (
        <Spin tip="Preparing link…" />
      )}
    </Card>
  );
}
