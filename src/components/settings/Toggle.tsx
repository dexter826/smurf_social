import React from 'react';

interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * Switch Toggle Component
 * Đã tối ưu hóa cho hiệu năng bằng React.memo.
 */
const Toggle: React.FC<ToggleProps> = ({ enabled, onToggle, disabled = false }) => {
  return (
    <div
      onClick={!disabled ? onToggle : undefined}
      className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-base ${
        enabled ? 'bg-primary' : 'bg-bg-tertiary'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div
        className={`w-4 h-4 bg-bg-primary rounded-full shadow-md transition-transform duration-base ${
          enabled ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </div>
  );
};

export default React.memo(Toggle);
