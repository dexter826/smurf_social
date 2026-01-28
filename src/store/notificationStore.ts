import { create } from 'zustand';
import { AppNotification } from '../types';
import { notificationService } from '../services/notificationService';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  setNotifications: (notifications: AppNotification[]) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  initialize: (userId: string) => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    set({ notifications, unreadCount });
  },

  addNotification: (notification) => {
    set((state) => {
      const exists = state.notifications.find(n => n.id === notification.id);
      if (exists) return state;

      const newNotifications = [notification, ...state.notifications];
      return {
        notifications: newNotifications,
        unreadCount: state.unreadCount + (notification.isRead ? 0 : 1)
      };
    });
  },

  markAsRead: async (id) => {
    await notificationService.markAsRead(id);
    set((state) => {
      const newNotifications = state.notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      );
      return {
        notifications: newNotifications,
        unreadCount: Math.max(0, state.unreadCount - 1)
      };
    });
  },

  markAllAsRead: async (userId) => {
    await notificationService.markAllAsRead(userId);
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0
    }));
  },

  initialize: (userId) => {
    set({ isLoading: true });
    
    // Đăng ký nhận thông báo thời gian thực
    const unsubscribe = notificationService.subscribeToNotifications(userId, (notifications) => {
      get().setNotifications(notifications);
      set({ isLoading: false });
    });

    // Yêu cầu quyền thông báo đẩy
    notificationService.requestPushPermission(userId).catch(err => {
      console.warn("Lỗi yêu cầu quyền Push tự động:", err);
    });

    return unsubscribe;

    return unsubscribe;
  }
}));
