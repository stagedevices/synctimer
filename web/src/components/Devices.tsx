import { useEffect, useRef, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Spin,
  Switch,
  Input,
  Modal,
  message,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

const SECRET = import.meta.env.VITE_DEVICE_SECRET || 'dev-secret';

interface Device {
  id: string;
  name: string;
  linkedAt: Timestamp;
  autoPushSaved: boolean;
  autoPushReceived: boolean;
}

export function Devices() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid;

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [nameVal, setNameVal] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!uid) {
      navigate('/account');
      return;
    }
    const colRef = collection(db, 'users', uid, 'devices');
    const unsub = onSnapshot(
      colRef,
      snap => {
        const list: Device[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Device, 'id'>) }));
        setDevices(list);
        setLoading(false);
      },
      err => {
        console.error(err);
        message.error('Failed to load devices');
        setLoading(false);
      },
    );
    return unsub;
  }, [uid, navigate]);

  useEffect(() => {
    if (!uid || !canvasRef.current) return;
    const ts = new Date().toISOString();
    (async () => {
      try {
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          enc.encode(SECRET),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign'],
        );
        const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(uid + ts));
        const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
        const payload = JSON.stringify({ uid, ts, sig });
        const url =
          'https://bwipjs-api.metafloor.com/?bcid=pdf417&scale=3&padding=10&text=' +
          encodeURIComponent(payload);
        const img = new Image();
        img.onload = () => {
          const c = canvasRef.current!;
          c.width = img.width;
          c.height = img.height;
          c.getContext('2d')?.drawImage(img, 0, 0);
        };
        img.onerror = () => message.error('Failed to render barcode');
        img.src = url;
      } catch (e) {
        console.error(e);
        message.error('Failed to render barcode');
      }
    })();
  }, [uid]);

  const animate = (id: string, success: boolean) => {
    const el = document.getElementById('device-' + id);
    if (!el) return;
    el.classList.remove('animate-success', 'animate-error');
    void el.offsetWidth;
    el.classList.add(success ? 'animate-success' : 'animate-error');
  };

  const saveName = async (d: Device) => {
    if (!uid) return;
    const val = nameVal.trim();
    if (!val) {
      animate(d.id, false);
      message.error('Name required');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', uid, 'devices', d.id), { name: val });
      animate(d.id, true);
      message.success('Name updated');
    } catch (e: unknown) {
      console.error(e);
      animate(d.id, false);
      message.error((e as Error).message || String(e));
    } finally {
      setEditing(null);
    }
  };

  const toggle = async (id: string, field: 'autoPushSaved' | 'autoPushReceived', value: boolean) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, 'users', uid, 'devices', id), { [field]: value });
      message.success('Updated');
    } catch (e: unknown) {
      console.error(e);
      message.error((e as Error).message || String(e));
    }
  };

  const confirmDelete = (d: Device) => {
    Modal.confirm({
      title: 'Disconnect device?',
      okText: 'Disconnect',
      okButtonProps: { danger: true },
      onOk: () => deleteDevice(d.id),
    });
  };

  const deleteDevice = async (id: string) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'devices', id));
      message.success('Device removed');
    } catch (e: unknown) {
      console.error(e);
      message.error((e as Error).message || String(e));
    }
  };

  const glassStyle = { borderRadius: '1.5rem' } as const;

  return (
    <Card title="Linked Devices" className="glass-card" style={{ margin: '2rem', ...glassStyle }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Scan to Link Device</h2>
          <canvas ref={canvasRef} />
        </Col>
      </Row>
      <Row style={{ marginTop: '2rem' }}>
        <Col span={24}>
          <Spin spinning={loading} tip="Loading devices…">
            {devices.length === 0 ? (
              <p style={{ textAlign: 'center' }}>
                No devices connected—scan the QR code with your Synctimer app to link.
              </p>
            ) : (
              <TransitionGroup component={null}>
                {devices.map(d => (
                  <CSSTransition key={d.id} timeout={250} classNames="fade">
                    <Card
                      id={'device-' + d.id}
                      className="glass-card"
                      style={{ ...glassStyle, marginBottom: '1rem' }}
                      actions={[<DeleteOutlined key="del" onClick={() => confirmDelete(d)} />]}
                    >
                      {editing === d.id ? (
                        <Input
                          value={nameVal}
                          autoFocus
                          onChange={e => setNameVal(e.target.value)}
                          onPressEnter={() => saveName(d)}
                          onBlur={() => saveName(d)}
                        />
                      ) : (
                        <h3
                          style={{ marginBottom: 4, cursor: 'pointer' }}
                          onClick={() => {
                            setEditing(d.id);
                            setNameVal(d.name);
                          }}
                        >
                          {d.name}
                        </h3>
                      )}
                      <div style={{ color: '#666', marginBottom: 8 }}>
                        Linked {formatDistanceToNow(d.linkedAt.toDate(), { addSuffix: true })}
                      </div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <Switch
                            checked={d.autoPushSaved}
                            onChange={v => toggle(d.id, 'autoPushSaved', v)}
                          />
                          <span style={{ marginLeft: 8 }}>Push new saved files</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <Switch
                            checked={d.autoPushReceived}
                            onChange={v => toggle(d.id, 'autoPushReceived', v)}
                          />
                          <span style={{ marginLeft: 8 }}>Push new received files</span>
                        </div>
                      </div>
                    </Card>
                  </CSSTransition>
                ))}
              </TransitionGroup>
            )}
          </Spin>
        </Col>
      </Row>
    </Card>
  );
}

export default Devices;
