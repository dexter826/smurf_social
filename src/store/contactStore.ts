import { create } from 'zustand';
import { User, FriendRequest } from '../types';
import { userService } from '../services/userService';
import { friendService } from '../services/friendService';

interface ContactState {
  friends: User[];
  receivedRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  searchResults: User[];
  isLoading: boolean;
  
  fetchFriends: (userId: string) => Promise<void>;
  fetchReceivedRequests: (userId: string) => Promise<void>;
  fetchSentRequests: (userId: string) => Promise<void>;
  subscribeToRequests: (userId: string) => () => void;
  searchUsers: (searchTerm: string, userId: string) => Promise<void>;
  
  sendFriendRequest: (senderId: string, receiverId: string, message?: string) => Promise<void>;
  acceptFriendRequest: (requestId: string, userId: string, friendId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
  unfriend: (userId: string, friendId: string) => Promise<void>;
  blockUser: (userId: string, blockedUserId: string) => Promise<void>;
  
  addFriend: (friend: User) => void;
  removeFriend: (friendId: string) => void;
  clearSearchResults: () => void;
}

export const useContactStore = create<ContactState>((set) => ({
  friends: [],
  receivedRequests: [],
  sentRequests: [],
  searchResults: [],
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

  fetchReceivedRequests: async (userId: string) => {
    try {
      const data = await friendService.getReceivedRequests(userId);
      set({ receivedRequests: data });
    } catch (error) {
      console.error("Lỗi tải lời mời kết bạn:", error);
    }
  },

  fetchSentRequests: async (userId: string) => {
    try {
      const data = await friendService.getSentRequests(userId);
      set({ sentRequests: data });
    } catch (error) {
      console.error("Lỗi tải lời mời đã gửi:", error);
    }
  },

  subscribeToRequests: (userId: string) => {
    const unsubscribeReceived = friendService.subscribeToReceivedRequests(userId, (requests) => {
      set({ receivedRequests: requests });
    });

    const unsubscribeSent = friendService.subscribeToSentRequests(userId, (requests) => {
      set({ sentRequests: requests });
    });

    return () => {
      unsubscribeReceived();
      unsubscribeSent();
    };
  },

  searchUsers: async (searchTerm: string, userId: string) => {
    if (!searchTerm.trim()) {
      set({ searchResults: [] });
      return;
    }
    
    set({ isLoading: true });
    try {
      const results = await userService.searchUsers(searchTerm, userId);
      set({ searchResults: results });
    } finally {
      set({ isLoading: false });
    }
  },

  sendFriendRequest: async (senderId: string, receiverId: string, message?: string) => {
    try {
      await friendService.sendFriendRequest(senderId, receiverId, message);
    } catch (error) {
      console.error("Lỗi gửi lời mời:", error);
      throw error;
    }
  },

  acceptFriendRequest: async (requestId: string, userId: string, friendId: string) => {
    try {
      await friendService.acceptFriendRequest(requestId, userId, friendId);
      set((state) => ({
        receivedRequests: state.receivedRequests.filter(r => r.id !== requestId)
      }));
    } catch (error) {
      console.error("Lỗi chấp nhận kết bạn:", error);
      throw error;
    }
  },

  rejectFriendRequest: async (requestId: string) => {
    try {
      await friendService.rejectFriendRequest(requestId);
      set((state) => ({
        receivedRequests: state.receivedRequests.filter(r => r.id !== requestId)
      }));
    } catch (error) {
      console.error("Lỗi từ chối kết bạn:", error);
      throw error;
    }
  },

  cancelFriendRequest: async (requestId: string) => {
    try {
      await friendService.cancelFriendRequest(requestId);
      set((state) => ({
        sentRequests: state.sentRequests.filter(r => r.id !== requestId)
      }));
    } catch (error) {
      console.error("Lỗi hủy lời mời:", error);
      throw error;
    }
  },

  unfriend: async (userId: string, friendId: string) => {
    try {
      await friendService.unfriend(userId, friendId);
      set((state) => ({
        friends: state.friends.filter(f => f.id !== friendId)
      }));
    } catch (error) {
      console.error("Lỗi hủy kết bạn:", error);
      throw error;
    }
  },

  blockUser: async (userId: string, blockedUserId: string) => {
    try {
      await userService.blockUser(userId, blockedUserId);
      set((state) => ({
        friends: state.friends.filter(f => f.id !== blockedUserId)
      }));
    } catch (error) {
      console.error("Lỗi chặn người dùng:", error);
      throw error;
    }
  },

  addFriend: (friend) => set((state) => ({ 
    friends: [...state.friends, friend] 
  })),

  removeFriend: (friendId) => set((state) => ({ 
    friends: state.friends.filter(f => f.id !== friendId) 
  })),

  clearSearchResults: () => set({ searchResults: [] }),
}));
