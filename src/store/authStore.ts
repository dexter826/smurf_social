import { create } from 'zustand';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut 
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { User } from '../types';
import { userService } from '../services/userService';

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
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, pass, name) => {
    set({ isLoading: true });
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email.trim(), pass);
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
    await signOut(auth);
    set({ user: null });
  },

  resetPassword: async (email) => {
    set({ isLoading: true });
    try {
      await sendPasswordResetEmail(auth, email);
    } finally {
      set({ isLoading: false });
    }
  },

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await userService.getUserById(firebaseUser.uid);
          if (userData) {
            set({ user: userData });
          }
        } catch (error) {
          console.error("Lỗi đồng bộ user", error);
        }
      } else {
        set({ user: null });
      }
      set({ isLoading: false });
    });
    return unsubscribe;
  },
}));
