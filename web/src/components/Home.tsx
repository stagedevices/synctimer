import { Card, Button, Row, Col, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, signInWithGoogle, signInWithApple } from '../lib/firebase';
import { ReactElement } from 'react';

function GoogleIcon(): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 262"
      style={{ width: 20, height: 20 }}
    >
      <path
        fill="#EA4335"
        d="M255.8 133.5c0-11.2-.9-19.4-2.8-27.9H130.5v52.2h70.9c-1.4 11.3-9 28.4-25.9 39.8l-.2 1.4 37.5 29 2.6.3c23.8-22 37.8-54.5 37.8-94.8"
      />
      <path
        fill="#34A853"
        d="M130.5 261.9c34 0 62.5-11.2 83.3-30.4l-39.7-30.7c-10.5 7.2-24.5 12.2-43.6 12.2-33.4 0-61.7-22-71.8-52.6l-1.5.1-38.8 30-.5 1.5C39.3 230.6 81.5 261.9 130.5 261.9"
      />
      <path
        fill="#4A90E2"
        d="M58.7 160.4c-2.4-7.2-3.8-14.8-3.8-22.6s1.4-15.4 3.7-22.6l-.1-1.5L19 82.9l-1.3.6C6.3 107.5 0 134.1 0 162.4c0 28.3 6.3 54.9 17.7 78.9l40.4-31c-3.4-6.4-5.9-13.5-7.6-21"
      />
      <path
        fill="#FBBC05"
        d="M130.5 51.5c23.4 0 39.2 10.1 48.2 18.6l35.2-34.3C192.7 14.1 164.5 0 130.5 0 81.5 0 39.3 31.3 17.7 83.5l40.9 31.7C68.7 73.5 97 51.5 130.5 51.5"
      />
    </svg>
  );
}

function AppleIcon(): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 14 17"
      style={{ width: 20, height: 20 }}
    >
      <path
        fill="currentColor"
        d="M13.565 13.047a8.01 8.01 0 0 1-1.12 1.886c-.59.71-1.073 1.2-1.45 1.47-.58.42-1.206.64-1.878.65-.48 0-1.06-.14-1.74-.42-.68-.28-1.31-.42-1.9-.42-.62 0-1.27.14-1.96.42-.69.28-1.25.43-1.67.44-.64.03-1.26-.19-1.86-.66-.35-.26-.82-.74-1.41-1.45C.515 14.36 0 13.01 0 11.64c0-1.26.37-2.35 1.1-3.27.73-.92 1.7-1.39 2.9-1.42.54 0 1.24.17 2.1.5.86.33 1.42.5 1.68.5.19 0 .78-.2 1.79-.6.96-.36 1.78-.5 2.44-.4 1.8.15 3.15.85 4.05 2.13-1.62 1-2.43 2.4-2.44 4.2 0 1.36.5 2.51 1.5 3.46zM9.5 0c0 .9-.33 1.73-.98 2.5-.79.93-1.74 1.47-2.74 1.39a2.8 2.8 0 0 1-.02-.34c0-.86.38-1.77 1.02-2.5.36-.43.82-.78 1.34-1.05C8.64-.18 9.05-.3 9.43-.29c.03.1.05.2.07.3 0 .18-.02.36-.02.54z"
      />
    </svg>
  );
}

export function Home() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  if (user) {
    navigate('/account');
    return null;
  }

  const handle = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      navigate('/account');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      message.error(msg);
    }
  };

  return (
    <Card title="Sign In" className="glass-card" style={{ margin: '2rem', borderRadius: '1.5rem' }}>
      <Row gutter={[16,16]}>
        <Col xs={24} sm={12}>
          <Button
            type="primary"
            size="large"
            block
            icon={<GoogleIcon />}
            onClick={() => handle(signInWithGoogle)}
          >
            Sign in with Google
          </Button>
        </Col>
        <Col xs={24} sm={12}>
          <Button
            size="large"
            block
            icon={<AppleIcon />}
            onClick={() => handle(signInWithApple)}
          >
            Sign in with Apple
          </Button>
        </Col>
      </Row>
    </Card>
  );
}
