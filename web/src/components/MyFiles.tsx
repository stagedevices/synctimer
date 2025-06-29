// src/components/MyFiles.tsx
import { useEffect, useState } from "react";
import { Card, List, Spin, Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
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

export function MyFiles() {
  // TEMP: sandbox UID if nobody signed in
  const uid = "TEST_UID";

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        console.error("MyFiles:onSnapshot error", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [uid]);

  if (loading) return <Spin tip="Loading your files…" />;

  return (
    <Card title={`My Files (Sandbox: ${uid})`}>
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
  );
}
