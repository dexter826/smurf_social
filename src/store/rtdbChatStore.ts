import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { RtdbMessage } from '../../shared/types';
import { PAGINATION } from '../constants';
import {
    createRtdbMessageSlice,
    createRtdbConversationSlice,
    createRtdbGroupSlice,
    RtdbMessageSlice,
    RtdbConversationSlice,
    RtdbGroupSlice
} from './chat';

export type RtdbChatState = RtdbMessageSlice & RtdbConversationSlice & RtdbGroupSlice & {
    draftMessages: Record<string, string>;
    saveDraft: (convId: string, text: string) => void;
    clearDraft: (convId: string) => void;
    reset: () => void;
};

export const useRtdbChatStore = create<RtdbChatState>()(
    persist(
        (...a) => ({
            ...createRtdbMessageSlice(...a),
            ...createRtdbConversationSlice(...a),
            ...createRtdbGroupSlice(...a),

            draftMessages: {} as Record<string, string>,

            saveDraft: (convId: string, text: string) => {
                const [set] = a;
                if (text.trim()) {
                    set(state => ({ draftMessages: { ...state.draftMessages, [convId]: text } }));
                } else {
                    set(state => {
                        const next = { ...state.draftMessages };
                        delete next[convId];
                        return { draftMessages: next };
                    });
                }
            },

            clearDraft: (convId: string) => {
                const [set] = a;
                set(state => {
                    const next = { ...state.draftMessages };
                    delete next[convId];
                    return { draftMessages: next };
                });
            },

            reset: () => {
                const [set] = a;
                set({
                    conversations: [],
                    selectedConversationId: null,
                    messages: {},
                    hasMoreMessages: {},
                    searchTerm: '',
                    isSearchFocused: false,
                    searchResults: { users: [], conversations: [] },
                    searchHistory: {},
                    isChatVisible: false,
                    isLoadingMore: {},
                    uploadProgress: {},
                    draftMessages: {},
                    userChats: {},
                });
            },
        }),
        {
            name: 'smurf_rtdb_chat_cache',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => {
                const cachedMessages: Record<string, Array<{ id: string; data: RtdbMessage }>> = {};
                
                // Chỉ cache số lượng tin nhắn giới hạn để tối ưu dung lượng localStorage
                Object.keys(state.messages).forEach(convId => {
                    const msgs = state.messages[convId];
                    if (msgs?.length) {
                        cachedMessages[convId] = msgs.slice(-PAGINATION.CHAT_CACHE_LIMIT);
                    }
                });

                return {
                    conversations: state.conversations,
                    searchHistory: state.searchHistory,
                    messages: cachedMessages,
                    draftMessages: state.draftMessages,
                    userChats: state.userChats
                };
            },
        }
    )
);

import { registerStore } from './storeUtils';
registerStore(() => useRtdbChatStore.getState().reset());
