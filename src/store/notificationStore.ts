import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppNotification } from '../types';
import { notificationService } from '../services/notificationService';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isRevalidating: boolean;
  setNotifications: (notifications: AppNotification[]) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  initialize: (userId: string) => () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      isRevalidating: false,

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

  initialize: (userId: string, limit: number = 15) => {
    set({ isLoading: true });
    
    const unsubscribe = notificationService.subscribeToNotifications(userId, (notifications) => {
      get().setNotifications(notifications);
      set({ isLoading: false });
    }, limit);

    // Xin quyền nhận push message qua trình duyệt.
    notificationService.requestPushPermission(userId).catch(err => {
      console.warn("Lỗi yêu cầu quyền Push tự động:", err);
    });

    return unsubscribe;
  }
}), {
  name: 'smurf_notify_cache',
  storage: createJSONStorage(() => localStorage),
  // Giới hạn lưu 20 thông báo
  partialize: (state) => ({ 
    notifications: state.notifications.slice(0, 20),
    unreadCount: state.unreadCount
  }),
}));
