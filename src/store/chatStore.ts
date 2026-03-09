import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Message } from '../types';
import { PAGINATION } from '../constants';
import {
  createMessageSlice,
  createConversationSlice,
  createGroupSlice,
  MessageSlice,
  ConversationSlice,
  GroupSlice
} from './chat';

export type ChatState = MessageSlice & ConversationSlice & GroupSlice & {
  reset: () => void;
};

export const useChatStore = create<ChatState>()(
  persist(
    (...a) => ({
      ...createMessageSlice(...a),
      ...createConversationSlice(...a),
      ...createGroupSlice(...a),

      reset: () => {
        const [set] = a;
        set({
          conversations: [],
          selectedConversationId: null,
          memberSettings: {},
          messages: {},
          lastMessageDocs: {},
          hasMoreMessages: {},
          typingUsers: {},
          searchTerm: '',
          isSearchFocused: false,
          searchResults: { conversations: [], users: [] },
          searchHistory: {},
          isChatVisible: false,
          isLoadingMore: {},
          uploadProgress: {},
          myMessageReactions: {},
        });
      },
    }),
    {
      name: 'smurf_chat_cache',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const cachedMessages: Record<string, Message[]> = {};
        Object.keys(state.messages).forEach(convId => {
          cachedMessages[convId] = (state.messages[convId] || []).slice(-PAGINATION.CHAT_CACHE_LIMIT);
        });
        return {
          conversations: state.conversations,
          searchHistory: state.searchHistory,
          messages: cachedMessages
        };
      },
    }
  )
);
