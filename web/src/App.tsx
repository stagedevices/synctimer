// web/src/App.tsx
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
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
import { Spin } from 'antd';
import { PageAnimator } from './components/PageAnimator';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';


export function App() {
  const [, loading] = useAuthState(auth);
  if (loading) return <Spin />;

  return (
    <BrowserRouter>
      <Sidebar />
      <MainContent>
        <PageAnimator>
          <Routes>
          <Route path="/" element={<AccountLanding />} />
          <Route
            path="/account"
            element={auth.currentUser ? <AccountProfile /> : <AccountLanding />}
          />
          <Route
            path="/parse"
            element={
              <ProtectedRoute>
                <UploadValidate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/files"
            element={
              <ProtectedRoute>
                <Files />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <Groups />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <Contacts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/devices"
            element={
              <ProtectedRoute>
                <Devices />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <Navigate to="/parse" replace />
              </ProtectedRoute>
            }
          />
        </Routes>
        </PageAnimator>
      </MainContent>
    </BrowserRouter>
  );
}


