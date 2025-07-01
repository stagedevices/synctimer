import { useEffect, useState } from 'react';
import { Button, Modal, Tooltip, message, Alert } from 'antd';
import { MobileOutlined, CloseOutlined } from '@ant-design/icons';
import { auth } from '../lib/firebase';
import { getLinkToken } from '../lib/api';
import Devices from './Devices';
import { useLocation } from 'react-router-dom';

export function LinkDeviceModal() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const fetchToken = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const t = await getLinkToken(uid);
      setToken(t);
      setError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      message.error(msg);
    }
  };

  useEffect(() => {
    if (open && !token) {
      fetchToken();
    }
  }, [open, token]);

  if (!auth.currentUser) return null;

  return (
    <>
      <Tooltip title="Link Device">
        <Button
          className="link-device-btn"
          aria-label="Link Device"

          type="primary"
          shape="circle"
          icon={<MobileOutlined />}
          onClick={() => setOpen(true)}
          style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}
        />
      </Tooltip>
      <Modal
        className="glass-modal"
        open={open}
        title={<span id="link-device-title">Link Device</span>}

        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose={false}
        maskStyle={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(255,255,255,0.125)' }}
        bodyStyle={{ padding: 0 }}
        closeIcon={<CloseOutlined aria-label="Close" />}

        aria-labelledby="link-device-title"
        aria-describedby="link-device-desc"
        transitionName="fade-scale"
        maskTransitionName="fade"
      >
        {error && (
          <Alert
            type="error"
            message={error}
            action={<Button size="small" onClick={fetchToken}>Retry</Button>}
            style={{ marginBottom: 8 }}
          />
        )}
        <div id="link-device-desc">
          <Devices linkToken={token ?? undefined} />
        </div>
      </Modal>
    </>
  );
}

