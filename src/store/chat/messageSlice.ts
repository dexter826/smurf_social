import { StateCreator } from 'zustand';
import { Message } from '../../types';
import { chatService } from '../../services/chatService';

export interface MessageSlice {
  messages: Record<string, Message[]>;
  lastMessageDocs: Record<string, any>;
  hasMoreMessages: Record<string, boolean>;
  isLoadingMore: Record<string, boolean>;
  typingUsers: Record<string, string[]>;

  subscribeToMessages: (conversationId: string) => () => void;
  loadMoreMessages: (conversationId: string) => Promise<void>;
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
  clearMessages: (conversationId: string) => void;
}

const LIMIT_PER_PAGE = 20;

export const createMessageSlice: StateCreator<MessageSlice, [], [], MessageSlice> = (set, get) => ({
  messages: {},
  lastMessageDocs: {},
  hasMoreMessages: {},
  isLoadingMore: {},
  typingUsers: {},

  subscribeToMessages: (conversationId: string) => {
    const unsubscribe = chatService.subscribeToMessages(conversationId, LIMIT_PER_PAGE, (messages, lastDoc) => {
      set((state) => ({
        messages: { ...state.messages, [conversationId]: messages },
        lastMessageDocs: { ...state.lastMessageDocs, [conversationId]: lastDoc },
        hasMoreMessages: { ...state.hasMoreMessages, [conversationId]: messages.length >= LIMIT_PER_PAGE }
      }));
    });
    return unsubscribe;
  },

  loadMoreMessages: async (conversationId: string) => {
    const { lastMessageDocs, isLoadingMore, hasMoreMessages } = get();
    const lastDoc = lastMessageDocs[conversationId];
    
    if (!lastDoc || isLoadingMore[conversationId] || hasMoreMessages[conversationId] === false) return;

    set((state) => ({ isLoadingMore: { ...state.isLoadingMore, [conversationId]: true } }));

    try {
      const result = await chatService.getMoreMessages(conversationId, lastDoc, LIMIT_PER_PAGE);
      
      set((state) => ({
        messages: { ...state.messages, [conversationId]: [...result.messages, ...(state.messages[conversationId] || [])] },
        lastMessageDocs: { ...state.lastMessageDocs, [conversationId]: result.lastDoc },
        hasMoreMessages: { ...state.hasMoreMessages, [conversationId]: result.messages.length >= LIMIT_PER_PAGE },
        isLoadingMore: { ...state.isLoadingMore, [conversationId]: false }
      }));
    } catch (error) {
      console.error("Lỗi tải thêm tin nhắn:", error);
      set((state) => ({ isLoadingMore: { ...state.isLoadingMore, [conversationId]: false } }));
    }
  },

  sendTextMessage: async (conversationId: string, senderId: string, content: string, mentions?: string[]) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      senderId,
      content,
      timestamp: new Date(),
      type: 'text' as any,
      mentions: mentions || [],
      readBy: [],
      deliveredTo: [],
    };

    set(state => ({
      messages: { ...state.messages, [conversationId]: [...(state.messages[conversationId] || []), optimisticMessage] }
    }));

    try {
      await chatService.sendTextMessage(conversationId, senderId, content, undefined, false, mentions);
    } catch (error) {
      set(state => ({
        messages: { ...state.messages, [conversationId]: (state.messages[conversationId] || []).filter(m => m.id !== tempId) }
      }));
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

  subscribeToTyping: (conversationId: string) => {
    const unsubscribe = chatService.subscribeToTypingStatus(conversationId, (typingUsers) => {
      set((state) => ({ typingUsers: { ...state.typingUsers, [conversationId]: typingUsers } }));
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

  clearMessages: (conversationId: string) => {
    set((state) => {
      const newMessages = { ...state.messages };
      delete newMessages[conversationId];
      return { messages: newMessages };
    });
  },
});
