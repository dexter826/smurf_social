import React from 'react';
import { Eye, MessageCircle, Users, Lock, Settings2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService';
import { presenceService } from '../../services/presenceService';
import { Visibility } from '../../../shared/types';
import { Skeleton, Dropdown, DropdownItem } from '../ui';
import SettingItem from './SettingItem';
import Toggle from './Toggle';

/**
 * Privacy Settings Section
 * Quản lý trạng thái online, thông báo và quyền riêng tư bài viết.
 */
const PrivacySection: React.FC = () => {
  const { user: currentUser, settings, updateSettings } = useAuthStore();

  if (!settings || !currentUser) return <Skeleton height={200} className="rounded-xl" />;

  const handleToggleOnlineStatus = async () => {
    const newValue = !settings.showOnlineStatus;
    updateSettings({ showOnlineStatus: newValue });
    await userService.updateUserSettings(currentUser.id, { showOnlineStatus: newValue });
    await presenceService.setOnline(currentUser.id).catch(err =>
      console.error('Lỗi đồng bộ RTDB khi đổi settings:', err)
    );
  };

  const handleToggleReadReceipts = async () => {
    const newValue = !settings.showReadReceipts;
    updateSettings({ showReadReceipts: newValue });
    await userService.updateUserSettings(currentUser.id, { showReadReceipts: newValue });
  };

  const handleChangeVisibility = async (visibility: Visibility) => {
    updateSettings({ defaultPostVisibility: visibility });
    await userService.updateUserSettings(currentUser.id, { defaultPostVisibility: visibility });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <SettingItem
        icon={<Eye size={20} />}
        title="Trạng thái online"
        description="Cho phép người khác thấy bạn đang hoạt động"
        action={<Toggle enabled={settings.showOnlineStatus} onToggle={handleToggleOnlineStatus} />}
      />

      <SettingItem
        icon={<MessageCircle size={20} />}
        title="Thông báo đã xem"
        description="Cho phép người khác biết khi bạn đã xem tin nhắn"
        action={<Toggle enabled={settings.showReadReceipts} onToggle={handleToggleReadReceipts} />}
      />

      {/* Default Post Visibility */}
      <div className="p-4 bg-bg-primary rounded-xl border-2 border-border-light shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2 bg-primary-light rounded-lg text-primary">
            <Users size={20} />
          </div>
          <div>
            <h3 className="font-medium text-text-primary">Quyền riêng tư bài viết mặc định</h3>
            <p className="text-sm text-text-tertiary">Áp dụng cho các bài viết mới của bạn</p>
          </div>
        </div>

        <Dropdown
          align="left"
          className="w-full"
          matchTriggerWidth
          trigger={
            <div className="flex items-center justify-between w-full px-4 py-3 bg-bg-secondary rounded-xl border border-border-light hover:bg-bg-hover active:bg-bg-active transition-all duration-base cursor-pointer">
              <div className="flex items-center gap-3">
                {settings.defaultPostVisibility === Visibility.FRIENDS && <Users size={18} className="text-primary" />}
                {settings.defaultPostVisibility === Visibility.PRIVATE && <Lock size={18} className="text-primary" />}
                <span className="text-sm font-semibold text-text-primary">
                  {settings.defaultPostVisibility === Visibility.FRIENDS && 'Bạn bè'}
                  {settings.defaultPostVisibility === Visibility.PRIVATE && 'Chỉ mình tôi'}
                </span>
              </div>
              <Settings2 size={16} className="text-text-tertiary" />
            </div>
          }
        >

          <DropdownItem
            icon={<Users size={16} />}
            label="Bạn bè"
            onClick={() => handleChangeVisibility(Visibility.FRIENDS)}
          />
          <DropdownItem
            icon={<Lock size={16} />}
            label="Chỉ mình tôi"
            onClick={() => handleChangeVisibility(Visibility.PRIVATE)}
          />
        </Dropdown>
      </div>
    </div>
  );
};

export default React.memo(PrivacySection);
