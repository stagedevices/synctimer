// web/src/App.tsx
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { UploadValidate } from './components/UploadValidate';
import { Files } from './components/Files';
import { Contacts } from './components/Contacts';
import { Devices } from './components/Devices';
import { Groups } from './components/Groups';

import { Account as AccountProfile } from './components/Account';
import { AccountLanding } from './pages/AccountLanding';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import { Spin, Button, Badge } from 'antd';
import { signOut } from 'firebase/auth';
import { BellOutlined } from '@ant-design/icons';
import { useIncomingCount } from './hooks/useFriends';


export function App() {
  const [user, loading] = useAuthState(auth);
  const incoming = useIncomingCount();
  if (loading) return <Spin />;

  return (
    <BrowserRouter>
      {user && (
        <nav className="p-4 space-x-4 glass-nav">
          <Link to="/account">Account</Link>
          <Link to="/parse">Validate XML</Link>
          <Link to="/files">Files</Link>
          <Link to="/groups">Groups</Link>
          <Link to="/contacts">Contacts</Link>
          <Badge count={incoming} offset={[0,0]}>
            <BellOutlined style={{ fontSize: 18, marginLeft: 8 }} />
          </Badge>
          <Link to="/devices">Link Phone</Link>
          <Button type="link" onClick={() => signOut(auth)}>
            Sign Out
          </Button>
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
        <Route path="/parse" element={<ProtectedRoute><UploadValidate /></ProtectedRoute>} />
        <Route path="/files" element={<ProtectedRoute><Files /></ProtectedRoute>} />
        <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
        <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
        <Route path="/devices" element={<ProtectedRoute><Devices /></ProtectedRoute>} />
        <Route path="*" element={<ProtectedRoute><Navigate to="/parse" replace /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

