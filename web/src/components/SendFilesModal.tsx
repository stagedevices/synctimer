import { useEffect, useState } from 'react';
import { Modal, Select, Spin } from 'antd';
import { collection, query, orderBy, onSnapshot, Timestamp, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { toast } from '../lib/toast';

interface FileRecord {
  id: string;
  title: string;
  yaml: string;
  createdAt: Timestamp;
  size: number;
  status: string;
}

interface SendFilesModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
}

export function SendFilesModal({ open, onClose, groupId }: SendFilesModalProps) {
  const uid = auth.currentUser?.uid;
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!uid || !open) return;
    const q = query(collection(db, 'users', uid, 'files'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setFiles(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<FileRecord, 'id'>) })));
      setLoading(false);
    });
    return unsub;
  }, [uid, open]);

  const sendFiles = async () => {
    if (!uid || selected.length === 0) return;
    setSending(true);
    try {
      const memberSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
      const recipients = memberSnap.docs.map(d => d.id);
      const chosen = files.filter(f => selected.includes(f.id));
      await Promise.all(
        chosen.flatMap(file =>
          recipients.map(m =>
            addDoc(collection(db, 'users', m, 'files'), {
              title: file.title,
              yaml: file.yaml,
              createdAt: serverTimestamp(),
              size: file.size,
              status: 'ready',
            })
          )
        )
      );
      toast.success('Files sent');
      onClose();
      setSelected([]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Send Files"
      okText="Send"
      okButtonProps={{ disabled: selected.length === 0, loading: sending }}
      onOk={sendFiles}
      onCancel={onClose}
    >
      {loading ? (
        <Spin />
      ) : (
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Select files"
          value={selected}
          onChange={setSelected}
          options={files.map(f => ({ value: f.id, label: f.title }))}
        />
      )}
    </Modal>
  );
}
