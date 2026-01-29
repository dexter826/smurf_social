import React from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import { NotificationItem } from './NotificationItem';
import { NotificationSkeleton } from './NotificationSkeleton';
import { BellOff } from 'lucide-react';

interface NotificationListProps {
  onItemClick?: () => void;
  maxHeight?: string;
}

export const NotificationList: React.FC<NotificationListProps> = ({ onItemClick, maxHeight = '400px' }) => {
  const { notifications, isLoading, isRevalidating } = useNotificationStore();

  if (isLoading && notifications.length === 0) {
    return <NotificationSkeleton />;
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
      className="overflow-y-auto custom-scrollbar relative" 
      style={{ maxHeight }}
    >
      {/* Banner cập nhật thông báo */}
      {isRevalidating && (
        <div className="sticky top-0 z-10 bg-primary/10 backdrop-blur-sm text-center py-1 border-b border-primary/20">
          <span className="text-[10px] text-primary font-bold animate-pulse">
            ĐANG CẬP NHẬT...
          </span>
        </div>
      )}
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
