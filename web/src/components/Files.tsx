// src/components/Files.tsx
// src/components/Files.tsx
import { useCallback, useEffect, useState } from 'react';
import {
  Tabs,
  Spin,
  Row,
  Col,
  Card,
  Button,
  Dropdown,
  Tag,
  Empty,
  Typography,
} from 'antd';
import {
  DownloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { format } from 'date-fns';
import { db, auth } from '../lib/firebase';
import { toast } from '../lib/toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { ReshareModal } from './ReshareModal';

const glassStyle = {
  background: 'rgba(255,255,255,0.6)',
  backdropFilter: 'blur(8px)',
  borderRadius: '1.5rem',
  boxShadow: '0 8px 32px rgba(0,0,0,0.125)',
} as const;

interface FileRecord {
  id: string;
  title: string;
  yaml: string;
  createdAt: Timestamp;
  size: number;
  origin?: 'group' | 'peer';
  originName?: string;
  type?: 'part' | 'bundle';
}

export function Files() {
  const [user] = useAuthState(auth);
  const uid = user?.uid;

  const [myFiles, setMyFiles] = useState<FileRecord[]>([]);
  const [sentFiles, setSentFiles] = useState<FileRecord[]>([]);

  const [loadingMyFiles, setLoadingMyFiles] = useState(true);
  const [loadingSentFiles, setLoadingSentFiles] = useState(true);

  const [shareFile, setShareFile] = useState<FileRecord | null>(null);

  // Fetch "My" files
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'users', uid, 'files'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<FileRecord, 'id'>) }));
        setMyFiles(docs);
        setLoadingMyFiles(false);
      },
      err => {
        toast.error(err.message);
        setLoadingMyFiles(false);
      },
    );
    return unsub;
  }, [uid]);

  // Fetch "Sent" files
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'users', uid, 'sent'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<FileRecord, 'id'>) }));
        setSentFiles(docs);
        setLoadingSentFiles(false);
      },
      err => {
        toast.error(err.message);
        setLoadingSentFiles(false);
      },
    );
    return unsub;
  }, [uid]);


  const handleDownload = useCallback((f: FileRecord) => {
    const blob = new Blob([f.yaml], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.title;
    a.click();
    URL.revokeObjectURL(url);
  }, []);


  // Render file card
  const renderCard = (f: FileRecord) => (
    <Col key={f.id} xs={24} sm={12} md={8} lg={6}>
      <Card
        style={glassStyle}
        styles={{ body: { height: '100%' } }}
        aria-label={`File ${f.title}, ${f.type === 'bundle' ? 'Score' : 'Part'}${
          f.origin ? `, shared by ${f.origin === 'group' ? `Group: ${f.originName}` : 'Individual'}` : ''
        }`}
        actions={[
          <Button
            aria-label={`view-${f.id}`}
            key="view"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(f)}
          >
            View
          </Button>,
          <Dropdown
            key="share"
            menu={{ items: [{ key: 'share', label: 'Share', onClick: () => setShareFile(f) }] }}
          >
            <Button aria-label={`share-${f.id}`} icon={<ShareAltOutlined />} />
          </Dropdown>,
        ]}
      >
        <Card.Meta
          title={<Typography.Text ellipsis>{f.title}</Typography.Text>}
          description={
            <div>
              <div style={{ fontSize: '0.875rem' }}>
                {format(f.createdAt.toDate(), 'MMMM d, yyyy')}
              </div>
              <div>
                {f.type && (
                  <Tag color={f.type === 'bundle' ? 'purple' : 'green'}>
                    {f.type === 'bundle' ? 'Score' : 'Part'}
                  </Tag>
                )}
                <Tag color={f.origin === 'group' ? 'blue' : 'magenta'}>
                  {f.origin === 'group' ? `Group: ${f.originName}` : 'Individual'}
                </Tag>
              </div>
            </div>
          }
        />
      </Card>
    </Col>
  );

  const grid = (arr: FileRecord[], loading: boolean) => {
    if (loading) return <Spin />;
    if (arr.length === 0)
      return (
        <Card style={glassStyle}>
          <Empty description="No files yet — go validate one!" />
        </Card>
      );
    // Render card grid for files
    return <Row gutter={[16, 16]}>{arr.map(renderCard)}</Row>;
  };

  if (!uid) return <Spin />;

  const items = [
    { key: 'mine', label: 'My Files', children: grid(myFiles, loadingMyFiles) },
    { key: 'sent', label: 'Sent Files', children: grid(sentFiles, loadingSentFiles) },
  ];

  return (
    <>
      <Tabs destroyOnHidden items={items} />
      {shareFile && (
        <ReshareModal open file={shareFile} onClose={() => setShareFile(null)} />
      )}
    </>
  );
}
