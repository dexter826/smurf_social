import React from 'react';
import { formatStatusTime } from '../../utils/dateUtils';
import { UserStatus } from '../../types';
import { usePresence } from '../../hooks/usePresence';

interface UserStatusTextProps {
  userId: string;
  className?: string;
  initialStatus?: UserStatus;
  onlineText?: string;
  offlineText?: string;
}

export const UserStatusText: React.FC<UserStatusTextProps> = ({
  userId,
  className = '',
  initialStatus,
  onlineText = 'Đang hoạt động',
  offlineText = 'Không hoạt động'
}) => {
  const presence = usePresence(userId, initialStatus);

  if (presence?.status === UserStatus.BANNED) {
    return null;
  }

  const getStatusText = () => {
    if (presence?.status === UserStatus.ONLINE) return onlineText;
    
    if (presence?.lastSeen) {
      const date = new Date(presence.lastSeen);
      return formatStatusTime(date);
    }
    
    return offlineText;
  };

  return (
    <span className={`${className} ${presence?.status === UserStatus.ONLINE ? '!text-status-online font-medium' : ''}`}>
      {getStatusText()}
    </span>
  );
};
