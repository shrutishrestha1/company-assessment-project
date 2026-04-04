import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { section: 'Management' },
  { path: '/users', icon: '👥', label: 'Users', adminOnly: true },
  { path: '/senders', icon: '📤', label: 'Senders' },
  { path: '/receivers', icon: '📥', label: 'Receivers' },
  { section: 'Operations' },
  { path: '/transfer', icon: '💸', label: 'Send Money' },
  { path: '/reports', icon: '📊', label: 'Reports' },
];

const pageTitles = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your remittance operations' },
  '/users': { title: 'User Management', subtitle: 'Manage system users and permissions' },
  '/senders': { title: 'Senders', subtitle: 'Manage sender profiles from Japan' },
  '/receivers': { title: 'Receivers', subtitle: 'Manage receiver profiles in Nepal' },
  '/transfer': { title: 'Send Money', subtitle: 'Create a new money transfer (JPY → NPR)' },
  '/reports': { title: 'Transaction Reports', subtitle: 'View and filter transaction history' },
};

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const pageInfo = pageTitles[location.pathname] || { title: 'RemitApp', subtitle: '' };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully.');
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Remit<span>App</span></h1>
          <p>Japan → Nepal Transfer</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, idx) => {
            if (item.section) {
              return <div key={idx} className="nav-section-label">{item.section}</div>;
            }
            if (item.adminOnly && user?.role !== 'admin') return null;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <div>
              <div className="user-name">{user?.fullName}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
            <span className="nav-icon">→</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="top-header">
          <div>
            <div className="page-title">{pageInfo.title}</div>
            {pageInfo.subtitle && <div className="page-subtitle">{pageInfo.subtitle}</div>}
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
