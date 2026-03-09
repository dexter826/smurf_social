import { StateCreator } from 'zustand';
import { Conversation, User, ConversationMember } from '../../types';
import { conversationService } from '../../services/chat/conversationService';
import { userService } from '../../services/userService';
import { useAuthStore } from '../authStore';
import { useLoadingStore } from '../loadingStore';
import NotificationSound from '../../assets/sounds/message-notification.mp3';
import type { ChatState } from '../chatStore';

// Subscription cleanup refs cho member settings
const memberUnsubs: Record<string, () => void> = {};

let lastPlayedId = '';

export interface ConversationSlice {
  conversations: Conversation[];
  memberSettings: Record<string, ConversationMember | null>;
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
  togglePin: (conversationId: string, userId: string, pinned: boolean) => Promise<void>;
  toggleMute: (conversationId: string, muted: boolean) => Promise<void>;
  toggleArchive: (conversationId: string, userId: string, archived: boolean) => Promise<void>;
  toggleMarkUnread: (conversationId: string, userId: string, markedUnread: boolean) => Promise<void>;
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
  memberSettings: {},
  selectedConversationId: null,
  searchTerm: '',
  isSearchFocused: false,
  searchResults: { conversations: [], users: [] },
  searchHistory: {},
  isChatVisible: false,

  subscribeToConversations: (userId: string) => {
    const hasCache = get().conversations.length > 0;
    useLoadingStore.getState().setLoading('chat', !hasCache);

    const unsubConvs = conversationService.subscribeToConversations(userId, (conversations) => {
      // Sound notification dùng memberSettings hiện có trong state
      const prevConversations = get().conversations;
      if (prevConversations.length > 0) {
        const currentSettings = get().memberSettings;
        conversations.forEach(conv => {
          const ms = currentSettings[conv.id];
          const lastMsg = conv.lastMessage;
          const isUnread = ms?.unreadCount && ms.unreadCount > 0;
          const isMuted = ms?.isMuted || false;
          const isViewingThisConv = get().isChatVisible && conv.id === get().selectedConversationId;

          if (lastMsg && lastMsg.id !== lastPlayedId && isUnread &&
            lastMsg.senderId !== userId && !isMuted && !isViewingThisConv) {
            lastPlayedId = lastMsg.id || '';
            new Audio(NotificationSound).play().catch(err => console.debug("Autoplay blocked:", err));
          }
        });
      }

      // Đồng bộ subscriptions theo danh sách conversation mới
      const newIds = new Set(conversations.map(c => c.id));

      Object.keys(memberUnsubs).forEach(id => {
        if (!newIds.has(id)) {
          memberUnsubs[id]();
          delete memberUnsubs[id];
        }
      });

      conversations.forEach(conv => {
        if (!memberUnsubs[conv.id]) {
          memberUnsubs[conv.id] = conversationService.subscribeMemberSettings(conv.id, userId, (member) => {
            set(state => ({ memberSettings: { ...state.memberSettings, [conv.id]: member } }));
          });
        }
      });

      set({ conversations });
      useLoadingStore.getState().setLoading('chat', false);
    });

    return () => {
      unsubConvs();
      Object.values(memberUnsubs).forEach(u => u());
      Object.keys(memberUnsubs).forEach(k => delete memberUnsubs[k]);
    };
  },

  selectConversation: (conversationId: string | null) => {
    set({ selectedConversationId: conversationId });

    // Mark as read when selecting conversation
    if (conversationId) {
      const { user } = useAuthStore.getState();
      if (user) {
        conversationService.resetUnreadCount(conversationId, user.id).catch(err => {
          console.error("Lỗi reset unread count:", err);
        });
      }
    }
  },

  getOrCreateConversation: async (user1Id: string, user2Id: string) => {
    try {
      const conversationId = await conversationService.getOrCreateConversation(user1Id, user2Id);
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

  togglePin: async (conversationId: string, userId: string, pinned: boolean) => {
    try {
      await conversationService.togglePin(conversationId, userId, pinned);
    } catch (error) {
      console.error("Lỗi ghim hội thoại:", error);
      throw error;
    }
  },

  toggleMute: async (conversationId: string, muted: boolean) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    try {
      await conversationService.toggleMute(conversationId, userId, muted);
    } catch (error) {
      console.error("Lỗi tắt thông báo:", error);
      throw error;
    }
  },

  toggleArchive: async (conversationId: string, userId: string, archived: boolean) => {
    try {
      await conversationService.toggleArchive(conversationId, userId, archived);
    } catch (error) {
      console.error("Lỗi lưu trữ hội thoại:", error);
      throw error;
    }
  },

  toggleMarkUnread: async (conversationId: string, userId: string, markedUnread: boolean) => {
    try {
      await conversationService.toggleMarkUnread(conversationId, userId, markedUnread);
    } catch (error) {
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
      await conversationService.deleteConversation(conversationId, useAuthStore.getState().user?.id || '');
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
    try {
      await conversationService.markAllConversationsAsRead(userId);
    } catch (error) {
      console.error("Lỗi đánh dấu tất cả đã đọc:", error);
    }
  }
});
