import React from 'react';
import { Globe, Users, Lock } from 'lucide-react';

interface VisibilityBadgeProps {
  visibility: 'public' | 'friends' | 'private';
  size?: number;
  className?: string;
}

export const VisibilityBadge: React.FC<VisibilityBadgeProps> = ({
  visibility,
  size = 12,
  className = ''
}) => {
  const icons = {
    public: { Icon: Globe, title: 'Công khai' },
    friends: { Icon: Users, title: 'Bạn bè' },
    private: { Icon: Lock, title: 'Chỉ mình tôi' }
  };

  const { Icon, title } = icons[visibility];
  return <Icon size={size} title={title} className={className} />;
};
