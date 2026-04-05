import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Send,
  Inbox,
  Banknote,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { BrandMark, BrandWordmark } from '../BrandLogo';
import { APP_TAGLINE } from '../../constants/brand';

const navItems = [
  { path: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
  { section: 'Management' },
  { path: '/users', Icon: Users, label: 'Users', adminOnly: true },
  { path: '/senders', Icon: Send, label: 'Senders' },
  { path: '/receivers', Icon: Inbox, label: 'Receivers' },
  { section: 'Operations' },
  { path: '/transfer', Icon: Banknote, label: 'Send Money' },
  { path: '/reports', Icon: BarChart3, label: 'Reports' },
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
  const pageInfo = pageTitles[location.pathname] || { title: 'Dashboard', subtitle: '' };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully.');
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-row">
            <BrandMark size={34} />
            <BrandWordmark />
          </div>
          <p>{APP_TAGLINE}</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, idx) => {
            if (item.section) {
              return <div key={idx} className="nav-section-label">{item.section}</div>;
            }
            if (item.adminOnly && user?.role !== 'admin') return null;
            const { Icon } = item;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <Icon className="nav-icon-svg" strokeWidth={1.75} aria-hidden />
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
          <button type="button" className="nav-item" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
            <LogOut className="nav-icon-svg" strokeWidth={1.75} aria-hidden />
            Logout
          </button>
        </div>
      </aside>

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
