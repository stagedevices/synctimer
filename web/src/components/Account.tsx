import { useEffect, useState } from 'react';
import { Card, Avatar, Button, Spin, Row, Col, message } from 'antd';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, unlinkProvider } from '../lib/firebase';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';

interface Profile {
  displayName?: string;
  email?: string;
  photoURL?: string;
  lastSignedInAt?: Timestamp;
}

export function Account() {
  const [user] = useAuthState(auth);
  const uid = user?.uid;
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, 'users', uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = (snap.exists() ? (snap.data() as Profile) : {}) as Profile;
        setProfile(data);
      },
      (err) => message.error(err.message)
    );
    return unsub;
  }, [uid]);

  const handleUnlink = async (pid: string) => {
    try {
      await unlinkProvider(pid);
      message.success('Disconnected');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      message.error(msg);
    }
  };

  if (!user || !profile) return <Spin />;

  return (
    <Card title="Account" className="glass-card" style={{ margin: '2rem', borderRadius: '1.5rem' }}>
      <Row gutter={[16, 16]}>
        <Col span={24} style={{ textAlign: 'center' }}>
          <Avatar src={user.photoURL} size={64} />
          <div style={{ marginTop: 8, fontSize: '1.2rem' }}>{user.displayName}</div>
          <div>{user.email}</div>
          {profile.lastSignedInAt &&
            typeof (profile.lastSignedInAt as Timestamp).toDate === 'function' && (
              <div style={{ marginTop: 8 }}>
                Last sign-in:{' '}
                {(profile.lastSignedInAt as Timestamp).toDate().toLocaleString()}
              </div>
            )}
        </Col>
        <Col span={24}>
          {user.providerData.map((p) => (
            <Button
              key={p.providerId}
              danger
              onClick={() => handleUnlink(p.providerId)}
              style={{ marginRight: 8, marginTop: 8 }}
            >
              Disconnect {p.providerId}
            </Button>
          ))}
        </Col>
      </Row>
    </Card>
  );
}
