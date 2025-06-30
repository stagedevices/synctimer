import { Button, Card, Col, Row, message } from 'antd';
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
    <Card className="glass-card" style={{ margin: '2rem', borderRadius: '1.5rem' }}>
      <Row gutter={[16, 16]} justify="center">
        <Col span={24}>
          <Button type="primary" size="large" block onClick={() => handle(signInWithGoogle)}>
            Sign in with Google
          </Button>
        </Col>
        <Col span={24}>
          <Button size="large" block onClick={() => handle(signInWithApple)}>
            Sign in with Apple
          </Button>
        </Col>
      </Row>
    </Card>
  );
}
