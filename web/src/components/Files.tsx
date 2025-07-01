// src/components/Files.tsx
import { useEffect, useState } from "react";
import { Card, List, Spin, Button, Select } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { db, auth } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  query,
  orderBy,
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

export function Files() {
  const [user] = useAuthState(auth);
  const uid = user?.uid;

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [shared, setShared] = useState<SharedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const q = query(
      collection(db, "users", uid, "files"),
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
    <div className="page-content">
      <Card title="My Files" style={{ marginBottom: 16 }}>
      {files.length === 0 ? (
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
                      type: "text/yaml;charset=utf-8",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = f.title;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download
                </Button>,
                <Select
                  key="push"
                  placeholder="Push to..."
                  size="small"
                  style={{ width: 120 }}
                  options={targets}
                  onChange={value => pushTo(value, f)}
                />,
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
      )}
      </Card>
      <Card title="Shared With Me">
      {shared.length === 0 ? (
        <div>No files shared with you yet.</div>
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={shared}
          renderItem={f => (
            <List.Item>
              <List.Item.Meta
                title={f.title}
                description={`Shared by ${f.sharedBy} · ${f.sharedAt.toDate().toLocaleString()}`}
              />
            </List.Item>
          )}
        />
      )}
      </Card>
    </div>
  );
}
