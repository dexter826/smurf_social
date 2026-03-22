import React from 'react';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Common Row for Settings
 * Đã thêm hỗ trợ cho className và disabled state.
 */
const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  description,
  action,
  onClick,
  className = '',
  disabled = false,
}) => {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`flex items-center justify-between p-4 bg-bg-primary rounded-xl border-2 border-border-light transition-all duration-base ${
        onClick && !disabled ? 'cursor-pointer hover:bg-bg-hover active:bg-bg-active' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <div className="flex items-center gap-4">
        <div className="p-2 bg-primary-light rounded-lg text-primary">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate">{title}</h3>
          <p className="text-sm text-text-tertiary">{description}</p>
        </div>
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
};

export default React.memo(SettingItem);
