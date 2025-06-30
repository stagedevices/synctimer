import { Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, signInWithGoogle, signInWithApple } from '../lib/firebase';
import { useEffect } from 'react';

export function Account() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/parse', { replace: true });
    }
  }, [user, navigate]);

  const handle = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      navigate('/parse', { replace: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      message.error(msg);
    }
  };

  return (
    <div style={{ maxWidth: 320, margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Button type="primary" block onClick={() => handle(signInWithGoogle)}>
        Sign in with Google
      </Button>
      <Button block onClick={() => handle(signInWithApple)}>
        Sign in with Apple
      </Button>
    </div>
  );
}
