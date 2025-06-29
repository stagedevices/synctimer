import React from "react";
import { useAuthState }     from "react-firebase-hooks/auth";
import { useCollection }    from "react-firebase-hooks/firestore";
import { auth, db }         from "../lib/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
import { Card, List, Spin, Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { saveAs }           from "file-saver";

export function MyFiles() {
  const [user, loadingAuth] = useAuthState(auth);

  // once we have a user, listen for their files
  const filesQuery = user
    ? query(
        collection(db, "users", user.uid, "files"),
        orderBy("createdAt", "desc")
      )
    : null;

  const [snapshot, loadingFiles, error] = useCollection(filesQuery);

  if (loadingAuth || loadingFiles) {
    return <Spin tip="Loading your files…" style={{ margin: "2rem" }} />;
  }

  if (!user) {
    return <Card style={{ margin: "2rem" }}>Please sign in to see your files.</Card>;
  }

  if (error) {
    return <Card type="error" style={{ margin: "2rem" }}>{error.message}</Card>;
  }

  const docs = snapshot?.docs ?? [];

  return (
    <Card title="My Files" style={{ margin: "2rem" }}>
      {docs.length === 0 ? (
        <div>No files yet — upload one on the Validate page.</div>
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={docs}
          renderItem={(doc) => {
            const { title, yaml, createdAt, size, status } = doc.data() as any;
            return (
              <List.Item
                actions={[
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => saveAs(new Blob([yaml], { type: "text/yaml" }), title)}
                  >
                    Download
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={title}
                  description={`Status: ${status} · ${createdAt?.toDate().toLocaleString()} · ${size} bytes`}
                />
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}
