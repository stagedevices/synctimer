// web/src/App.tsx
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { UploadValidate } from './components/UploadValidate';
import { MyFiles } from './components/MyFiles';
import SharedFiles from './components/SharedFiles';
import { SentFiles } from './components/SentFiles';
import { Contacts } from './components/Contacts';
import { Devices } from './components/Devices';
import { Account } from './pages/Account';
import Settings from './components/Settings';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import { Spin } from 'antd';
import type { JSX } from 'react';

function RequireAuth({ children }: { children: JSX.Element }) {
  return auth.currentUser ? children : <Navigate to="/account" replace />;
}

export function App() {
  const [user, loading] = useAuthState(auth);
  if (loading) return <Spin />;

  return (
    <BrowserRouter>
      {user && (
        <nav className="p-4 space-x-4 glass-nav">
          <Link to="/account">Account</Link>
          <Link to="/settings">Settings</Link>
          <Link to="/parse">Validate XML</Link>
          <Link to="/files">My Files</Link>
          <Link to="/shared">Shared with Me</Link>
          <Link to="/sent">Sent Files</Link>
          <Link to="/contacts">Contacts</Link>
          <Link to="/devices">Link Phone</Link>
        </nav>
      )}
      <Routes>
        <Route path="/account" element={<Account />} />
        <Route path="/" element={<RequireAuth><Navigate to="/parse" replace /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/parse" element={<RequireAuth><UploadValidate /></RequireAuth>} />
        <Route path="/files" element={<RequireAuth><MyFiles /></RequireAuth>} />
        <Route path="/shared" element={<RequireAuth><SharedFiles /></RequireAuth>} />
        <Route path="/sent" element={<RequireAuth><SentFiles /></RequireAuth>} />
        <Route path="/contacts" element={<RequireAuth><Contacts /></RequireAuth>} />
        <Route path="/devices" element={<RequireAuth><Devices /></RequireAuth>} />
        <Route path="*" element={<RequireAuth><Navigate to="/parse" replace /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}

