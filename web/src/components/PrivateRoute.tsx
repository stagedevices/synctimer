import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { Spin } from 'antd';
import type { JSX } from 'react';

export function PrivateRoute({ children }: { children: JSX.Element }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <Spin tip="Loading…" />;
  return user ? children : <Navigate to="/" replace />;
}
