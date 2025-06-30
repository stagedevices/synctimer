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
        {!auth.currentUser ? (
          <Route path="*" element={<Navigate to="/account" replace />} />
        ) : (
          <>
            <Route path="/" element={<Navigate to="/parse" replace />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/parse" element={<UploadValidate />} />
            <Route path="/files" element={<MyFiles />} />
            <Route path="/shared" element={<SharedFiles />} />
            <Route path="/sent" element={<SentFiles />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="*" element={<Navigate to="/parse" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

