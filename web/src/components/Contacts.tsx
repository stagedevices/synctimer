import { useEffect, useState } from "react";
import type { FC } from "react";
import { List, Card, Button } from "antd";
import { db, auth } from "../lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

interface ContactRec {
  id: string;
  name: string;
  email: string;
  addedAt: Timestamp;
}

export const Contacts: FC = () => {
  const [contacts, setContacts] = useState<ContactRec[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(
      collection(db, "users", uid, "contacts"),
      orderBy("addedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ContactRec, "id">),
      }));
      setContacts(docs);
    });
    return unsub;
  }, []);

  const addContact = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const email = window.prompt("Contact email?");
    if (!email) return;
    await addDoc(collection(db, "users", uid, "contacts"), {
      email,
      name: email.split("@")[0],
      addedAt: serverTimestamp(),
    });
  };

  return (
    <Card title="Contacts" extra={<Button onClick={addContact}>Add Contact</Button>}>
      <List
        dataSource={contacts}
        locale={{ emptyText: "No contacts yet" }}
        renderItem={(c) => (
          <List.Item key={c.id}>
            <Card title={c.name} style={{ width: "100%" }}>
              {c.email} · {c.addedAt.toDate().toLocaleString()}
            </Card>
          </List.Item>
        )}
      />
    </Card>
  );
};
