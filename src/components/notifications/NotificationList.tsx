import React from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import { useLoadingStore } from '../../store/loadingStore';
import { NotificationItem } from './NotificationItem';
import { NotificationSkeleton } from './NotificationSkeleton';
import { BellOff } from 'lucide-react';
import { NotificationType } from '../../../shared/types';

interface NotificationListProps {
  onItemClick?: () => void;
  maxHeight?: string;
}

export const NotificationList: React.FC<NotificationListProps> = ({ onItemClick, maxHeight = '400px' }) => {
  const { notifications } = useNotificationStore();
  const isLoading = useLoadingStore(state => state.loadingStates['notifications']);

  const visibleNotifications = notifications.filter(n => {
    if (n.type !== NotificationType.REPORT) return true;
    return !(n.data?.contentSnippet ?? '').includes('bị khóa');
  });

  if (isLoading && visibleNotifications.length === 0) {
    return <NotificationSkeleton />;
  }

  if (visibleNotifications.length === 0) {
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
      <div className="flex flex-col">
        {visibleNotifications.map((notification) => (
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
