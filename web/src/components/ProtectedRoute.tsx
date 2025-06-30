import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { Spin } from 'antd';
import type { JSX } from 'react';

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [, loading] = useAuthState(auth);
  if (loading) return <Spin />;
  return auth.currentUser ? children : <Navigate to="/" replace />;
}
