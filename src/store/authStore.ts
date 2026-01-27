import { create } from 'zustand';
import { 
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { User, UserStatus } from '../types';
import { userService } from '../services/userService';
import { authService } from '../services/authService';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
      await authService.login(email, pass);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email, pass, name) => {
    set({ isLoading: true });
    try {
      const firebaseUser = await authService.register(email, pass);
      const newUser = await userService.updateProfile(firebaseUser.uid, {
        id: firebaseUser.uid,
        name: name || 'Người dùng mới',
        avatar: `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
        email: email.trim(),
      });
      set({ user: newUser });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const { user } = get();
    if (user) {
      await userService.updateUserStatus(user.id, UserStatus.OFFLINE);
    }
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

  initialize: () => {
    let userUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Cleanup previous user subscription
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      if (firebaseUser) {
        try {
          // Fetch user data đầu tiên
          const userData = await userService.getUserById(firebaseUser.uid);
          if (userData) {
            await userService.updateUserStatus(firebaseUser.uid, UserStatus.ONLINE);
            set({ user: { ...userData, status: UserStatus.ONLINE } });

            // Subscribe realtime đến user document
            userUnsubscribe = userService.subscribeToUser(firebaseUser.uid, (updatedUser) => {
              const currentStatus = get().user?.status || UserStatus.ONLINE;
              set({ user: { ...updatedUser, status: currentStatus } });
            });
          }
        } catch (error) {
          console.error("Lỗi đồng bộ user", error);
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
