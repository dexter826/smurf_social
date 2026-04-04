import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Shield, Users, Flag, LogOut, Moon, Sun, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { ConfirmDialog, UserAvatar } from '../ui';
import { useLogout } from '../../hooks/utils/useLogout';

const navItems = [
  { to: '/admin/reports', icon: Flag, label: 'Báo cáo vi phạm' },
  { to: '/admin/users', icon: Users, label: 'Quản lý người dùng' },
];

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();
  const handleConfirmLogout = useLogout();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full bg-bg-secondary overflow-hidden transition-theme">

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden md:flex flex-col w-[280px] bg-bg-primary border-r border-border-light"
        style={{ zIndex: 'var(--z-header)' }}
      >
        {/* Sidebar header */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-border-light flex-shrink-0">
          <div className="w-9 h-9 rounded-xl btn-gradient flex items-center justify-center shadow-accent flex-shrink-0">
            <Shield size={18} className="text-white" />
          </div>
          <span className="font-bold text-text-primary text-sm tracking-wide">Admin Panel</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <p className="px-3 pt-2 pb-1.5 text-xs font-semibold text-text-tertiary uppercase tracking-widest">
            Quản trị
          </p>

          <button
            onClick={() => navigate('/')}
            className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary active:bg-bg-active rounded-xl transition-all duration-200 mb-2"
          >
            <ChevronLeft size={18} />
            Quay lại App
          </button>

          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl transition-all duration-200 text-sm font-medium
                ${isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary active:bg-bg-active'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-border-light space-y-0.5 flex-shrink-0">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary active:bg-bg-active rounded-xl transition-all duration-200"
          >
            {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            {mode === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
          </button>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] text-sm font-medium text-text-secondary hover:bg-error/10 hover:text-error active:bg-bg-active rounded-xl transition-all duration-200"
          >
            <LogOut size={18} />
            Đăng xuất
          </button>

          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl bg-bg-secondary/60">
            <UserAvatar
              userId={user?.id || ''}
              src={user?.avatar?.url}
              name={user?.fullName}
              size="sm"
              initialStatus={user?.status}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-text-primary truncate">{user?.fullName}</span>
              <span className="text-xs text-text-tertiary">Administrator</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile Header */}
        <header
          className="md:hidden h-16 bg-bg-primary border-b border-border-light flex items-center justify-between px-4 sticky top-0 flex-shrink-0"
          style={{ zIndex: 'var(--z-header)' }}
        >
          <button
            onClick={() => navigate('/')}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary hover:text-primary transition-all duration-200 rounded-xl hover:bg-bg-hover"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg btn-gradient flex items-center justify-center">
              <Shield size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm">Admin Panel</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary hover:text-primary transition-all duration-200 rounded-xl hover:bg-bg-hover"
          >
            {mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </header>

        {/* Mobile Tabs */}
        <nav className="md:hidden flex overflow-x-auto border-b border-border-light bg-bg-primary px-3 py-2 gap-1.5 scroll-hide flex-shrink-0">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-shrink-0 flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200
                ${isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary active:bg-bg-active'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        title="Đăng xuất Admin"
        message="Bạn có chắc chắn muốn thoát khỏi phiên làm việc quản trị?"
        confirmLabel="Đăng xuất"
      />
    </div>
  );
};
