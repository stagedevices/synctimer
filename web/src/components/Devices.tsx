import { useState, useEffect } from 'react';
import { Card, Button, Input, List, Spin, message, QRCode } from 'antd';
import { auth, db } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { linkDevice } from '../lib/api';

interface Device {
  id: string;
  name: string;
  token: string;
  createdAt: Timestamp;
}

export function Devices() {
  const [user] = useAuthState(auth);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [qr, setQr] = useState<{ deviceId: string; token: string } | null>(null);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const unsub = onSnapshot(
      collection(db, 'users', uid, 'devices'),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Device, 'id'>) }));
        setDevices(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Devices:onSnapshot error', err);
        message.error('Failed to load devices');
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  const handleLink = async () => {
    if (!user) return;
    setLinking(true);
    try {
      const res = await linkDevice(user.uid, deviceName || 'Phone');
      setQr(res);
      setDeviceName('');
      message.success('Device linked');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      message.error(msg);
    } finally {
      setLinking(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'devices', id));
      message.success('Device revoked');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      message.error(msg);
    }
  };

  if (!user) return <Spin tip="Loading user…" />;

  return (
    <Card
      title="Linked Devices"
      style={{ margin: '2rem', borderRadius: '1.5rem', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)', boxShadow: '0 8px 32px rgba(0,0,0,0.125)' }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <Input
          placeholder="Device name"
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
          style={{ width: '60%', marginRight: '1rem' }}
        />
        <Button type="primary" onClick={handleLink} loading={linking}>
          Link Phone
        </Button>
      </div>
      {qr && (
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <QRCode
            value={`https://synctimer.app/link?device=${qr.deviceId}&token=${qr.token}`}
          />
        </div>
      )}
      {loading ? (
        <Spin tip="Loading devices…" />
      ) : (
        <List
          dataSource={devices}
          locale={{ emptyText: 'No devices linked yet' }}
          renderItem={(d) => (
            <List.Item
              actions={[<Button danger onClick={() => handleRevoke(d.id)}>Revoke</Button>]}
            >
              <List.Item.Meta
                title={d.name}
                description={d.createdAt?.toDate().toLocaleString()}
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
