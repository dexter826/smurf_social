import { create } from "zustand";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { User } from "../types";
import { userService } from "../services/userService";
import { authService } from "../services/authService";
import { useUserCache } from "./userCacheStore";
import { useChatStore } from "./chatStore";
import { usePostStore } from "./postStore";
import { useContactStore } from "./contactStore";
import { useNotificationStore } from "./notificationStore";
import { useCommentStore } from "./commentStore";
import { useReportStore } from "./reportStore";
import { useLoadingStore } from "./loadingStore";
import { usePresenceStore } from "./presenceStore";
import { presenceService } from "../services/presenceService";

interface AuthState {
  user: User | null;
  blockedUserIds: string[];
  isPendingVerification: boolean;
  isInitialized: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  checkVerificationStatus: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  initialize: () => () => void;
  updateUserProfile: (updates: Partial<User>) => void;
  updateAvatar: (avatar: any) => void;
  updateBlockList: (action: "add" | "remove", targetUserId: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  blockedUserIds: [],
  isPendingVerification: false,
  isInitialized: false,

  setUser: (user) => set({ user }),

  login: async (email, pass) => {
    useLoadingStore.getState().setLoading("auth.login", true);
    try {
      const firebaseUser = await authService.login(email, pass);

      if (!firebaseUser.emailVerified) {
        set({ isPendingVerification: true });
        return;
      }

      const userData = await userService.getUserById(firebaseUser.uid);
      if (userData) {
        if (userData.status === 'banned') {
          await authService.logout();
          throw new Error("Tài khoản của bạn đã bị khóa do vi phạm quy định cộng đồng. Vui lòng liên hệ admin để biết thêm chi tiết.");
        }

        // Set presence online
        await presenceService.setOnline(firebaseUser.uid);

        set({
          user: userData,
          isPendingVerification: false,
          isInitialized: true,
        });
        useUserCache.getState().setUser(userData);
      } else {
        set({ isPendingVerification: false });
      }
    } catch (error) {
      set({ isPendingVerification: false });
      throw error;
    } finally {
      useLoadingStore.getState().setLoading("auth.login", false);
    }
  },

  register: async (email, pass, name) => {
    useLoadingStore.getState().setLoading("auth.register", true);
    try {
      const firebaseUser = await authService.register(email, pass);
      await userService.updateProfile(firebaseUser.uid, {
        id: firebaseUser.uid,
        fullName: name,
        avatar: { url: '', fileName: '', mimeType: '', size: 0 },
        email: email.trim(),
      });

      await authService.sendVerificationEmail();

      set({ isPendingVerification: true });
    } finally {
      useLoadingStore.getState().setLoading("auth.register", false);
    }
  },

  logout: async () => {
    const { user } = get();

    try {
      // Set presence offline trước khi logout
      if (user) {
        await presenceService.setOffline(user.id);
      }

      // Giữ userCache — tránh flash data khi login lại
      usePresenceStore.getState().reset();
      useChatStore.getState().reset();
      usePostStore.getState().reset();
      useContactStore.getState().reset();
      useNotificationStore.getState().reset();
      useCommentStore.getState().reset();
      useReportStore.getState().reset();
      useLoadingStore.getState().setMultipleLoading(
        ['chat', 'chat.messages', 'chat.send', 'chat.loadMore',
          'feed', 'feed.posts', 'feed.loadMore', 'feed.create', 'feed.update', 'feed.delete',
          'contacts', 'contacts.friends', 'contacts.requests', 'contacts.search',
          'profile', 'profile.data', 'profile.upload', 'profile.update',
          'notifications', 'settings', 'admin.reports', 'admin.users'],
        false
      );

      await authService.logout();
    } catch (error) {
      console.error("Lỗi logout:", error);
    } finally {
      set({ user: null, isPendingVerification: false });
    }
  },

  resetPassword: async (email) => {
    useLoadingStore.getState().setLoading("auth", true);
    try {
      await authService.resetPassword(email);
    } finally {
      useLoadingStore.getState().setLoading("auth", false);
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
          const [userData, blockedUserIds] = await Promise.all([
            userService.getUserById(firebaseUser.uid),
            userService.getBlockedUserIds(firebaseUser.uid),
          ]);
          if (userData) {
            // Set presence online
            await presenceService.setOnline(firebaseUser.uid);

            set({ user: userData, blockedUserIds });
            useUserCache.getState().setUser(userData);
          }
        } catch (error) {
          console.error("Lỗi đồng bộ sau xác thực:", error);
        }
      }
    }
  },

  updateUserProfile: (updates) => {
    const { user } = get();
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    set({ user: updatedUser });
    useUserCache.getState().setUser(updatedUser);
  },

  updateAvatar: (avatar) => {
    const { user } = get();
    if (!user) return;
    const updatedUser = { ...user, avatar };
    set({ user: updatedUser });
    useUserCache.getState().setUser(updatedUser);
  },

  updateBlockList: (action, targetUserId) => {
    const currentBlocked = get().blockedUserIds;
    if (action === "add") {
      set({ blockedUserIds: [...currentBlocked, targetUserId] });
    } else {
      set({ blockedUserIds: currentBlocked.filter((id) => id !== targetUserId) });
    }
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
          set({ user: null, isPendingVerification: true, isInitialized: true });
          useLoadingStore.getState().setLoading("auth", false);
          return;
        }

        try {
          const [userData, blockedUserIds] = await Promise.all([
            userService.getUserById(firebaseUser.uid),
            userService.getBlockedUserIds(firebaseUser.uid),
          ]);

          if (userData) {
            if (userData.status === 'banned') {
              set({ user: userData, isInitialized: true });
              useLoadingStore.getState().setLoading("auth", false);
              get().logout();
              return;
            }

            // Set presence online
            await presenceService.setOnline(firebaseUser.uid);

            set({
              user: userData,
              blockedUserIds,
              isPendingVerification: false,
              isInitialized: true,
            });
            useLoadingStore.getState().setLoading("auth", false);
            useUserCache.getState().setUser(userData);
            userUnsubscribe = userService.subscribeToUser(
              firebaseUser.uid,
              async (updatedUser) => {
                if (updatedUser.status === 'banned') {
                  set({ user: updatedUser });
                  get().logout();
                  return;
                }

                const currentBlocked = get().blockedUserIds;
                set({ user: updatedUser, blockedUserIds: currentBlocked });
                useUserCache.getState().setUser(updatedUser);
              },
            );
          } else {
            set({ user: null, isInitialized: true });
            useLoadingStore.getState().setLoading("auth", false);
          }
        } catch (error) {
          set({ isInitialized: true });
          useLoadingStore.getState().setLoading("auth", false);
        }
      } else {
        set({ user: null, isInitialized: true });
        useLoadingStore.getState().setLoading("auth", false);
      }
    });

    return () => {
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  },
}));
