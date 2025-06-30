import { useEffect, useState } from "react";
import type { FC } from "react";
import { List, Card } from "antd";
import { db, auth } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";

interface SharedFile {
  id: string;
  title: string;
  sharedBy: string;
  sharedAt: Timestamp;
}

const SharedFiles: FC = () => {
  const [files, setFiles] = useState<SharedFile[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, "users", uid, "shared"),
      orderBy("sharedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SharedFile, "id">),
      }));
      setFiles(docs);
    });
    return unsub;
  }, []);

  return (
    <Card title="Shared with Me">
      <List
        dataSource={files}
        locale={{ emptyText: "Nothing shared with you yet" }}
        renderItem={(file) => (
          <List.Item key={file.id}>
            <Card title={file.title} style={{ width: "100%" }}>
              Shared by {file.sharedBy} · {file.sharedAt.toDate().toLocaleString()}
            </Card>
          </List.Item>
        )}
      />
    </Card>
  );
};

export default SharedFiles;
