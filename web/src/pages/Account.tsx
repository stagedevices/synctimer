import { Button, Row, Col, message } from 'antd';
import { signInWithGoogle, signInWithApple } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export function Account() {
  const nav = useNavigate();
  const handleSignIn = async (providerFn: () => Promise<unknown>) => {
    try {
      await providerFn();
      nav('/parse');
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : 'Authentication failed';
      message.error(err);
    }
  };

  return (
    <Row justify="center" align="middle" style={{ height: '100vh' }}>
      <Col>
        <Button
          block
          size="large"
          style={{ marginBottom: '1rem' }}
          onClick={() => handleSignIn(signInWithGoogle)}
        >
          Sign in with Google
        </Button>
        <Button
          block
          size="large"
          onClick={() => handleSignIn(signInWithApple)}
        >
          Sign in with Apple
        </Button>
      </Col>
    </Row>
  );
}
