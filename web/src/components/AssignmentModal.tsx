import { useEffect, useState } from 'react';
import { Modal, Select, Steps, Checkbox, Input, List } from 'antd';
import { collection, query, orderBy, where, onSnapshot, addDoc, setDoc, getDocs, serverTimestamp, doc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { toast } from '../lib/toast';

interface AssignmentModalProps {
  open: boolean;
  onClose: () => void;
  context: 'files' | 'contacts' | 'groups';
  entityId: string;
}

export function AssignmentModal({ open, onClose, context, entityId }: AssignmentModalProps) {
  const uid = auth.currentUser?.uid;
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<any[]>([]);
  const [fileId, setFileId] = useState(context === 'files' ? entityId : '');
  const [parts, setParts] = useState<any[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<any[]>([]);
  const [assignmentName, setAssignmentName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid || context === 'files') return;
    const q = query(collection(db, 'files'), where('ownerUid', '==', uid));
    const unsub = onSnapshot(q, snap => {
      setFiles(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });
    return unsub;
  }, [uid, context]);

  useEffect(() => {
    if (!fileId) return;
    const q = query(collection(db, 'files', fileId, 'parts'), orderBy('partName'));
    const unsub = onSnapshot(q, snap => {
      setParts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });
    return unsub;
  }, [fileId]);

  useEffect(() => {
    if (!uid) return;
    if (context === 'contacts') {
      setRecipients([{ type: 'user', uid: entityId }]);
      setSelectedRecipients([{ type: 'user', uid: entityId }]);
    } else if (context === 'groups') {
      const q = collection(db, 'groups', entityId, 'members');
      getDocs(q).then(snap => {
        const arr = snap.docs.map(d => ({ type: 'user', uid: d.id }));
        setRecipients(arr);
      });
    } else {
      const q = collection(db, 'users', uid!, 'contacts');
      getDocs(q).then(snap => {
        const arr = snap.docs.map(d => ({ type: 'user', uid: d.id }));
        setRecipients(arr);
      });
    }
  }, [uid, context, entityId]);

  const doAssign = async () => {
    if (!uid || !fileId || selectedParts.length === 0 || selectedRecipients.length === 0) return;
    setLoading(true);
    try {
      const data = {
        fileId,
        partIds: selectedParts,
        assignedBy: uid,
        recipients: selectedRecipients.map(r => r.type ? r : { type: 'user', uid: r.uid }),
        assignedAt: serverTimestamp(),
        reversed: false,
      } as any;
      if (assignmentName) data.assignmentName = assignmentName;
      const docRef = await addDoc(collection(db, 'assignments'), data);
      await Promise.all(
        selectedRecipients.map(r =>
          setDoc(doc(db, 'users', r.uid, 'assignments', docRef.id), data)
        )
      );
      toast.success('Parts assigned');
      onClose();
      setStep(0);
      setSelectedParts([]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'File',
      content: context === 'files' ? (
        <div>{fileId}</div>
      ) : (
        <Select value={fileId} onChange={v => setFileId(v)} style={{ width: '100%' }} options={files.map(f => ({ value: f.id, label: f.title }))} />
      ),
    },
    {
      title: 'Parts',
      content: (
        <Checkbox.Group value={selectedParts} onChange={vals => setSelectedParts(vals as string[])}>
          <List dataSource={parts} renderItem={p => (
            <List.Item>
              <Checkbox value={p.id}>{p.partName}</Checkbox>
            </List.Item>
          )} />
        </Checkbox.Group>
      ),
    },
    {
      title: 'Recipients',
      content: (
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          value={selectedRecipients.map(r => r.uid)}
          onChange={vals => setSelectedRecipients(vals.map(v => ({ type: 'user', uid: v })))}
          options={recipients.map(r => ({ value: r.uid, label: r.uid }))}
        />
      ),
    },
    {
      title: 'Metadata',
      content: context === 'groups' ? (
        <Input placeholder="Assignment Name" value={assignmentName} onChange={(e: any) => setAssignmentName(e.target.value)} />
      ) : (
        <div>Ready</div>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title="Assign Parts"
      okText={step === steps.length - 1 ? 'Assign' : 'Next'}
      confirmLoading={loading}
      okButtonProps={{ disabled: step === 1 && selectedParts.length === 0 }}
      onOk={() => {
        if (step < steps.length - 1) setStep(step + 1); else doAssign();
      }}
      onCancel={onClose}
    >
      <Steps current={step} items={steps.map(s => ({ title: s.title }))} />
      <div style={{ marginTop: 16 }}>{steps[step].content}</div>
    </Modal>
  );
}
