import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  MenuOutlined,
  UserOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  TeamOutlined,
  ContactsOutlined,
  MobileOutlined,
} from '@ant-design/icons';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === '1';
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width', collapsed ? '4rem' : '16rem'
    );
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
    }
  }, [collapsed]);

  const links: [string, string, JSX.Element][] = [
    ['/account', 'Account', <UserOutlined />],
    ['/parse', 'Validate', <FileSearchOutlined />],
    ['/files', 'Files', <FolderOpenOutlined />],
    ['/groups', 'Groups', <TeamOutlined />],
    ['/contacts', 'Contacts', <ContactsOutlined />],
    ['/devices', 'Devices', <MobileOutlined />],
  ];

  return (
    <>
      <button className="sidebar-hamburger" onClick={() => setOpen(true)}>
        <MenuOutlined />
      </button>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <aside
        className={`sidebar${collapsed ? ' collapsed' : ''}${open ? ' open' : ''}`}
      >
        <div className="sidebar-inner">
          <button
            className="collapse-toggle"
            onClick={() => (open ? setOpen(false) : setCollapsed(!collapsed))}
          >
            <MenuOutlined />
          </button>
          <nav className="sidebar-nav">
            {links.map(([to, label, icon]) => (
              <NavLink key={to} to={to} className="sidebar-link">
                {icon}
                <span className="label">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}

