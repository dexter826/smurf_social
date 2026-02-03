import { create } from 'zustand';
import { 
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { User, UserStatus } from '../types';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { useUserCache } from './userCacheStore';
import { useChatStore } from './chatStore';
import { usePostStore } from './postStore';
import { useContactStore } from './contactStore';
import { useNotificationStore } from './notificationStore';
import { useCommentStore } from './commentStore';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),

  login: async (email, pass) => {
    set({ isLoading: true });
    try {
      const firebaseUser = await authService.login(email, pass);
      
      // Kiểm tra xác thực email
      if (!firebaseUser.emailVerified) {
        await authService.logout();
        const error = new Error('Vui lòng xác thực email trước khi đăng nhập.');
        (error as any).code = 'auth/email-not-verified';
        throw error;
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email, pass, name) => {
    set({ isLoading: true });
    try {
      const firebaseUser = await authService.register(email, pass);
      await userService.updateProfile(firebaseUser.uid, {
        id: firebaseUser.uid,
        name: name,
        avatar: '',
        email: email.trim(),
      });
      
      // Gửi email xác thực
      await authService.sendVerificationEmail();
      
      // Đăng xuất ngay sau khi đăng ký để bắt người dùng đăng nhập lại sau khi xác thực
      await authService.logout();
      set({ user: null });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const { user } = get();
    if (user) {
      await userService.updateUserStatus(user.id, UserStatus.OFFLINE);
    }
    
    // Reset tất cả các store dữ liệu
    useChatStore.getState().reset();
    usePostStore.getState().reset();
    useContactStore.getState().reset();
    useNotificationStore.getState().reset();
    useCommentStore.getState().reset();
    useUserCache.getState().clear();

    await authService.logout();
    set({ user: null });
  },

  resetPassword: async (email) => {
    set({ isLoading: true });
    try {
      await authService.resetPassword(email);
    } finally {
      set({ isLoading: false });
    }
  },

  sendVerificationEmail: async () => {
    try {
      await authService.sendVerificationEmail();
    } catch (error) {
      console.error("Lỗi gửi email xác thực:", error);
      throw error;
    }
  },

  initialize: () => {
    let userUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      if (firebaseUser && firebaseUser.emailVerified) {
        try {
          // Lấy thông tin người dùng từ server
          const userData = await userService.getUserById(firebaseUser.uid);
          
          if (userData) {
            if (userData.status === UserStatus.BANNED) {
               await authService.logout();
               const error = new Error('Tài khoản của bạn đã bị khóa vị quy phạm chính sách.');
               throw error;
            }

            await userService.updateUserStatus(firebaseUser.uid, UserStatus.ONLINE);
            const initialUser = { ...userData, status: UserStatus.ONLINE };
            set({ user: initialUser });
            useUserCache.getState().setUser(initialUser);

            // Đăng ký nhận cập nhật dữ liệu người dùng
            userUnsubscribe = userService.subscribeToUser(firebaseUser.uid, async (updatedUser) => {
              if (updatedUser.status === UserStatus.BANNED) {
                 await get().logout();
                 alert('Tài khoản của bạn đã bị khóa vị quy phạm chính sách.');
                 return;
              }

              const currentStatus = get().user?.status || UserStatus.ONLINE;
              const newUser = { ...updatedUser, status: currentStatus };
              set({ user: newUser });
              useUserCache.getState().setUser(newUser);
            });
          } else {
            // Trường hợp không tìm thấy user doc, có thể là lỗi hoặc user bị xóa
             set({ user: null });
          }
        } catch (error) {
          console.error("Lỗi đồng bộ dữ liệu người dùng:", error);
        }
      } else {
        set({ user: null });
      }
      set({ isLoading: false });
    });

    return () => {
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  },
}));
