import React, { useEffect } from 'react';
import { ChevronLeft, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { NotificationList } from '../components/notifications/NotificationList';
import { Button } from '../components/ui';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { unreadCount, markAllAsRead } = useNotificationStore();

  const handleMarkAllRead = () => {
    if (user) {
      markAllAsRead(user.id);
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
          <h1 className="text-xl font-bold text-text-primary">Thông báo</h1>
        </div>
        
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead}
            className="text-sm font-semibold text-primary hover:underline transition-all"
          >
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-bg-secondary/30">
        <div className="max-w-3xl mx-auto p-4 md:p-6">
          <div className="bg-bg-primary rounded-2xl shadow-sm border border-border-light overflow-hidden">
            <NotificationList />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
