import { create } from 'zustand';
import { User } from '../types';
import { userService } from '../services/userService';

interface ContactState {
  friends: User[];
  isLoading: boolean;
  fetchFriends: (userId: string) => Promise<void>;
  addFriend: (friend: User) => void;
  removeFriend: (friendId: string) => void;
}

export const useContactStore = create<ContactState>((set) => ({
  friends: [],
  isLoading: false,

  fetchFriends: async (userId: string) => {
    set({ isLoading: true });
    try {
      const data = await userService.getAllFriends(userId);
      set({ friends: data });
    } finally {
      set({ isLoading: false });
    }
  },

  addFriend: (friend) => set((state) => ({ 
    friends: [...state.friends, friend] 
  })),

  removeFriend: (friendId) => set((state) => ({ 
    friends: state.friends.filter(f => f.id !== friendId) 
  })),
}));
