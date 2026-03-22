import React from 'react';
import { Key } from 'lucide-react';
import SettingItem from './SettingItem';

interface SecuritySectionProps {
  onOpenChangePassword: () => void;
}

/**
 * Security Settings Section
 * Hiện tại chỉ xử lý đổi mật khẩu.
 */
const SecuritySection: React.FC<SecuritySectionProps> = ({ onOpenChangePassword }) => {
  return (
    <div className="space-y-4 animate-fade-in">
      <SettingItem
        icon={<Key size={20} />}
        title="Đổi mật khẩu"
        description="Cập nhật mật khẩu để bảo vệ tài khoản"
        onClick={onOpenChangePassword}
      />
    </div>
  );
};

export default React.memo(SecuritySection);
