import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AppNotification, NotificationType } from '../../types';
import { UserAvatar } from '../ui';
import { notificationService } from '../../services/notificationService';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';

interface NotificationItemProps {
  notification: AppNotification;
  onClick?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => {
  const navigate = useNavigate();
  const markAsRead = useNotificationStore(state => state.markAsRead);
  
  const handleItemClick = async () => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (onClick) {
      onClick();
    }

    // Chuyển hướng dựa trên loại thông báo
    switch (notification.type) {
      case NotificationType.LIKE_POST:
      case NotificationType.COMMENT_POST:
        if (notification.data.postId) navigate(`/post/${notification.data.postId}`);
        break;
      case NotificationType.FRIEND_REQUEST:
        navigate('/contacts');
        break;
      case NotificationType.FRIEND_ACCEPT:
        navigate(`/profile/${notification.senderId}`);
        break;
      case NotificationType.REPLY_COMMENT:
      case NotificationType.LIKE_COMMENT:
        if (notification.data.postId) navigate(`/post/${notification.data.postId}`);
        break;
    }
  };

  return (
    <div 
      className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-bg-hover transition-colors rounded-lg mb-1 ${
        !notification.isRead ? 'bg-primary/5' : ''
      }`}
      onClick={handleItemClick}
    >
      <UserAvatar userId={notification.senderId} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary leading-tight">
          <span className="font-semibold">{/* Name will be fetched by UserAvatar, but for text we might need it */}</span> 
          {notificationService.getNotificationText(notification, '')}
        </p>
        <span className="text-xs text-text-tertiary mt-1 block">
          {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: vi })}
        </span>
      </div>
      {!notification.isRead && (
        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
      )}
    </div>
  );
};
