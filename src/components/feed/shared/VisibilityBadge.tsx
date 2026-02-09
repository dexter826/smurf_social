import React from 'react';
import { Globe, Users, Lock } from 'lucide-react';
import { Visibility } from '../../../types';

interface VisibilityBadgeProps {
  visibility: Visibility;
  size?: number;
  className?: string;
}

export const VisibilityBadge: React.FC<VisibilityBadgeProps> = ({
  visibility,
  size = 12,
  className = ''
}) => {
  const icons: Record<Visibility, { Icon: typeof Globe; title: string }> = {
    [Visibility.PUBLIC]: { Icon: Globe, title: 'Công khai' },
    [Visibility.FRIENDS]: { Icon: Users, title: 'Bạn bè' },
    [Visibility.PRIVATE]: { Icon: Lock, title: 'Chỉ mình tôi' }
  };

  const { Icon, title } = icons[visibility];
  return <Icon size={size} title={title} className={className} />;
};
