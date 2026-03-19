import React from 'react';
import { Trash2, Bell, ShieldAlert } from 'lucide-react';
import { formatRelativeTime, formatDateTime } from '../../utils/dateUtils';
import { Notification, NotificationType } from '../../../shared/types';
import { UserAvatar, Button, Skeleton } from '../ui';
import { notificationService } from '../../services/notificationService';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import { useUserCache } from '../../store/userCacheStore';
import { useEffect } from 'react';

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => {
  const navigate = useNavigate();
  const markAsRead = useNotificationStore(state => state.markAsRead);
  const deleteNotification = useNotificationStore(state => state.deleteNotification);
  const { getUser, fetchUser } = useUserCache();
  const sender = getUser(notification.actorId);

  useEffect(() => {
    if (notification.actorId && notification.actorId !== 'system' && !sender) {
      fetchUser(notification.actorId);
    }
  }, [notification.actorId, sender, fetchUser]);

  const handleItemClick = async () => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    const { user: currentUser } = useAuthStore.getState();

    if (onClick) {
      onClick();
    }

    switch (notification.type) {
      case NotificationType.REACTION:
      case NotificationType.COMMENT:
        if (notification.data.postId) {
          navigate(`/post/${notification.data.postId}`);
        }
        break;
      case NotificationType.FRIEND_REQUEST:
        navigate('/contacts');
        break;
      case NotificationType.REPORT:
        if (currentUser?.role === 'admin') {
          navigate('/admin/reports');
        } else {
          navigate('/notifications');
        }
        break;
      case NotificationType.SYSTEM:
        if (notification.data.friendRequestId) {
          navigate(`/profile/${notification.actorId}`);
        } else {
          navigate('/notifications');
        }
        break;
      default:
        break;
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notification.id);
  };

  const shouldShowAvatar = notification.actorId && notification.actorId !== 'system';

  return (
    <div
      className={`group relative flex items-start gap-4 p-4 cursor-pointer hover:bg-bg-hover active:bg-bg-active transition-all duration-base rounded-2xl mb-1 ${
        !notification.isRead ? 'bg-primary/[0.02]' : 'bg-transparent'
      }`}
      onClick={handleItemClick}
    >
      {/* Chỉ báo chưa đọc bên trái */}
      {!notification.isRead && (
        <div className="absolute left-0 top-4 bottom-4 w-1 bg-primary rounded-r-md" />
      )}

      <div className="shrink-0">
        {shouldShowAvatar ? (
          <UserAvatar userId={notification.actorId} size="lg" showStatus={false} className="shadow-sm" />
        ) : (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
            notification.type === NotificationType.REPORT ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
          }`}>
            {notification.type === NotificationType.REPORT ? <ShieldAlert size={24} strokeWidth={2.5} /> : <Bell size={24} strokeWidth={2.5} />}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 pt-0.5 ml-1">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className={`text-[15px] leading-snug break-words ${!notification.isRead ? 'text-text-primary' : 'text-text-secondary'}`}>
              {shouldShowAvatar && (
                <span className="text-text-primary font-bold hover:underline cursor-pointer mr-1.5">
                  {sender?.fullName || <Skeleton width={60} height={14} className="inline-block" />}
                </span>
              )}
              <span className={!notification.isRead ? 'text-text-primary font-semibold' : 'text-text-tertiary font-medium'}>
                {(() => {
                  const rawText = notificationService.getNotificationText(notification);
                  if (shouldShowAvatar && sender?.fullName && rawText.startsWith(sender.fullName)) {
                    return rawText.replace(sender.fullName, '').trim();
                  }
                  return rawText;
                })()}
              </span>
            </p>
            
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[12px] text-text-tertiary opacity-70" title={formatDateTime(notification.createdAt)}>
                {formatRelativeTime(notification.createdAt)}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-2 shrink-0">
             {!notification.isRead && (
              <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.5)]" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-error hover:bg-error/10 transition-all duration-base rounded-xl p-1"
              icon={<Trash2 size={16} />}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
