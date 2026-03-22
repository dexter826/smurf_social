import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import SettingItem from './SettingItem';
import Toggle from './Toggle';

/**
 * Appearance Settings Section
 * Quản lý giao diện Sáng/Tối.
 */
const AppearanceSection: React.FC = () => {
  const { mode, toggleTheme } = useThemeStore();

  return (
    <div className="space-y-4 animate-fade-in">
      <SettingItem
        icon={mode === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
        title="Chế độ tối"
        description={mode === 'dark' ? 'Đang bật' : 'Đang tắt'}
        action={<Toggle enabled={mode === 'dark'} onToggle={toggleTheme} />}
      />
    </div>
  );
};

export default React.memo(AppearanceSection);
