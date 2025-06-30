import React, { useEffect, useState } from "react";
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

interface Contact {
  id: string;
  name: string;
  email: string;
  addedAt: Timestamp;
}

export function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);

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
        ...(d.data() as Omit<Contact, "id">),
      }));
      setContacts(docs);
    });
    return unsub;
  }, []);

  const handleAdd = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const email = prompt("Enter contact email");
    if (!email) return;
    try {
      await addDoc(collection(db, "users", uid, "contacts"), {
        email,
        name: email.split("@")[0],
        addedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Add contact failed", err);
    }
  };

  return (
    <Card
      title="Contacts"
      style={{ margin: "2rem", borderRadius: "1.5rem" }}
      extra={<Button onClick={handleAdd}>Add Contact</Button>}
    >
      <List
        dataSource={contacts}
        locale={{ emptyText: "No contacts yet" }}
        renderItem={(c) => (
          <List.Item key={c.id}>
            <Card style={{ width: "100%" }}>
              <div>{c.name}</div>
              <div>{c.email}</div>
              <div>{c.addedAt && c.addedAt.toDate().toLocaleString()}</div>
            </Card>
          </List.Item>
        )}
      />
    </Card>
  );
}
