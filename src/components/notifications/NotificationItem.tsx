import React from 'react';
import { Trash2 } from 'lucide-react';
import { formatRelativeTime } from '../../utils/dateUtils';
import { AppNotification, NotificationType } from '../../types';
import { UserAvatar, Button } from '../ui';
import { notificationService } from '../../services/notificationService';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';
import { usePostStore } from '../../store/postStore';
import { useAuthStore } from '../../store/authStore';
import { useUserCache } from '../../store/userCacheStore';
import { useEffect } from 'react';

interface NotificationItemProps {
  notification: AppNotification;
  onClick?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => {
  const navigate = useNavigate();
  const markAsRead = useNotificationStore(state => state.markAsRead);
  const deleteNotification = useNotificationStore(state => state.deleteNotification);
  const { getUser, fetchUser } = useUserCache();
  const sender = getUser(notification.senderId);

  useEffect(() => {
    if (!sender) {
      fetchUser(notification.senderId);
    }
  }, [notification.senderId, sender, fetchUser]);
  
  const handleItemClick = async () => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    const { fetchPostById } = usePostStore.getState();
    const { user } = useAuthStore.getState();

    if (onClick) {
      onClick();
    }

    // Điều hướng theo loại thông báo
    switch (notification.type) {
      case NotificationType.LIKE_POST:
      case NotificationType.COMMENT_POST:
        if (notification.data.postId && user) {
          fetchPostById(notification.data.postId, user.id, user.friendIds || []);
        }
        break;
      case NotificationType.FRIEND_REQUEST:
        navigate('/contacts');
        break;
      case NotificationType.FRIEND_ACCEPT:
        navigate(`/profile/${notification.senderId}`);
        break;
      case NotificationType.REPLY_COMMENT:
      case NotificationType.LIKE_COMMENT:
        if (notification.data.postId && user) {
          fetchPostById(notification.data.postId, user.id, user.friendIds || []);
        }
        break;
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Xóa thông báo này?')) {
      await deleteNotification(notification.id);
    }
  };

  return (
    <div 
      className={`group flex items-start gap-3 p-3 cursor-pointer hover:bg-bg-hover transition-colors rounded-lg mb-1 ${
        !notification.isRead ? 'bg-primary/5' : ''
      }`}
      onClick={handleItemClick}
    >
      <UserAvatar userId={notification.senderId} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary leading-tight">
          <span className="font-semibold mr-1">{sender?.name || 'Người dùng'}</span> 
          {notificationService.getNotificationText(notification, '')}
        </p>
        <span className="text-xs text-text-tertiary mt-1 block">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </div>
      
      <div className="flex flex-col items-end gap-2">
        {!notification.isRead && (
          <div className="w-2.5 h-2.5 bg-primary rounded-full" />
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 h-auto text-text-tertiary hover:text-error hover:bg-error/10 transition-all rounded-full"
          icon={<Trash2 size={14} />}
        />
      </div>
    </div>
  );
};
