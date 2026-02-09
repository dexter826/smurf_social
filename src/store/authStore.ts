import { create } from "zustand";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { User, UserStatus } from "../types";
import { userService } from "../services/userService";
import { authService } from "../services/authService";
import { useUserCache } from "./userCacheStore";
import { useChatStore } from "./chatStore";
import { usePostStore } from "./postStore";
import { useContactStore } from "./contactStore";
import { useNotificationStore } from "./notificationStore";
import { useCommentStore } from "./commentStore";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isPendingVerification: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  checkVerificationStatus: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  initialize: () => () => void;
  // Profile update methods - thay vì hook gọi setState trực tiếp
  updateUserProfile: (updates: Partial<User>) => void;
  updateAvatar: (avatarUrl: string) => void;
  updateBlockList: (action: "add" | "remove", targetUserId: string) => void;
  unfriendUser: (targetUserId: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isPendingVerification: false,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),

  login: async (email, pass) => {
    set({ isLoading: true });
    try {
      const firebaseUser = await authService.login(email, pass);

      if (!firebaseUser.emailVerified) {
        set({ isPendingVerification: true, isLoading: false });
        return;
      }
      set({ isPendingVerification: false });
    } catch (error) {
      set({ isLoading: false, isPendingVerification: false });
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
        avatar: "",
        email: email.trim(),
      });

      await authService.sendVerificationEmail();

      set({ isPendingVerification: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const { user } = get();

    try {
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
    } catch (error) {
      console.error("Lỗi logout:", error);
      set({ user: null });
    }
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

  checkVerificationStatus: async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      await firebaseUser.reload();
      if (firebaseUser.emailVerified) {
        set({ isPendingVerification: false });

        try {
          const userData = await userService.getUserById(firebaseUser.uid);
          if (userData) {
            await userService.updateUserStatus(
              firebaseUser.uid,
              UserStatus.ONLINE,
            );
            const userWithStatus = { ...userData, status: UserStatus.ONLINE };
            set({ user: userWithStatus });
            useUserCache.getState().setUser(userWithStatus);
          }
        } catch (error) {
          console.error("Lỗi đồng bộ sau xác thực:", error);
        }
      }
    }
  },

  // Profile update methods
  updateUserProfile: (updates) => {
    const { user } = get();
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    set({ user: updatedUser });
    useUserCache.getState().setUser(updatedUser);
  },

  updateAvatar: (avatarUrl) => {
    const { user } = get();
    if (!user) return;
    const updatedUser = { ...user, avatar: avatarUrl };
    set({ user: updatedUser });
    useUserCache.getState().setUser(updatedUser);
  },

  updateBlockList: (action, targetUserId) => {
    const { user } = get();
    if (!user) return;
    
    const currentBlocked = user.blockedUserIds || [];
    const currentFriends = user.friendIds || [];
    
    if (action === 'add') {
      set({
        user: {
          ...user,
          blockedUserIds: [...currentBlocked, targetUserId],
          friendIds: currentFriends.filter(id => id !== targetUserId)
        }
      });
    } else {
      set({
        user: {
          ...user,
          blockedUserIds: currentBlocked.filter(id => id !== targetUserId)
        }
      });
    }
  },

  unfriendUser: (targetUserId) => {
    const { user } = get();
    if (!user) return;
    set({
      user: {
        ...user,
        friendIds: (user.friendIds || []).filter(id => id !== targetUserId)
      }
    });
  },

  initialize: () => {
    let userUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      if (firebaseUser) {
        if (!firebaseUser.emailVerified) {
          set({ user: null, isPendingVerification: true, isLoading: false });
          return;
        }

        try {
          const userData = await userService.getUserById(firebaseUser.uid);

          if (userData) {
            if (userData.status === UserStatus.BANNED) {
              set({ user: userData, isLoading: false });
              get().logout();
              return;
            }

            await userService.updateUserStatus(
              firebaseUser.uid,
              UserStatus.ONLINE,
            );
            const initialUser = { ...userData, status: UserStatus.ONLINE };
            set({ user: initialUser, isPendingVerification: false });
            useUserCache.getState().setUser(initialUser);

            userUnsubscribe = userService.subscribeToUser(
              firebaseUser.uid,
              async (updatedUser) => {
                if (updatedUser.status === UserStatus.BANNED) {
                  set({ user: updatedUser });
                  get().logout();
                  return;
                }

                const currentStatus = get().user?.status || UserStatus.ONLINE;
                const newUser = { ...updatedUser, status: currentStatus };
                set({ user: newUser });
                useUserCache.getState().setUser(newUser);
              },
            );
          } else {
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
