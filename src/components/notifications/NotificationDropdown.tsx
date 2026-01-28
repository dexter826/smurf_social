import React, { useRef, useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';
import { NotificationList } from './NotificationList';
import { useAuthStore } from '../../store/authStore';

export const NotificationDropdown: React.FC = () => {
  const { user } = useAuthStore();
  const { unreadCount, markAllAsRead } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    if (user) {
      markAllAsRead(user.id);
    }
  };

  return (
    <div className="relative group" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 flex items-center justify-center rounded-xl transition-all duration-200 ${
          isOpen 
          ? 'bg-sidebar-item-active text-white' 
          : 'text-sidebar-item hover:bg-sidebar-item-hover hover:text-white'
        }`}
        title="Thông báo"
      >
        <div className="relative">
          <Bell size={28} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-sidebar-bg" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 md:left-full md:top-0 md:ml-4 mt-2 w-80 md:w-96 bg-bg-primary rounded-xl shadow-2xl border border-border-light z-[100] overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between p-4 border-b border-border-light bg-bg-primary/50 backdrop-blur-md">
            <h3 className="font-bold text-lg">Thông báo</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-primary hover:underline"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
          
          
          <div className="p-2">
            <NotificationList onItemClick={() => setIsOpen(false)} />
          </div>
          
          <div className="p-3 border-t border-border-light text-center bg-bg-secondary/30">
            <button 
              className="text-sm font-semibold text-text-secondary hover:text-primary transition-colors"
              onClick={() => {
                navigate('/notifications');
                setIsOpen(false);
              }}
            >
              Xem tất cả
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
