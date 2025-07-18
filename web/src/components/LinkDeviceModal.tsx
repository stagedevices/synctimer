import { useEffect, useState, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button, Modal, Tooltip, message, Alert } from 'antd';
import { MobileOutlined, CloseOutlined } from '@ant-design/icons';
import { auth } from '../lib/firebase';
import { getLinkToken } from '../lib/api';
import Devices from './Devices';
import { useLocation } from 'react-router-dom';

export function LinkDeviceModal() {
  const [user] = useAuthState(auth);
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const fetchToken = useCallback(async () => {
    const uid = user?.uid;
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
  }, [user]);

  useEffect(() => {
    if (open && !token && user) {
      fetchToken();
    }
  }, [open, token, user, fetchToken]);

  if (!user) return null;

  return (
    <>
      <Tooltip title="Link Device">
        {/* Restyled Link Phone trigger button */}
        <Button
          className="link-device-btn"
          aria-label="Link Device"
          type="default"
          icon={<MobileOutlined />}
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 1000,
            backgroundColor: '#000',
            color: '#fff',
            fontWeight: 600,
            padding: '0.75rem 1.5rem',
            borderColor: '#000',
          }}
        >
          Link Phone
        </Button>
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
        {/* Wrap modal content to prevent overflow */}

        <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '1rem' }}>
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
        </div>
      </Modal>
    </>
  );
}

