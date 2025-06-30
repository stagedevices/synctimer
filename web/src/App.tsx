// web/src/App.tsx
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { Home } from './components/Home';
import { UploadValidate } from './components/UploadValidate';
import { MyFiles } from './components/MyFiles';
import SharedFiles from './components/SharedFiles';
import { SentFiles } from './components/SentFiles';
import { Contacts } from './components/Contacts';
import { Devices } from './components/Devices';
import { Account } from './components/Account';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import { Spin } from 'antd';

function RequireAuth({ children }: { children: JSX.Element }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <Spin tip="Loading…" />;
  return user ? children : <Navigate to="/" replace />;
}


export function App() {
  return (
    <BrowserRouter>
      <nav className="p-4 space-x-4 glass-nav">
        <Link to="/">Home</Link>
        <Link to="/parse">Validate XML</Link>
        <Link to="/files">My Files</Link>
        <Link to="/shared">Shared with Me</Link>
        <Link to="/sent">Sent Files</Link>
        <Link to="/contacts">Contacts</Link>
        <Link to="/devices">Link Phone</Link>
        <Link to="/account">Account</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/parse" element={<UploadValidate />} />
        <Route path="/files" element={<MyFiles />} />
        <Route path="/shared" element={<SharedFiles />} />
        <Route path="/sent" element={<SentFiles />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/devices" element={<Devices />} />
        <Route
          path="/account"
          element={
            <RequireAuth>
              <Account />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

