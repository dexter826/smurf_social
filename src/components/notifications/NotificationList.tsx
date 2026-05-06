import React from 'react';
import { BellOff } from 'lucide-react';
import { EmptyState } from '../ui';
import { NotificationType } from '../../../shared/types';
import { useNotificationStore } from '../../store/notificationStore';
import { useLoadingStore } from '../../store/loadingStore';
import { NotificationItem } from './NotificationItem';
import { NotificationSkeleton } from './NotificationSkeleton';

interface NotificationListProps {
  onItemClick?: () => void;
  maxHeight?: string;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  onItemClick,
  maxHeight = '420px',
}) => {
  const notifications = useNotificationStore(state => state.notifications);
  const isLoading = useLoadingStore(state => state.loadingStates['notifications']);

  const visible = notifications.filter(n => {
    if (n.type !== NotificationType.REPORT) return true;
    return !(n.data?.contentSnippet ?? '').includes('bị khóa');
  });

  if (isLoading && visible.length === 0) return <NotificationSkeleton />;

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={BellOff}
        title="Chưa có thông báo"
        description="Chưa có hoạt động mới nào."
        className="py-20 px-10"
      />
    );
  }

  return (
    <div
      className="overflow-y-auto scroll-hide p-2 flex flex-col gap-1.5"
      style={{ maxHeight }}
    >
      {visible.map(n => (
        <NotificationItem key={n.id} notification={n} onClick={onItemClick} />
      ))}
    </div>
  );
};
