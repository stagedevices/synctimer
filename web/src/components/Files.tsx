// src/components/Files.tsx
import { useEffect, useState } from "react";
import { Card, List, Spin, Button, Select, Tabs } from "antd";
import { AssignmentModal } from './AssignmentModal';
import { DownloadOutlined } from "@ant-design/icons";
import { db, auth } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  addDoc,
  doc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";

interface FileRecord {
  id: string;
  title: string;
  yaml: string;
  createdAt: Timestamp;
  size: number;
  status: string;
}

interface SharedRecord {
  id: string;
  title: string;
  sharedBy: string;
  sharedAt: Timestamp;
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

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [shared, setShared] = useState<SharedRecord[]>([]);
  const [assigned, setAssigned] = useState<AssignedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<Array<{ value: string; label: string }>>([]);
  const [assignFile, setAssignFile] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const q = query(
      collection(db, "files"),
      where("ownerUid", "==", uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FileRecord, "id">),
        }));
        setFiles(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Files:onSnapshot error", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "users", uid, "shared"),
      orderBy("sharedAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<SharedRecord, "id">),
      }));
      setShared(docs);
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'users', uid, 'assignments'),
      orderBy('assignedAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setAssigned(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<AssignedRecord,'id'>) })));
    });
    return unsub;
  }, [uid]);

  const pushTo = async (value: string, file: FileRecord) => {
    if (!uid) return;
    const [type, id] = value.split(':');
    const snap = await getDocs(collection(db, type === 'tag' ? 'tags' : 'groups', id, 'members'));
    await Promise.all(
      snap.docs.map(m =>
        addDoc(collection(db, 'users', m.id, 'files'), {
          title: file.title,
          yaml: file.yaml,
          createdAt: serverTimestamp(),
          size: file.size,
          status: 'ready',
        })
      )
    );
  };

  useEffect(() => {
    if (!uid) return;
    const unsubTags = onSnapshot(collection(db, 'users', uid, 'tags'), snap => {
      const opts = snap.docs.map(d => ({ value: `tag:${d.id}`, label: `#${d.id}` }));
      setTargets(t => [...opts, ...t.filter(o => !o.value.startsWith('tag:'))]);
    });
    const unsubGroups = onSnapshot(collection(db, 'users', uid, 'groups'), async snap => {
      const arr = [] as Array<{ value: string; label: string }>;
      for (const d of snap.docs) {
        const g = await getDoc(doc(db, 'groups', d.id));
        if (g.exists()) arr.push({ value: `group:${d.id}`, label: g.data().name });
      }
      setTargets(t => [...t.filter(o => !o.value.startsWith('group:')), ...arr]);
    });
    return () => {
      unsubTags();
      unsubGroups();
    };
  }, [uid]);

  if (!uid) return <Spin />;
  if (loading) return <Spin />;

  return (
    <>
    <Tabs
      items={[
        {
          key: 'mine',
          label: 'My Files',
          children: (
            files.length === 0 ? (
              <div>No files yet — go validate one on the Validate page.</div>
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={files}
                renderItem={(f) => (
                  <List.Item
                    actions={[
                      <Button
                        key="dl"
                        icon={<DownloadOutlined />}
                        onClick={() => {
                          const blob = new Blob([f.yaml], {
                            type: 'text/yaml;charset=utf-8',
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = f.title;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download
                      </Button>,
                      <Button key="assign" onClick={() => setAssignFile(f.id)}>
                        Assign Parts ➔
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={f.title}
                      description={`${f.status} · ${f.size} bytes · ${f.createdAt
                        .toDate()
                        .toLocaleString()}`}
                    />
                  </List.Item>
                )}
              />
            )
          ),
        },
        {
          key: 'assigned',
          label: 'Assigned to Me',
          children: (
            assigned.length === 0 ? (
              <div>No assignments yet.</div>
            ) : (
              <List
                dataSource={assigned}
                renderItem={a => (
                  <List.Item>
                    <List.Item.Meta
                      title={files.find(f=>f.id===a.fileId)?.title || a.fileId}
                      description={`Parts: ${a.partIds.join(', ')} · Assigned at ${a.assignedAt.toDate().toLocaleDateString()}`}
                    />
                  </List.Item>
                )}
              />
            )
          ),
        },
      ]}
    />
    {assignFile && (
      <AssignmentModal
        open={!!assignFile}
        onClose={() => setAssignFile(null)}
        context="files"
        entityId={assignFile}
      />
    )}
    </>
  );
}
