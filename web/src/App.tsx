// web/src/App.tsx
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { UploadValidate } from './components/UploadValidate';
import { MyFiles } from './components/MyFiles';
import SharedFiles from './components/SharedFiles';
import { SentFiles } from './components/SentFiles';
import { Contacts } from './components/Contacts';
import { Devices } from './components/Devices';

import { Account as AccountProfile } from './components/Account';
import Settings from './components/Settings';
import { AccountLanding } from './pages/AccountLanding';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import { Spin } from 'antd';

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
        <Route path="/" element={<AccountLanding />} />
        <Route
          path="/account"
          element={
            auth.currentUser ? <AccountProfile /> : <AccountLanding />
          }
        />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/parse" element={<ProtectedRoute><UploadValidate /></ProtectedRoute>} />
        <Route path="/files" element={<ProtectedRoute><MyFiles /></ProtectedRoute>} />
        <Route path="/shared" element={<ProtectedRoute><SharedFiles /></ProtectedRoute>} />
        <Route path="/sent" element={<ProtectedRoute><SentFiles /></ProtectedRoute>} />
        <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
        <Route path="/devices" element={<ProtectedRoute><Devices /></ProtectedRoute>} />
        <Route path="*" element={<ProtectedRoute><Navigate to="/parse" replace /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

