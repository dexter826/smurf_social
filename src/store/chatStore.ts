import { create } from 'zustand';
import { Conversation, Message, User } from '../types';
import { chatService } from '../services/chatService';
import { userService } from '../services/userService';
import { useAuthStore } from './authStore';
import NotificationSound from '../assets/sounds/message-notification.mp3';

let lastPlayedId = ''; // Chặn phát âm thanh lặp cho một tin nhắn

interface ChatState {
  conversations: Conversation[];
  selectedConversationId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, string[]>;
  isLoading: boolean;
  searchTerm: string;
  isSearchFocused: boolean;
  searchResults: {
    conversations: Conversation[];
    users: User[];
  };
  searchHistory: (Conversation | User)[];
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
  addToSearchHistory: (item: Conversation | User) => void;
  removeFromSearchHistory: (itemId: string) => void;
  clearSearchHistory: () => void;

  subscribeToMessages: (conversationId: string) => () => void;
  sendTextMessage: (conversationId: string, senderId: string, content: string, mentions?: string[]) => Promise<void>;
  sendImageMessage: (conversationId: string, senderId: string, file: File) => Promise<void>;
  sendFileMessage: (conversationId: string, senderId: string, file: File) => Promise<void>;
  sendVideoMessage: (conversationId: string, senderId: string, file: File) => Promise<void>;
  sendVoiceMessage: (conversationId: string, senderId: string, file: File) => Promise<void>;
  markAsRead: (conversationId: string, userId: string) => Promise<void>;
  markAsDelivered: (conversationId: string, userId: string) => Promise<void>;

  recallMessage: (messageId: string, conversationId: string) => Promise<void>;
  deleteMessageForMe: (messageId: string, userId: string) => Promise<void>;
  forwardMessage: (conversationId: string, senderId: string, message: Message) => Promise<void>;
  replyToMessage: (conversationId: string, senderId: string, content: string, replyToId: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;

  setTyping: (conversationId: string, userId: string, isTyping: boolean) => Promise<void>;
  subscribeToTyping: (conversationId: string) => () => void;

  toggleReaction: (messageId: string, userId: string, emoji: string) => Promise<void>;

  createGroup: (creatorId: string, memberIds: string[], groupName: string, groupAvatar?: string) => Promise<string>;
  updateGroupInfo: (conversationId: string, updates: { groupName?: string; groupAvatar?: string }) => Promise<void>;
  addMember: (conversationId: string, userId: string) => Promise<void>;
  removeMember: (conversationId: string, userId: string) => Promise<void>;
  leaveGroup: (conversationId: string, userId: string) => Promise<void>;
  promoteToAdmin: (conversationId: string, userId: string) => Promise<void>;
  demoteFromAdmin: (conversationId: string, userId: string) => Promise<void>;

  setSearchTerm: (term: string) => void;
  clearMessages: (conversationId: string) => void;
  setLoading: (loading: boolean) => void;
  setIsChatVisible: (visible: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  selectedConversationId: null,
  messages: {},
  typingUsers: {},
  isLoading: false,
  searchTerm: '',
  isSearchFocused: false,
  searchResults: {
    conversations: [],
    users: []
  },
  searchHistory: [],
  isChatVisible: false,

  // Đăng ký cập nhật danh sách hội thoại
  subscribeToConversations: (userId: string) => {
    set({ isLoading: true });
    
    const unsubscribe = chatService.subscribeToConversations(userId, (conversations) => {
      const prevConversations = get().conversations;
      
      // Âm báo khi có tin nhắn thực sự mới và chưa đọc
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
        ), 
        isLoading: false 
      });
    });

    return unsubscribe;
  },

  selectConversation: (conversationId: string | null) => {
    set({ selectedConversationId: conversationId });
    
    // Xóa unreadCount local ngay lập tức khi chọn hội thoại
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

  // Lấy hoặc tạo mới hội thoại giữa hai người dùng
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

  // Tìm kiếm bạn bè để chat
  searchConversations: async (userId: string, term: string) => {
    set({ searchTerm: term, isLoading: true });
    
    try {
      if (!term.trim()) {
        set({ searchResults: { conversations: [], users: [] }, isLoading: false });
        return;
      }

      const friendResults = await userService.searchFriends(term, userId);

      set({ 
        searchResults: { 
          conversations: [], 
          users: friendResults 
        }, 
        isLoading: false 
      });
    } catch (error) {
      console.error("Lỗi tìm bạn bè:", error);
      set({ isLoading: false });
    }
  },

  togglePin: async (conversationId: string, pinned: boolean) => {
    try {
      await chatService.togglePinConversation(conversationId, pinned);
      
      set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === conversationId ? { ...c, pinned } : c
        )
      }));
    } catch (error) {
      console.error("Lỗi ghim hội thoại:", error);
      throw error;
    }
  },

  toggleMute: async (conversationId: string, muted: boolean) => {
    try {
      await chatService.toggleMuteConversation(conversationId, muted);
      
      set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === conversationId ? { ...c, muted } : c
        )
      }));
    } catch (error) {
      console.error("Lỗi tắt thông báo:", error);
      throw error;
    }
  },

  toggleArchive: async (conversationId: string, archived: boolean) => {
    try {
      await chatService.toggleArchiveConversation(conversationId, archived);
      
      set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === conversationId ? { ...c, archived } : c
        )
      }));
    } catch (error) {
      console.error("Lỗi lưu trữ hội thoại:", error);
      throw error;
    }
  },

  toggleMarkUnread: async (conversationId: string, markedUnread: boolean) => {
    try {
      await chatService.toggleMarkUnreadConversation(conversationId, markedUnread);
      
      set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === conversationId ? { ...c, markedUnread } : c
        )
      }));
    } catch (error) {
      console.error("Lỗi đánh dấu chưa đọc:", error);
      throw error;
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      await chatService.deleteConversation(conversationId);
      
      set((state) => ({
        conversations: state.conversations.filter(c => c.id !== conversationId),
        searchResults: {
          ...state.searchResults,
          conversations: state.searchResults.conversations.filter(c => c.id !== conversationId)
        },
        selectedConversationId: state.selectedConversationId === conversationId 
          ? null 
          : state.selectedConversationId
      }));
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

  // Giới hạn 10 mục tìm kiếm gần nhất
  addToSearchHistory: (item: Conversation | User) => {
    set((state) => {
      const filtered = state.searchHistory.filter(h => h.id !== item.id);
      const newHistory = [item, ...filtered].slice(0, 10);
      return { searchHistory: newHistory };
    });
  },

  removeFromSearchHistory: (itemId: string) => {
    set((state) => ({
      searchHistory: state.searchHistory.filter(h => h.id !== itemId)
    }));
  },

  clearSearchHistory: () => {
    set({ searchHistory: [] });
  },

  // Đăng ký cập nhật tin nhắn trong hội thoại
  subscribeToMessages: (conversationId: string) => {
    const unsubscribe = chatService.subscribeToMessages(conversationId, (messages) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: messages
        }
      }));
    });

    return unsubscribe;
  },

  sendTextMessage: async (conversationId: string, senderId: string, content: string, mentions?: string[]) => {
    try {
      await chatService.sendTextMessage(conversationId, senderId, content, undefined, false, mentions);
    } catch (error) {
      console.error("Lỗi gửi tin nhắn văn bản:", error);
      throw error;
    }
  },

  sendImageMessage: async (conversationId: string, senderId: string, file: File) => {
    try {
      await chatService.sendImageMessage(conversationId, senderId, file);
    } catch (error) {
      console.error("Lỗi gửi ảnh:", error);
      throw error;
    }
  },

  sendFileMessage: async (conversationId: string, senderId: string, file: File) => {
    try {
      await chatService.sendFileMessage(conversationId, senderId, file);
    } catch (error) {
      console.error("Lỗi gửi tệp:", error);
      throw error;
    }
  },

  sendVideoMessage: async (conversationId: string, senderId: string, file: File) => {
    try {
      await chatService.sendVideoMessage(conversationId, senderId, file);
    } catch (error) {
      console.error("Lỗi gửi video:", error);
      throw error;
    }
  },

  sendVoiceMessage: async (conversationId: string, senderId: string, file: File) => {
    try {
      await chatService.sendVoiceMessage(conversationId, senderId, file);
    } catch (error) {
      console.error("Lỗi gửi tin nhắn thoại:", error);
      throw error;
    }
  },

  markAsRead: async (conversationId: string, userId: string) => {
    try {
      await chatService.markMessagesAsRead(conversationId, userId);
    } catch (error) {
      console.error("Lỗi đánh dấu đã đọc:", error);
    }
  },

  markAsDelivered: async (conversationId: string, userId: string) => {
    try {
      await chatService.markMessagesAsDelivered(conversationId, userId);
    } catch (error) {
      console.error("Lỗi đánh dấu đã nhận:", error);
    }
  },

  recallMessage: async (messageId: string, conversationId: string) => {
    try {
      await chatService.recallMessage(messageId, conversationId);
    } catch (error) {
      console.error("Lỗi thu hồi tin nhắn:", error);
      throw error;
    }
  },

  deleteMessageForMe: async (messageId: string, userId: string) => {
    try {
      await chatService.deleteMessageForMe(messageId, userId);
    } catch (error) {
      console.error("Lỗi xóa tin nhắn cá nhân:", error);
      throw error;
    }
  },

  forwardMessage: async (conversationId: string, senderId: string, message: Message) => {
    try {
      await chatService.forwardMessage(conversationId, senderId, message);
    } catch (error) {
      console.error("Lỗi chuyển tiếp tin nhắn:", error);
      throw error;
    }
  },

  replyToMessage: async (conversationId: string, senderId: string, content: string, replyToId: string) => {
    try {
      await chatService.replyToMessage(conversationId, senderId, content, replyToId);
    } catch (error) {
      console.error("Lỗi phản hồi tin nhắn:", error);
      throw error;
    }
  },

  editMessage: async (messageId: string, content: string) => {
    try {
      await chatService.editMessage(messageId, content);
    } catch (error) {
      console.error("Lỗi chỉnh sửa tin nhắn:", error);
      throw error;
    }
  },

  setTyping: async (conversationId: string, userId: string, isTyping: boolean) => {
    try {
      await chatService.setTypingStatus(conversationId, userId, isTyping);
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái soạn tin:", error);
    }
  },

  // Đăng ký cập nhật trạng thái soạn tin
  subscribeToTyping: (conversationId: string) => {
    const unsubscribe = chatService.subscribeToTypingStatus(conversationId, (typingUsers) => {
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: typingUsers
        }
      }));
    });

    return unsubscribe;
  },

  toggleReaction: async (messageId: string, userId: string, emoji: string) => {
    try {
      await chatService.toggleReaction(messageId, userId, emoji);
    } catch (error) {
      console.error("Lỗi thả cảm xúc:", error);
      throw error;
    }
  },

  // Tạo hội thoại nhóm mới
  createGroup: async (creatorId: string, memberIds: string[], groupName: string, groupAvatar?: string) => {
    try {
      const conversationId = await chatService.createGroupConversation(creatorId, memberIds, groupName, groupAvatar);
      set({ selectedConversationId: conversationId });
      return conversationId;
    } catch (error) {
      console.error("Lỗi tạo nhóm:", error);
      throw error;
    }
  },

  updateGroupInfo: async (conversationId: string, updates: { groupName?: string; groupAvatar?: string }) => {
    try {
      await chatService.updateGroupInfo(conversationId, updates);
      set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === conversationId ? { ...c, ...updates } : c
        )
      }));
    } catch (error) {
      console.error("Lỗi cập nhật thông tin nhóm:", error);
      throw error;
    }
  },

  addMember: async (conversationId: string, userId: string) => {
    try {
      await chatService.addGroupMember(conversationId, userId);
    } catch (error) {
      console.error("Lỗi thêm thành viên:", error);
      throw error;
    }
  },

  removeMember: async (conversationId: string, userId: string) => {
    try {
      await chatService.removeGroupMember(conversationId, userId);
    } catch (error) {
      console.error("Lỗi xóa thành viên:", error);
      throw error;
    }
  },

  leaveGroup: async (conversationId: string, userId: string) => {
    try {
      await chatService.leaveGroup(conversationId, userId);
      set((state) => ({
        conversations: state.conversations.filter(c => c.id !== conversationId),
        selectedConversationId: state.selectedConversationId === conversationId 
          ? null 
          : state.selectedConversationId
      }));
    } catch (error) {
      console.error("Lỗi rời nhóm:", error);
      throw error;
    }
  },

  promoteToAdmin: async (conversationId: string, userId: string) => {
    try {
      await chatService.promoteToAdmin(conversationId, userId);
    } catch (error) {
      console.error("Lỗi chỉ định admin:", error);
      throw error;
    }
  },

  demoteFromAdmin: async (conversationId: string, userId: string) => {
    try {
      await chatService.demoteFromAdmin(conversationId, userId);
    } catch (error) {
      console.error("Lỗi gỡ quyền admin:", error);
      throw error;
    }
  },

  setSearchTerm: (term: string) => {
    set({ searchTerm: term });
  },

  clearMessages: (conversationId: string) => {
    set((state) => {
      const newMessages = { ...state.messages };
      delete newMessages[conversationId];
      return { messages: newMessages };
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setIsChatVisible: (visible: boolean) => {
    set({ isChatVisible: visible });
  }
}));
