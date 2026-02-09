import { StateCreator } from 'zustand';
import { Message, MessageType, Conversation } from '../../types';
import { chatService } from '../../services/chatService';
import { useAuthStore } from '../authStore';
import { DocumentSnapshot } from 'firebase/firestore';
import type { ChatState } from '../chatStore';
import { PAGINATION } from '../../constants';

export interface MessageSlice {
  messages: Record<string, Message[]>;
  lastMessageDocs: Record<string, DocumentSnapshot | null>;
  hasMoreMessages: Record<string, boolean>;
  isLoadingMore: Record<string, boolean>;
  typingUsers: Record<string, string[]>;
  uploadProgress: Record<string, { progress: number; error?: boolean; localUrl?: string }>;


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
  setUploadProgress: (messageId: string, progress: number) => void;
  setUploadError: (messageId: string, isError: boolean) => void;
}

const LIMIT_PER_PAGE = PAGINATION.CHAT_MESSAGES;

const getEffectiveJoinedAt = (conversation: Conversation | undefined, userId: string): Date | undefined => {
  if (!conversation) return undefined;
  const joinedAt = conversation.memberJoinedAt?.[userId];
  const deletedAt = conversation.deletedAt?.[userId];
  if (deletedAt && (!joinedAt || deletedAt > joinedAt)) return deletedAt;
  return joinedAt;
};

type MediaType = 'image' | 'video' | 'file' | 'voice';

const mediaConfig: Record<MediaType, { 
  prefix: string; 
  messageType: MessageType; 
  serviceFn: keyof typeof chatService;
  errorMsg: string;
}> = {
  image: { prefix: 'img', messageType: MessageType.IMAGE, serviceFn: 'sendImageMessage', errorMsg: 'Lỗi gửi ảnh:' },
  video: { prefix: 'video', messageType: MessageType.VIDEO, serviceFn: 'sendVideoMessage', errorMsg: 'Lỗi gửi video:' },
  file: { prefix: 'file', messageType: MessageType.FILE, serviceFn: 'sendFileMessage', errorMsg: 'Lỗi gửi tệp:' },
  voice: { prefix: 'voice', messageType: MessageType.VOICE, serviceFn: 'sendVoiceMessage', errorMsg: 'Lỗi gửi voice:' },
};

const sendMediaMessage = (
  type: MediaType,
  conversationId: string,
  senderId: string,
  file: File,
  set: (partial: Partial<ChatState> | ((state: ChatState) => Partial<ChatState>)) => void,
  get: () => ChatState
) => {
  const config = mediaConfig[type];
  const tempId = `temp-${config.prefix}-${Date.now()}`;
  const isFile = type === 'file';
  const localUrl = isFile ? undefined : URL.createObjectURL(file);

  const optimisticMessage: Message = {
    id: tempId,
    conversationId,
    senderId,
    content: isFile ? file.name : localUrl!,
    createdAt: new Date(),
    type: config.messageType,
    readBy: [senderId],
    deliveredTo: [senderId],
    ...(isFile ? { fileName: file.name, fileSize: file.size } : { fileUrl: localUrl }),
  };

  set(state => ({
    messages: { ...state.messages, [conversationId]: [...(state.messages[conversationId] || []), optimisticMessage] },
    uploadProgress: { ...state.uploadProgress, [tempId]: { progress: 0, ...(localUrl && { localUrl }) } }
  }));

  const serviceFn = chatService[config.serviceFn] as (
    conversationId: string, 
    senderId: string, 
    file: File, 
    replyToId: string | undefined, 
    onProgress: (p: { progress: number }) => void
  ) => Promise<void>;

  serviceFn(conversationId, senderId, file, undefined, (p: { progress: number }) => {
    get().setUploadProgress(tempId, p.progress);
  }).then(() => {
    set(state => {
      const newProgress = { ...state.uploadProgress };
      delete newProgress[tempId];
      return { uploadProgress: newProgress };
    });
  }).catch(error => {
    console.error(config.errorMsg, error);
    get().setUploadError(tempId, true);
  });
};

export const createMessageSlice: StateCreator<ChatState, [], [], MessageSlice> = (set, get) => ({
  messages: {},
  lastMessageDocs: {},
  hasMoreMessages: {},
  isLoadingMore: {},
  typingUsers: {},
  uploadProgress: {},

  subscribeToMessages: (conversationId: string) => {
    const { conversations } = get();
    const conversation = conversations.find((c: Conversation) => c.id === conversationId);
    const currentUserId = useAuthStore.getState().user?.id || '';
    const joinedAt = getEffectiveJoinedAt(conversation, currentUserId);

    const unsubscribe = chatService.subscribeToMessages(conversationId, LIMIT_PER_PAGE, (messages, lastDoc) => {
      set((state) => ({
        messages: { ...state.messages, [conversationId]: messages },
        lastMessageDocs: { ...state.lastMessageDocs, [conversationId]: lastDoc },
        hasMoreMessages: { ...state.hasMoreMessages, [conversationId]: messages.length >= LIMIT_PER_PAGE }
      }));
    }, joinedAt);
    return unsubscribe;
  },

  loadMoreMessages: async (conversationId: string) => {
    const { lastMessageDocs, isLoadingMore, hasMoreMessages, conversations } = get();
    const lastDoc = lastMessageDocs[conversationId];
    
    if (!lastDoc || isLoadingMore[conversationId] || hasMoreMessages[conversationId] === false) return;

    const conversation = conversations.find((c: Conversation) => c.id === conversationId);
    const currentUserId = useAuthStore.getState().user?.id || '';
    const joinedAt = getEffectiveJoinedAt(conversation, currentUserId);

    set((state) => ({ isLoadingMore: { ...state.isLoadingMore, [conversationId]: true } }));

    try {
      const result = await chatService.getMoreMessages(conversationId, lastDoc, LIMIT_PER_PAGE, joinedAt);
      
      set((state) => ({
        messages: { ...state.messages, [conversationId]: [...result.messages, ...(state.messages[conversationId] || [])] },
        lastMessageDocs: { ...state.lastMessageDocs, [conversationId]: result.lastDoc },
        hasMoreMessages: { ...state.hasMoreMessages, [conversationId]: result.hasMore },
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
      createdAt: new Date(),
      type: MessageType.TEXT,
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
    }
  },


  sendImageMessage: async (conversationId: string, senderId: string, file: File) => {
    sendMediaMessage('image', conversationId, senderId, file, set, get);
  },

  sendVideoMessage: async (conversationId: string, senderId: string, file: File) => {
    sendMediaMessage('video', conversationId, senderId, file, set, get);
  },

  sendFileMessage: async (conversationId: string, senderId: string, file: File) => {
    sendMediaMessage('file', conversationId, senderId, file, set, get);
  },

  sendVoiceMessage: async (conversationId: string, senderId: string, file: File) => {
    sendMediaMessage('voice', conversationId, senderId, file, set, get);
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
      const currentUserId = useAuthStore.getState().user?.id;
      if (!currentUserId) throw new Error("Chưa đăng nhập");
      await chatService.recallMessage(messageId, conversationId, currentUserId);
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
      const currentUserId = useAuthStore.getState().user?.id;
      if (!currentUserId) throw new Error("Chưa đăng nhập");
      await chatService.editMessage(messageId, content, currentUserId);
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

  setUploadProgress: (messageId: string, progress: number) => {
    set((state) => ({
      uploadProgress: {
        ...state.uploadProgress,
        [messageId]: { ...state.uploadProgress[messageId], progress }
      }
    }));
  },

  setUploadError: (messageId: string, isError: boolean) => {
    set((state) => ({
      uploadProgress: {
        ...state.uploadProgress,
        [messageId]: { ...state.uploadProgress[messageId], error: isError }
      }
    }));
  },
});

