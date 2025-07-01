import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Spin } from 'antd';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { toast } from '../lib/toast';

export function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(location.search).get('token');
    if (!token) {
      setError('Invalid link.');
      setLoading(false);
      return;
    }
    const url = `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/verifyEmail?token=${token}`;
    fetch(url)
      .then(async (resp) => {
        if (resp.ok) {
          toast.success('Your email has been updated successfully.');
          navigate('/account#emailUpdated', { replace: true });
        } else {
          const data = await resp.json().catch(async () => ({ error: await resp.text() }));
          setError(data.error || 'Verification failed.');
          if (data.newEmail) setResendEmail(data.newEmail as string);
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [location.search, navigate]);

  const resend = async () => {
    if (!resendEmail) return;
    try {
      await httpsCallable(functions, 'initiateEmailChange')({
        newEmail: resendEmail,
        currentPassword: '',
      });
      toast.success(`Verification email sent to ${resendEmail}.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    }
  };

  if (loading) return <Spin />;
  if (error) {
    return (
      <Card className="glass-card" style={{ maxWidth: 400, margin: '2rem auto' }}>
        <p>{error}</p>
        {resendEmail && (
          <Button type="primary" onClick={resend} style={{ marginTop: 8 }}>
            Resend verification email
          </Button>
        )}
      </Card>
    );
  }
  return null;
}
