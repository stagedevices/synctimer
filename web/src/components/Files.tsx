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
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DownloadOutlined,
  ShareAltOutlined,
  CopyOutlined,
  MoreOutlined,
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

interface AssignedRecord {
  id: string;
  fileId: string;
  partIds: string[];
  assignedBy: string;
  assignedAt: Timestamp;
}

export function Files() {
  const [user] = useAuthState(auth);
  const uid = user?.uid;

  const [received, setReceived] = useState<FileRecord[]>([]);
  const [sent, setSent] = useState<FileRecord[]>([]);
  const [assigned, setAssigned] = useState<AssignedRecord[]>([]);

  const [loadingReceived, setLoadingReceived] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);
  const [loadingAssigned, setLoadingAssigned] = useState(true);

  const [shareFile, setShareFile] = useState<FileRecord | null>(null);

  // Fetch "Received" files
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
        setReceived(docs);
        setLoadingReceived(false);
      },
      err => {
        toast.error(err.message);
        setLoadingReceived(false);
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
        setSent(docs);
        setLoadingSent(false);
      },
      err => {
        toast.error(err.message);
        setLoadingSent(false);
      },
    );
    return unsub;
  }, [uid]);

  // Fetch "Assigned" entries
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'users', uid, 'assignments'),
      orderBy('assignedAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      snap => {
        setAssigned(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<AssignedRecord, 'id'>) })));
        setLoadingAssigned(false);
      },
      err => {
        toast.error(err.message);
        setLoadingAssigned(false);
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

  const handleCopy = useCallback((f: FileRecord) => {
    Promise.resolve(
      navigator.clipboard.writeText(`https://example.com/files/${f.id}`)
    ).then(() => {
      toast.success('Link copied');
    });
  }, []);

  const moreMenu = (): MenuProps => ({
    items: [
      {
        key: 'delete',
        label: 'Delete',
        onClick: () => toast.success('Deleted'),
      },
      { key: 'archive', label: 'Archive', disabled: true },
    ],
  });

  // Render file card
  const renderCard = (f: FileRecord) => (
    <Col key={f.id} xs={24} sm={12} md={8}>
      <Card
        className="glass-card"
        actions={[
          <Button
            aria-label={`reshare-${f.id}`}
            key="share"
            icon={<ShareAltOutlined />}
            onClick={() => setShareFile(f)}
          >
            Reshare
          </Button>,
          <Button
            aria-label={`download-${f.id}`}
            key="dl"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(f)}
          />,
          <Button
            aria-label={`copy-${f.id}`}
            key="copy"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(f)}
          />,
          <Dropdown key="more" menu={moreMenu()}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>,
        ]}
      >
        <Card.Meta
          title={f.title}
          description={
            <div>
              <div>{format(f.createdAt.toDate(), 'MMM d, yyyy • h:mm a')}</div>
              <div>
                {f.origin && (
                  <Tag color="blue">{f.origin === 'group' ? `Group: ${f.originName}` : `Peer: ${f.originName}`}</Tag>
                )}
                {f.type && <Tag color="purple">{f.type === 'bundle' ? 'Bundle' : 'Part'}</Tag>}
                <span style={{ marginLeft: 8 }}>{f.size} KB</span>
              </div>
            </div>
          }
        />
      </Card>
    </Col>
  );

  const grid = (arr: FileRecord[], loading: boolean) => {
    if (loading) return <Spin />;
    if (arr.length === 0) return <div>No files.</div>;
    return <Row gutter={[16, 16]}>{arr.map(renderCard)}</Row>;
  };

  const assignmentGrid = () => {
    if (loadingAssigned) return <Spin />;
    if (assigned.length === 0) return <div>No assignments yet.</div>;
    return (
      <Row gutter={[16, 16]}>
        {assigned.map(a => (
          <Col key={a.id} xs={24} sm={12} md={8}>
            <Card className="glass-card">
              <Card.Meta
                title={received.find(f => f.id === a.fileId)?.title || a.fileId}
                description={`Parts: ${a.partIds.join(', ')} • ${format(a.assignedAt.toDate(), 'MMM d, yyyy • h:mm a')}`}
              />
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  if (!uid) return <Spin />;

  const items = [
    { key: 'received', label: 'Received', children: grid(received, loadingReceived) },
    { key: 'sent', label: 'Sent', children: grid(sent, loadingSent) },
    { key: 'assigned', label: 'Assigned', children: assignmentGrid() },
  ];

  return (
    <>
      <Tabs items={items} />
      {shareFile && (
        <ReshareModal open file={shareFile} onClose={() => setShareFile(null)} />
      )}
    </>
  );
}
