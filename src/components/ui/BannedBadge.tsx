import React from 'react';
import { Lock } from 'lucide-react';

interface BannedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { icon: 10, className: 'text-[10px] text-error bg-error/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0', showText: false },
  md: { icon: 10, className: 'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-error/10 text-error', showText: true },
  lg: { icon: 12, className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-error/10 text-error', showText: true },
};

export const BannedBadge: React.FC<BannedBadgeProps> = ({ size = 'md' }) => {
  const config = sizeConfig[size];
  return (
    <span className={config.className}>
      <Lock size={config.icon} />
      {config.showText && 'Đã khóa'}
    </span>
  );
};
