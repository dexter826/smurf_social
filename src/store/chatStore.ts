import { create } from 'zustand';
import { Conversation, Message } from '../types';
import { chatService } from '../services/chatService';

interface ChatState {
  conversations: Conversation[];
  selectedConversationId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, string[]>;
  isLoading: boolean;
  searchTerm: string;

  // Conversations
  subscribeToConversations: (userId: string) => () => void;
  selectConversation: (conversationId: string | null) => void;
  getOrCreateConversation: (user1Id: string, user2Id: string) => Promise<string>;
  searchConversations: (userId: string, term: string) => Promise<void>;
  togglePin: (conversationId: string, pinned: boolean) => Promise<void>;
  toggleMute: (conversationId: string, muted: boolean) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;

  // Messages
  subscribeToMessages: (conversationId: string) => () => void;
  sendTextMessage: (conversationId: string, senderId: string, content: string) => Promise<void>;
  sendImageMessage: (conversationId: string, senderId: string, file: File) => Promise<void>;
  sendFileMessage: (conversationId: string, senderId: string, file: File) => Promise<void>;
  markAsRead: (conversationId: string, userId: string) => Promise<void>;
  markAsDelivered: (conversationId: string, userId: string) => Promise<void>;
  deleteMessage: (messageId: string, fileUrl?: string) => Promise<void>;

  // Typing
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => Promise<void>;
  subscribeToTyping: (conversationId: string) => () => void;

  // Reactions
  toggleReaction: (messageId: string, userId: string, emoji: string) => Promise<void>;

  // Utils
  setSearchTerm: (term: string) => void;
  clearMessages: (conversationId: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  selectedConversationId: null,
  messages: {},
  typingUsers: {},
  isLoading: false,
  searchTerm: '',

  // ========== CONVERSATIONS ==========

  subscribeToConversations: (userId: string) => {
    set({ isLoading: true });
    
    const unsubscribe = chatService.subscribeToConversations(userId, (conversations) => {
      set({ conversations, isLoading: false });
    });

    return unsubscribe;
  },

  selectConversation: (conversationId: string | null) => {
    set({ selectedConversationId: conversationId });
  },

  getOrCreateConversation: async (user1Id: string, user2Id: string) => {
    try {
      const conversationId = await chatService.getOrCreateConversation(user1Id, user2Id);
      set({ selectedConversationId: conversationId });
      return conversationId;
    } catch (error) {
      console.error("Lỗi get/create conversation", error);
      throw error;
    }
  },

  searchConversations: async (userId: string, term: string) => {
    set({ searchTerm: term, isLoading: true });
    
    try {
      if (!term.trim()) {
        // Nếu search rỗng, không làm gì (dùng subscribe)
        set({ isLoading: false });
        return;
      }

      const results = await chatService.searchConversations(userId, term);
      set({ conversations: results, isLoading: false });
    } catch (error) {
      console.error("Lỗi search", error);
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
      console.error("Lỗi toggle pin", error);
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
      console.error("Lỗi toggle mute", error);
      throw error;
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      await chatService.deleteConversation(conversationId);
      
      set((state) => ({
        conversations: state.conversations.filter(c => c.id !== conversationId),
        selectedConversationId: state.selectedConversationId === conversationId 
          ? null 
          : state.selectedConversationId
      }));
    } catch (error) {
      console.error("Lỗi xóa conversation", error);
      throw error;
    }
  },

  // ========== MESSAGES ==========

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

  sendTextMessage: async (conversationId: string, senderId: string, content: string) => {
    try {
      await chatService.sendTextMessage(conversationId, senderId, content);
    } catch (error) {
      console.error("Lỗi gửi text", error);
      throw error;
    }
  },

  sendImageMessage: async (conversationId: string, senderId: string, file: File) => {
    try {
      await chatService.sendImageMessage(conversationId, senderId, file);
    } catch (error) {
      console.error("Lỗi gửi ảnh", error);
      throw error;
    }
  },

  sendFileMessage: async (conversationId: string, senderId: string, file: File) => {
    try {
      await chatService.sendFileMessage(conversationId, senderId, file);
    } catch (error) {
      console.error("Lỗi gửi file", error);
      throw error;
    }
  },

  markAsRead: async (conversationId: string, userId: string) => {
    try {
      await chatService.markMessagesAsRead(conversationId, userId);
    } catch (error) {
      console.error("Lỗi mark as read", error);
    }
  },

  markAsDelivered: async (conversationId: string, userId: string) => {
    try {
      await chatService.markMessagesAsDelivered(conversationId, userId);
    } catch (error) {
      console.error("Lỗi mark as delivered", error);
    }
  },

  deleteMessage: async (messageId: string, fileUrl?: string) => {
    try {
      await chatService.deleteMessage(messageId, fileUrl);
    } catch (error) {
      console.error("Lỗi xóa message", error);
      throw error;
    }
  },

  // ========== TYPING ==========

  setTyping: async (conversationId: string, userId: string, isTyping: boolean) => {
    try {
      await chatService.setTypingStatus(conversationId, userId, isTyping);
    } catch (error) {
      console.error("Lỗi set typing", error);
    }
  },

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

  // ========== REACTIONS ==========

  toggleReaction: async (messageId: string, userId: string, emoji: string) => {
    try {
      await chatService.toggleReaction(messageId, userId, emoji);
    } catch (error) {
      console.error("Lỗi toggle reaction", error);
      throw error;
    }
  },

  // ========== UTILS ==========

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
  }
}));
