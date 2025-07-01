import { NavLink } from 'react-router-dom';
import {
  UserOutlined,
  FileSearchOutlined,
  FileOutlined,
  TeamOutlined,
  ContactsOutlined,
  MobileOutlined,
  MenuOutlined,
  LogoutOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { Drawer, Button } from 'antd';
import { useState, type ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useIncomingCount } from '../hooks/useFriends';
import { Badge } from 'antd';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface SidebarProps {
  children: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === '1',
  );
  const incoming = useIncomingCount();

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
  };

  const links = [
    ['/account', 'Account', <UserOutlined />],
    ['/parse', 'Validate XML', <FileSearchOutlined />],
    ['/files', 'Files', <FileOutlined />],
    ['/groups', 'Groups', <TeamOutlined />],
    ['/contacts', 'Contacts', <ContactsOutlined />],
    ['/devices', 'Devices', <MobileOutlined />],
  ] as const;

  const nav = (
    <div className="sidebar-content">
      <nav>
        {links.map(([to, label, icon]) => (
          <NavLink key={to} to={to} className="sidebar-link">
            {({ isActive }) => (
              <span className="link-inner">
                {icon}
                {!collapsed && (
                  <span className={isActive ? 'active' : undefined}>{label}</span>
                )}
              </span>
            )}
          </NavLink>
        ))}
        <div className="incoming">
          <Badge count={incoming} offset={[0, 0]}>
            <BellOutlined />
          </Badge>
        </div>
      </nav>
      <div className="sidebar-footer">
        <Button type="text" onClick={toggleCollapse} icon={<MenuOutlined />} />
        {!collapsed && auth.currentUser && (
          <Button
            type="text"
            onClick={() => signOut(auth)}
            icon={<LogoutOutlined />}
          />
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="layout mobile">
        <div className="topbar">
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setOpen(true)}
          />
        </div>
        <Drawer
          placement="left"
          closable={false}
          onClose={() => setOpen(false)}
          open={open}
          width={256}
          bodyStyle={{ padding: 0 }}
        >
          {nav}
        </Drawer>
        <main className="content">{children}</main>
      </div>
    );
  }

  return (
    <div className="layout">
      <aside className={collapsed ? 'sidebar collapsed' : 'sidebar'}>{nav}</aside>
      <main className="content">{children}</main>
    </div>
  );
}
