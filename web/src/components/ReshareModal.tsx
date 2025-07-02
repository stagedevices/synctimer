import { useEffect, useState } from 'react';
import { Modal, Select, Spin } from 'antd';
import { auth, db } from '../lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from '../lib/toast';

interface ReshareModalProps {
  open: boolean;
  file: { id: string; title: string; yaml: string; size: number };
  onClose: () => void;
}

interface Option { id: string; label: string; }

export function ReshareModal({ open, file, onClose }: ReshareModalProps) {
  const uid = auth.currentUser?.uid;
  const [options, setOptions] = useState<Option[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uid || !open) return;
    (async () => {
      try {
        // only groups are valid destinations
        const groupsSnap = await getDocs(collection(db, 'users', uid, 'groups'));
        const opts: Option[] = [];
        groupsSnap.forEach(d => opts.push({ id: d.id, label: d.id }));
        setOptions(opts);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid, open]);

  const send = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      await Promise.all(
        selected.map(r =>
          addDoc(collection(db, 'users', r, 'files'), {
            title: file.title,
            yaml: file.yaml,
            createdAt: serverTimestamp(),
            size: file.size,
          }).then(() =>
            addDoc(collection(db, 'users', uid, 'sent'), {
              title: file.title,
              createdAt: serverTimestamp(),
              size: file.size,
              origin: 'peer',
            })
          )
        )
      );
      toast.success('File shared');
      onClose();
      setSelected([]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      className="glass-modal"
      open={open}
      title="Reshare File"
      okText="Share"
      onOk={send}
      okButtonProps={{ disabled: selected.length === 0, loading: saving }}
      onCancel={onClose}
    >
      {loading ? (
        <Spin />
      ) : (
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Select recipients"
          value={selected}
          options={options.map(o => ({ value: o.id, label: o.label }))}
          onChange={vals => setSelected(vals)}
        />
      )}
      <div style={{ marginTop: 8, fontSize: '0.8rem', textAlign: 'center' }}>
        Use the Discover page to join tags – files can only be sent to groups.
      </div>
    </Modal>
  );
}
