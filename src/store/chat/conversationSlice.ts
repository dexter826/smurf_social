import { StateCreator } from 'zustand';
import { Conversation, User } from '../../types';
import { chatService } from '../../services/chatService';
import { userService } from '../../services/userService';
import { useAuthStore } from '../authStore';
import { useLoadingStore } from '../loadingStore';
import NotificationSound from '../../assets/sounds/message-notification.mp3';
import type { ChatState } from '../chatStore';

let lastPlayedId = '';

export interface ConversationSlice {
  conversations: Conversation[];
  selectedConversationId: string | null;
  searchTerm: string;
  isSearchFocused: boolean;
  searchResults: { conversations: Conversation[]; users: User[] };
  searchHistory: Record<string, (Conversation | User)[]>;
  isChatVisible: boolean;

  subscribeToConversations: (userId: string) => () => void;
  selectConversation: (conversationId: string | null) => void;
  getOrCreateConversation: (user1Id: string, user2Id: string) => Promise<string>;
  searchConversations: (userId: string, term: string) => Promise<void>;
  togglePin: (conversationId: string, pinned: boolean) => Promise<void>;
  toggleMute: (conversationId: string, muted: boolean) => Promise<void>;
  toggleArchive: (conversationId: string, archived: boolean) => Promise<void>;
  toggleMarkUnread: (conversationId: string, markedUnread: boolean) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  setSearchFocused: (focused: boolean) => void;
  addToSearchHistory: (item: Conversation | User, userId: string) => void;
  removeFromSearchHistory: (itemId: string, userId: string) => void;
  clearSearchHistory: (userId: string) => void;
  setSearchTerm: (term: string) => void;
  setIsChatVisible: (visible: boolean) => void;
  markAllAsRead: (userId: string) => Promise<void>;
}

export const createConversationSlice: StateCreator<ChatState, [], [], ConversationSlice> = (set, get) => ({
  conversations: [],
  selectedConversationId: null,
  searchTerm: '',
  isSearchFocused: false,
  searchResults: { conversations: [], users: [] },
  searchHistory: {},
  isChatVisible: false,

  subscribeToConversations: (userId: string) => {
    const { conversations } = get();
    const hasCache = conversations.length > 0;

    useLoadingStore.getState().setLoading('chat', !hasCache);

    const unsubscribe = chatService.subscribeToConversations(userId, (conversations) => {
      const prevConversations = get().conversations;

      if (prevConversations.length > 0) {
        conversations.forEach(conv => {
          const lastMsg = conv.lastMessage;
          const isUnread = conv.unreadCount?.[userId] > 0;
          const isViewingThisConv = get().isChatVisible && conv.id === get().selectedConversationId;

          if (lastMsg && lastMsg.id !== lastPlayedId && isUnread &&
            lastMsg.senderId !== userId && !conv.muted && !isViewingThisConv) {
            lastPlayedId = lastMsg.id || '';
            const audio = new Audio(NotificationSound);
            audio.play().catch(err => console.debug("Autoplay blocked:", err));
          }
        });
      }

      set({
        conversations: conversations.map(c =>
          (c.id === get().selectedConversationId && get().isChatVisible)
            ? { ...c, unreadCount: { ...c.unreadCount, [userId]: 0 }, markedUnread: false }
            : c
        )
      });
      useLoadingStore.getState().setLoading('chat', false);
    });

    return unsubscribe;
  },

  selectConversation: (conversationId: string | null) => {
    set({ selectedConversationId: conversationId });

    if (conversationId) {
      const { user } = useAuthStore.getState();
      if (user) {
        set((state) => ({
          conversations: state.conversations.map(c =>
            c.id === conversationId
              ? { ...c, unreadCount: { ...c.unreadCount, [user.id]: 0 }, markedUnread: false }
              : c
          )
        }));
      }
    }
  },

  getOrCreateConversation: async (user1Id: string, user2Id: string) => {
    try {
      const conversationId = await chatService.getOrCreateConversation(user1Id, user2Id);
      set({ selectedConversationId: conversationId });
      return conversationId;
    } catch (error) {
      console.error("Lỗi lấy hoặc tạo hội thoại:", error);
      throw error;
    }
  },

  searchConversations: async (userId: string, term: string) => {
    set({ searchTerm: term });
    useLoadingStore.getState().setLoading('contacts.search', true);

    try {
      if (!term.trim()) {
        set({ searchResults: { conversations: [], users: [] } });
        return;
      }

      const friendResults = await userService.searchFriends(term, userId);
      set({ searchResults: { conversations: [], users: friendResults } });
    } catch (error) {
      console.error("Lỗi tìm bạn bè:", error);
    } finally {
      useLoadingStore.getState().setLoading('contacts.search', false);
    }
  },

  togglePin: async (conversationId: string, pinned: boolean) => {
    set(state => ({ conversations: state.conversations.map(c => c.id === conversationId ? { ...c, pinned } : c) }));
    try {
      await chatService.togglePinConversation(conversationId, pinned);
    } catch (error) {
      set(state => ({ conversations: state.conversations.map(c => c.id === conversationId ? { ...c, pinned: !pinned } : c) }));
      console.error("Lỗi ghim hội thoại:", error);
      throw error;
    }
  },

  toggleMute: async (conversationId: string, muted: boolean) => {
    set(state => ({ conversations: state.conversations.map(c => c.id === conversationId ? { ...c, muted } : c) }));
    try {
      await chatService.toggleMuteConversation(conversationId, muted);
    } catch (error) {
      set(state => ({ conversations: state.conversations.map(c => c.id === conversationId ? { ...c, muted: !muted } : c) }));
      console.error("Lỗi tắt thông báo:", error);
      throw error;
    }
  },

  toggleArchive: async (conversationId: string, archived: boolean) => {
    set(state => ({ conversations: state.conversations.map(c => c.id === conversationId ? { ...c, archived } : c) }));
    try {
      await chatService.toggleArchiveConversation(conversationId, archived);
    } catch (error) {
      set(state => ({ conversations: state.conversations.map(c => c.id === conversationId ? { ...c, archived: !archived } : c) }));
      console.error("Lỗi lưu trữ hội thoại:", error);
      throw error;
    }
  },

  toggleMarkUnread: async (conversationId: string, markedUnread: boolean) => {
    set(state => ({ conversations: state.conversations.map(c => c.id === conversationId ? { ...c, markedUnread } : c) }));
    try {
      await chatService.toggleMarkUnreadConversation(conversationId, markedUnread);
    } catch (error) {
      set(state => ({ conversations: state.conversations.map(c => c.id === conversationId ? { ...c, markedUnread: !markedUnread } : c) }));
      console.error("Lỗi đánh dấu chưa đọc:", error);
      throw error;
    }
  },

  deleteConversation: async (conversationId: string) => {
    set(state => ({
      selectedConversationId: state.selectedConversationId === conversationId ? null : state.selectedConversationId
    }));

    if (get().clearMessages) {
      get().clearMessages(conversationId);
    }
    try {
      await chatService.deleteConversation(conversationId, useAuthStore.getState().user?.id || '');
    } catch (error) {
      console.error("Lỗi xóa hội thoại:", error);
      throw error;
    }
  },

  setSearchFocused: (focused: boolean) => {
    set({ isSearchFocused: focused });
    if (!focused) {
      set({ searchTerm: '', searchResults: { conversations: [], users: [] } });
    }
  },

  addToSearchHistory: (item: Conversation | User, userId: string) => {
    set((state) => {
      const userHistory = state.searchHistory[userId] || [];
      const filtered = userHistory.filter(h => h.id !== item.id);
      const newHistory = [item, ...filtered].slice(0, 10);
      return {
        searchHistory: {
          ...state.searchHistory,
          [userId]: newHistory
        }
      };
    });
  },

  removeFromSearchHistory: (itemId: string, userId: string) => {
    set((state) => ({
      searchHistory: {
        ...state.searchHistory,
        [userId]: (state.searchHistory[userId] || []).filter(h => h.id !== itemId)
      }
    }));
  },

  clearSearchHistory: (userId: string) => {
    set((state) => ({
      searchHistory: {
        ...state.searchHistory,
        [userId]: []
      }
    }));
  },

  setSearchTerm: (term: string) => {
    set({ searchTerm: term });
  },

  setIsChatVisible: (visible: boolean) => {
    set({ isChatVisible: visible });
  },

  markAllAsRead: async (userId: string) => {
    set(state => ({
      conversations: state.conversations.map(c => ({
        ...c,
        unreadCount: { ...c.unreadCount, [userId]: 0 },
        markedUnread: false
      }))
    }));

    try {
      await chatService.markAllAsRead(userId);
    } catch (error) {
      console.error("Lỗi đánh dấu tất cả đã đọc:", error);
    }
  }
});
