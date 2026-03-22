import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Settings,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  Shield
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { UserAvatar, ConfirmDialog } from '../components/ui';
import { useLogout } from '../hooks/utils/useLogout';

export const MobileMenuPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();
  const handleConfirmLogout = useLogout();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex flex-col min-h-full w-full bg-bg-secondary">
      {/* Header */}
      <div className="bg-bg-primary border-b border-border-light p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {user && (
            <UserAvatar
              userId={user.id}
              src={user.avatar.url}
              size="lg"
              initialStatus={user.status}
            />
          )}
          <div className="flex-1">
            <h2 className="font-bold text-lg text-text-primary">{user?.fullName}</h2>
            <p className="text-sm text-text-tertiary">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 p-3">
        <div className="space-y-1">
          {/* Xem hồ sơ */}
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-3 p-3.5 min-h-[60px] rounded-xl bg-bg-primary hover:bg-bg-hover active:bg-bg-active transition-all duration-base border-2 border-border-light"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserIcon size={22} />
            </div>
            <div className="flex-1 text-left">
              <span className="font-semibold text-text-primary">Xem hồ sơ</span>
              <p className="text-xs text-text-tertiary mt-0.5">Trang cá nhân của bạn</p>
            </div>
            <ChevronRight size={20} className="text-text-tertiary" />
          </button>

          {/* Cài đặt */}
          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center gap-3 p-3.5 min-h-[60px] rounded-xl bg-bg-primary hover:bg-bg-hover active:bg-bg-active transition-all duration-base border-2 border-border-light"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-secondary text-text-secondary">
              <Settings size={22} />
            </div>
            <div className="flex-1 text-left">
              <span className="font-semibold text-text-primary">Cài đặt</span>
              <p className="text-xs text-text-tertiary mt-0.5">Bảo mật, quyền riêng tư</p>
            </div>
            <ChevronRight size={20} className="text-text-tertiary" />
          </button>

          {/* Chế độ tối */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 p-3.5 min-h-[60px] rounded-xl bg-bg-primary hover:bg-bg-hover active:bg-bg-active transition-all duration-base border-2 border-border-light"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-secondary text-text-secondary">
              {mode === 'light' ? <Moon size={22} /> : <Sun size={22} />}
            </div>
            <div className="flex-1 text-left">
              <span className="font-semibold text-text-primary">Chế độ tối</span>
              <p className="text-xs text-text-tertiary mt-0.5">{mode === 'dark' ? 'Đang bật' : 'Đang tắt'}</p>
            </div>
            <div className={`w-12 h-7 rounded-full p-1 transition-all duration-base ${mode === 'dark' ? 'bg-primary' : 'bg-bg-tertiary'}`}>
              <div className={`w-5 h-5 bg-bg-primary rounded-full shadow transition-all duration-base ${mode === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </button>

          {/* Admin: Quản trị */}
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-3 p-3.5 min-h-[60px] rounded-xl bg-bg-primary hover:bg-bg-hover active:bg-bg-active transition-all duration-base border-2 border-border-light"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-warning/10 text-warning">
                <Shield size={22} />
              </div>
              <div className="flex-1 text-left">
                <span className="font-semibold text-text-primary">Quản trị</span>
                <p className="text-xs text-text-tertiary mt-0.5">Quản lý hệ thống, người dùng...</p>
              </div>
              <ChevronRight size={20} className="text-text-tertiary" />
            </button>
          )}

          <div className="h-3" />

          {/* Đăng xuất */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 p-3.5 min-h-[60px] rounded-xl bg-bg-primary hover:bg-bg-hover active:bg-bg-active transition-all duration-base border-2 border-border-light group"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-error/10 text-error transition-colors group-hover:bg-error/20">
              <LogOut size={22} />
            </div>
            <div className="flex-1 text-left">
              <span className="font-semibold text-error">Đăng xuất</span>
              <p className="text-xs text-text-tertiary mt-0.5">Rời khỏi phiên làm việc</p>
            </div>
            <ChevronRight size={20} className="text-text-tertiary" />
          </button>
        </div>
      </div>

      {/* Logout Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        title="Đăng xuất"
        message="Bạn có chắc chắn muốn rời khỏi phiên làm việc này?"
        confirmLabel="Đăng xuất"
      />
    </div>
  );
};

export default MobileMenuPage;
