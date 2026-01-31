import React, { useState, useEffect } from 'react';
import { 
  Ban, 
  UserCheck, 
  Shield, 
  Key, 
  Moon, 
  Sun,
  Flag,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { userService } from '../services/userService';
import { User } from '../types';
import { UserAvatar, ConfirmDialog, Button, Skeleton } from '../components/ui';
import ChangePasswordModal from '../components/settings/ChangePasswordModal';

type SettingSection = 'appearance' | 'security' | 'blocked' | 'admin';

const BASE_MENU_ITEMS: { id: SettingSection; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: 'appearance', label: 'Giao diện', icon: <Moon size={20} /> },
  { id: 'security', label: 'Bảo mật', icon: <Shield size={20} /> },
  { id: 'blocked', label: 'Người dùng đã chặn', icon: <Ban size={20} /> },
  { id: 'admin', label: 'Quản lý báo cáo', icon: <Flag size={20} />, adminOnly: true },
];

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, setUser } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();
  
  const [activeSection, setActiveSection] = useState<SettingSection>('appearance');
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockUserId, setUnblockUserId] = useState<string | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const MENU_ITEMS = BASE_MENU_ITEMS.filter(item => !item.adminOnly || isAdmin);

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      if (!currentUser?.blockedUserIds?.length) {
        setBlockedUsers([]);
        setIsLoading(false);
        return;
      }

      try {
        const users = await Promise.all(
          currentUser.blockedUserIds.map(id => userService.getUserById(id))
        );
        setBlockedUsers(users.filter((u): u is User => u !== null));
      } catch (error) {
        console.error("Lỗi lấy danh sách chặn", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlockedUsers();
  }, [currentUser?.blockedUserIds]);

  const handleUnblock = async () => {
    if (!unblockUserId || !currentUser) return;
    
    try {
      await userService.unblockUser(currentUser.id, unblockUserId);
      setBlockedUsers(prev => prev.filter(u => u.id !== unblockUserId));
    } catch (error) {
      console.error("Lỗi bỏ chặn", error);
    } finally {
      setUnblockUserId(null);
    }
  };
  // Toggle component
  const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <div 
      onClick={onToggle}
      className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ${
        enabled ? 'bg-primary' : 'bg-gray-400'
      }`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${
        enabled ? 'translate-x-6' : 'translate-x-0'
      }`} />
    </div>
  );

  // Setting Item component
  const SettingItem = ({ 
    icon, 
    title, 
    description, 
    action,
    onClick 
  }: { 
    icon: React.ReactNode; 
    title: string; 
    description: string; 
    action?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between p-4 bg-bg-primary rounded-xl border border-border-light ${
        onClick ? 'cursor-pointer hover:bg-bg-hover transition-colors' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="p-2 bg-primary-light rounded-lg text-primary">
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-text-primary">{title}</h3>
          <p className="text-sm text-text-tertiary">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );

  // Render section content
  const renderContent = () => {
    switch (activeSection) {
      case 'appearance':
        return (
          <div className="space-y-4">
            <SettingItem
              icon={mode === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              title="Chế độ tối"
              description={mode === 'dark' ? 'Đang bật' : 'Đang tắt'}
              action={<Toggle enabled={mode === 'dark'} onToggle={toggleTheme} />}
            />
          </div>
        );
      case 'security':
        return (
          <div className="space-y-4">
            <SettingItem
              icon={<Key size={20} />}
              title="Đổi mật khẩu"
              description="Cập nhật mật khẩu để bảo vệ tài khoản"
              onClick={() => setIsChangePasswordOpen(true)}
            />
          </div>
        );

      case 'blocked':
        return (
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-bg-primary rounded-xl border border-border-light">
                    <Skeleton variant="circle" width={40} height={40} />
                    <div className="flex-1 space-y-2">
                      <Skeleton width={120} height={16} />
                      <Skeleton width={80} height={12} />
                    </div>
                    <Skeleton width={80} height={32} />
                  </div>
                ))}
              </div>
            ) : blockedUsers.length === 0 ? (
              <div className="text-center py-12 text-text-tertiary bg-bg-primary rounded-xl border border-border-light">
                <Ban size={48} className="mx-auto mb-3 opacity-30" />
                <p>Chưa có người dùng nào bị chặn</p>
              </div>
            ) : (
              <div className="bg-bg-primary rounded-xl border border-border-light overflow-hidden">
                {blockedUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 border-b border-border-light last:border-b-0"
                  >
                    <UserAvatar 
                      userId={user.id}
                      src={user.avatar} 
                      name={user.name} 
                      size="md" 
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-text-primary truncate">{user.name}</h3>
                      <p className="text-sm text-text-tertiary truncate">
                        @{user.email?.split('@')[0]}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setUnblockUserId(user.id)}
                      icon={<UserCheck size={16} />}
                    >
                      Bỏ chặn
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'admin':
        return (
          <div className="space-y-4">
            <SettingItem
              icon={<Flag size={20} />}
              title="Quản lý báo cáo"
              description="Xem và xử lý các báo cáo vi phạm"
              onClick={() => navigate('/admin/reports')}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full w-full bg-bg-secondary">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-col w-[320px] border-r border-border-light bg-bg-primary pt-4">
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 text-sm font-semibold text-text-tertiary uppercase tracking-wider">
            Cài đặt
          </div>
          
          {MENU_ITEMS.map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3 mx-2 my-0.5 cursor-pointer rounded-xl transition-all ${
                activeSection === item.id 
                  ? 'bg-primary-light text-primary' 
                  : 'hover:bg-bg-hover text-text-secondary'
              }`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
              {item.id === 'blocked' && blockedUsers.length > 0 && (
                <span className="ml-auto text-xs bg-bg-secondary px-2 py-0.5 rounded-full border border-border-light">
                  {blockedUsers.length}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full bg-bg-primary md:bg-bg-secondary overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border-light bg-bg-primary flex-shrink-0">
          <h2 className="text-lg font-bold text-text-primary">
            {MENU_ITEMS.find(m => m.id === activeSection)?.label}
          </h2>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden flex overflow-x-auto border-b border-border-light bg-bg-primary px-2 py-2 gap-1 no-scrollbar flex-shrink-0">
          {MENU_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeSection === item.id 
                  ? 'bg-primary-light text-primary font-medium' 
                  : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4">
          <div className="max-w-2xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        isOpen={!!unblockUserId}
        onClose={() => setUnblockUserId(null)}
        onConfirm={handleUnblock}
        title="Bỏ chặn người dùng"
        message="Bạn có chắc chắn muốn bỏ chặn người này? Họ sẽ có thể gửi tin nhắn cho bạn."
        confirmLabel="Bỏ chặn"
      />
      <ChangePasswordModal 
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

export default SettingsPage;
