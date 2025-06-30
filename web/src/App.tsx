// web/src/App.tsx
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Home } from './components/Home';
import { UploadValidate } from './components/UploadValidate';
import { MyFiles } from './components/MyFiles';
import SharedFiles from './components/SharedFiles';
import { SentFiles } from './components/SentFiles';
import { Contacts } from './components/Contacts';
import { Devices } from './components/Devices';
import { Account } from './components/Account';
import Settings from './components/Settings';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import { PrivateRoute } from './components/PrivateRoute';

export function App() {
  const [user] = useAuthState(auth);
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
        <Route path="/" element={<Home />} />
        <Route
          path="/account"
          element={
            <PrivateRoute>
              <Account />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route
          path="/parse"
          element={
            <PrivateRoute>
              <UploadValidate />
            </PrivateRoute>
          }
        />
        <Route
          path="/files"
          element={
            <PrivateRoute>
              <MyFiles />
            </PrivateRoute>
          }
        />
        <Route
          path="/shared"
          element={
            <PrivateRoute>
              <SharedFiles />
            </PrivateRoute>
          }
        />
        <Route
          path="/sent"
          element={
            <PrivateRoute>
              <SentFiles />
            </PrivateRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <PrivateRoute>
              <Contacts />
            </PrivateRoute>
          }
        />
        <Route
          path="/devices"
          element={
            <PrivateRoute>
              <Devices />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

