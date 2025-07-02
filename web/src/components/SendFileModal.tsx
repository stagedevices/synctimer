import { Modal, Button } from 'antd';
import { useState } from 'react';

interface Props {
  groupId: string;
  onClose: () => void;
}

export function SendFileModal({ groupId, onClose }: Props) {
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  return (
    <Modal
      className="glass-modal"
      open={open}
      title="Assign Parts / Send File"
      onCancel={handleClose}
      footer={<Button onClick={handleClose}>Close</Button>}
      maskStyle={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(255,255,255,0.125)' }}
    >
      <p>Feature coming soon.</p>
    </Modal>
  );
}
