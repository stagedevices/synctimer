import type { ReactNode } from 'react';
import { NotificationsBell } from './NotificationsBell';

export function MainContent({ children }: { children: ReactNode }) {
  return (
    <main className="main-content">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <NotificationsBell />
      </div>
      {children}
    </main>
  );
}
