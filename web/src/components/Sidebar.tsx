import { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { Button, Drawer, Grid } from 'antd';
import {
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  TeamOutlined,
  ContactsOutlined,
  MobileOutlined,
} from '@ant-design/icons';

export function Sidebar() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true'
  );
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? '4rem' : '16rem'
    );
    localStorage.setItem('sidebarCollapsed', collapsed ? 'true' : 'false');
  }, [collapsed]);

  const toggleCollapse = useCallback(() => setCollapsed((c) => !c), []);

  const navItems = [
    ['/account', 'Account', <UserOutlined />],
    ['/parse', 'Validate XML', <FileSearchOutlined />],
    ['/files', 'Files', <FolderOpenOutlined />],
    ['/groups', 'Groups', <TeamOutlined />],
    ['/contacts', 'Contacts', <ContactsOutlined />],
    ['/devices', 'Devices', <MobileOutlined />],
  ] as const;

  const content = (
    <div className="sidebar-content">
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={toggleCollapse}
        className="collapse-btn"
      />
      <nav className="sidebar-nav">
        {navItems.map(([to, label, icon]) => (
          <NavLink key={to} to={to} className="sidebar-link">
            {icon}
            <span className="label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={() => setDrawer(true)}
          className="drawer-toggle"
        />
        <Drawer
          placement="left"
          open={drawer}
          onClose={() => setDrawer(false)}
          bodyStyle={{ padding: 0 }}
          width={256}
        >
          {content}
        </Drawer>
      </>
    );
  }

  return <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>{content}</aside>;
}

