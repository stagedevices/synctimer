import { useEffect, useState } from 'react';
import { Badge, Dropdown, List } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export function NotificationsBell() {
  const uid = auth.currentUser?.uid;
  const [notifs, setNotifs] = useState<any[]>([]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'notifications'), orderBy('assignedAt','desc'));
    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });
    return unsub;
  }, [uid]);

  const menu = (
    <List size="small" dataSource={notifs} renderItem={n => (
      <List.Item>{n.fileId}</List.Item>
    )}/>
  );

  return (
    <Dropdown overlay={menu} placement="bottomRight" trigger={["click"]}>
      <Badge count={notifs.length} size="small">
        <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
      </Badge>
    </Dropdown>
  );
}
