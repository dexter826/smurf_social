import React, { useEffect } from 'react';
import { ChevronLeft, Bell, Trash2, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { NotificationList } from '../components/notifications/NotificationList';
import { Button } from '../components/ui';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { notifications, unreadCount, markAllAsRead, clearAllNotifications } = useNotificationStore();

  const handleMarkAllRead = () => {
    if (user) {
      markAllAsRead(user.id);
    }
  };

  const handleClearAll = async () => {
    if (user) {
      await clearAllNotifications(user.id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-border-light bg-bg-primary">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="-ml-2 md:hidden rounded-full p-2"
            icon={<ChevronLeft size={24} className="text-text-primary" />}
          />
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-text-primary">Thông báo</h1>
            {unreadCount > 0 && (
              <span className="text-xs text-primary font-medium">{unreadCount} thông báo mới</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-primary hover:bg-primary/10 px-2 sm:px-3 gap-1.5 sm:gap-2"
              icon={<CheckCheck size={18} />}
            >
              <span className="hidden sm:inline">Đọc tất cả</span>
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-text-tertiary hover:text-error hover:bg-error/10 px-2 sm:px-3 gap-1.5 sm:gap-2"
              icon={<Trash2 size={18} />}
            >
              <span className="hidden sm:inline">Xóa tất cả</span>
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-bg-secondary/30 custom-scrollbar">
        <div className="max-w-3xl mx-auto md:p-6">
          <div className="bg-bg-primary md:rounded-2xl md:shadow-sm md:border md:border-border-light overflow-hidden">
            <NotificationList maxHeight="100%" />
            
            {notifications.length >= useNotificationStore.getState().currentLimit && (
              <div className="p-4 border-t border-border-light flex justify-center bg-bg-primary">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => user && useNotificationStore.getState().loadMore(user.id)}
                  className="text-primary hover:bg-primary/5 font-bold py-2 px-6 tracking-widest"
                >
                  Xem thêm thông báo cũ hơn
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
