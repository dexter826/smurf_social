import React from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import { NotificationItem } from './NotificationItem';
import { Spinner } from '../ui';
import { BellOff } from 'lucide-react';

interface NotificationListProps {
  onItemClick?: () => void;
  maxHeight?: string;
}

export const NotificationList: React.FC<NotificationListProps> = ({ onItemClick, maxHeight = '400px' }) => {
  const { notifications, isLoading } = useNotificationStore();

  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <Spinner size="md" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-text-tertiary">
        <BellOff size={40} className="mb-2 opacity-20" />
        <p className="text-sm">Chưa có thông báo nào</p>
      </div>
    );
  }

  return (
    <div 
      className="overflow-y-auto custom-scrollbar" 
      style={{ maxHeight }}
    >
      <div className="flex flex-col">
        {notifications.map((notification) => (
          <NotificationItem 
            key={notification.id} 
            notification={notification} 
            onClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
};
