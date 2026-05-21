import { StateCreator } from 'zustand';
import { ref, onValue, get as dbGet } from 'firebase/database';
import { rtdb } from '../../firebase/config';
import { RtdbMessage, MessageType, SharedPostMessagePayload } from '../../../shared/types';
import { rtdbMessageService } from '../../services/chat/messages';
import { useAuthStore } from '../authStore';
import type { RtdbChatState } from '../rtdbChatStore';
import { PAGINATION } from '../../constants';
import { getServerSyncedNow } from '../../services/chat/chatTime';
import { toast } from '../toastStore';

export interface RtdbMessageSlice {
    messages: Record<string, Array<{ id: string; data: RtdbMessage }>>;
    pinnedMessagesDetails: Record<string, Record<string, RtdbMessage>>;
    hasMoreMessages: Record<string, boolean>;
    isLoadingMore: Record<string, boolean>;
    uploadProgress: Record<string, { progress: number; error?: boolean; localUrls?: string[] }>;
    failedMessageIds: Record<string, boolean>;

    subscribeToMessages: (conversationId: string) => () => void;
    loadMoreMessages: (conversationId: string) => Promise<void>;
    sendTextMessage: (conversationId: string, senderId: string, content: string, mentions?: string[], replyToId?: string) => Promise<void>;
    sendSharedPostMessage: (conversationId: string, senderId: string, payload: SharedPostMessagePayload, replyToId?: string) => Promise<void>;
    sendImageMessage: (conversationId: string, senderId: string, files: File[], options?: { content?: string; mentions?: string[]; replyToId?: string }) => Promise<void>;
    sendFileMessage: (conversationId: string, senderId: string, file: File, replyToId?: string) => Promise<void>;
    sendVideoMessage: (conversationId: string, senderId: string, file: File, replyToId?: string) => Promise<void>;
    sendVoiceMessage: (conversationId: string, senderId: string, file: File, replyToId?: string, duration?: number) => Promise<void>;
    sendGifMessage: (conversationId: string, senderId: string, gifUrl: string, replyToId?: string) => Promise<void>;
    sendCallMessage: (conversationId: string, senderId: string, payload: { callType: 'voice' | 'video'; status: 'ended' | 'missed' | 'rejected' | 'started'; duration?: number }) => Promise<string>;
    updateCallMessage: (conversationId: string, messageId: string, payload: { callType: 'voice' | 'video'; status: 'ended' | 'missed' | 'rejected' | 'started'; duration?: number }) => Promise<void>;
    markAsRead: (conversationId: string, userId: string) => Promise<void>;
    markAsDelivered: (conversationId: string, userId: string) => Promise<void>;
    recallMessage: (conversationId: string, messageId: string) => Promise<void>;
    deleteMessageForMe: (conversationId: string, messageId: string, userId: string) => Promise<void>;
    forwardMessage: (targetConversationId: string, senderId: string, srcMessage: RtdbMessage) => Promise<void>;
    editMessage: (conversationId: string, messageId: string, content: string) => Promise<void>;
    toggleReaction: (conversationId: string, messageId: string, userId: string, emoji: string) => Promise<void>;
    resendMessage: (conversationId: string, messageId: string) => Promise<void>;
    clearMessages: (conversationId: string) => void;
    setUploadProgress: (messageId: string, progress: number) => void;
    setUploadError: (messageId: string, isError: boolean) => void;
    pinMessage: (conversationId: string, messageId: string) => Promise<void>;
    unpinMessage: (conversationId: string, messageId: string) => Promise<void>;
}

const LIMIT_PER_PAGE = PAGINATION.CHAT_MESSAGES;

export const createRtdbMessageSlice: StateCreator<RtdbChatState, [], [], RtdbMessageSlice> = (set, get) => ({
    messages: {},
    pinnedMessagesDetails: {},
    hasMoreMessages: {},
    isLoadingMore: {},
    uploadProgress: {},
    failedMessageIds: {},

    /** Theo dõi tin nhắn */
    subscribeToMessages: (conversationId: string) => {
        set((state) => ({
            hasMoreMessages: {
                ...state.hasMoreMessages,
                [conversationId]: true
            }
        }));

        const userChat = get().userChats[conversationId];
        const clearedAt = userChat?.clearedAt || 0;

        const unsubscribe = rtdbMessageService.subscribeToMessages(conversationId, LIMIT_PER_PAGE, (newIncomingMessages) => {
            set((state) => {
                const currentMessages = state.messages[conversationId] || [];

                const messageMap = new Map();

                currentMessages.forEach(m => messageMap.set(m.id, m));
                newIncomingMessages.forEach(m => messageMap.set(m.id, m));

                const mergedMessages = Array.from(messageMap.values())
                    .filter(m => m.data.createdAt > clearedAt)
                    .sort((a, b) => a.data.createdAt - b.data.createdAt);

                return {
                    messages: {
                        ...state.messages,
                        [conversationId]: mergedMessages
                    }
                };
            });
        }, clearedAt);

        const pinnedRef = ref(rtdb, `conversations/${conversationId}/pinnedMessages`);
        const unsubPinned = onValue(pinnedRef, async (snapshot) => {
            if (snapshot.exists()) {
                const pinnedData = snapshot.val() as Record<string, { pinnedBy: string; pinnedAt: number }>;
                const msgIds = Object.keys(pinnedData);

                for (const msgId of msgIds) {
                    const currentDetails = get().pinnedMessagesDetails[conversationId]?.[msgId];
                    if (!currentDetails) {
                        const loadedMsg = get().messages[conversationId]?.find(m => m.id === msgId);
                        if (loadedMsg) {
                            set(state => ({
                                pinnedMessagesDetails: {
                                    ...state.pinnedMessagesDetails,
                                    [conversationId]: {
                                        ...(state.pinnedMessagesDetails[conversationId] || {}),
                                        [msgId]: loadedMsg.data
                                    }
                                }
                            }));
                        } else {
                            try {
                                const msgSnap = await dbGet(ref(rtdb, `messages/${conversationId}/${msgId}`));
                                if (msgSnap.exists()) {
                                    const msgData = msgSnap.val() as RtdbMessage;
                                    set(state => ({
                                        pinnedMessagesDetails: {
                                            ...state.pinnedMessagesDetails,
                                            [conversationId]: {
                                                ...(state.pinnedMessagesDetails[conversationId] || {}),
                                                [msgId]: msgData
                                            }
                                        }
                                    }));
                                }
                            } catch (error) {
                                console.error('Lỗi tải tin nhắn ghim:', error);
                            }
                        }
                    }
                }

                set(state => {
                    const currentDetails = state.pinnedMessagesDetails[conversationId] || {};
                    const nextDetails: Record<string, RtdbMessage> = {};
                    msgIds.forEach(id => {
                        if (currentDetails[id]) {
                            nextDetails[id] = currentDetails[id];
                        }
                    });
                    return {
                        pinnedMessagesDetails: {
                            ...state.pinnedMessagesDetails,
                            [conversationId]: nextDetails
                        }
                    };
                });
            } else {
                set(state => ({
                    pinnedMessagesDetails: {
                        ...state.pinnedMessagesDetails,
                        [conversationId]: {}
                    }
                }));
            }
        });

        return () => {
            unsubscribe();
            unsubPinned();
        };
    },

    /** Tải thêm tin nhắn */
    loadMoreMessages: async (conversationId: string) => {
        const currentMessages = get().messages[conversationId] || [];
        if (currentMessages.length === 0) return;

        set((state) => ({
            isLoadingMore: { ...state.isLoadingMore, [conversationId]: true }
        }));

        try {
            const oldestMessage = currentMessages[0];
            const beforeTimestamp = oldestMessage.data.createdAt;

            const userChat = get().userChats[conversationId];
            const clearedAt = userChat?.clearedAt || 0;

            const olderMessages = await rtdbMessageService.loadMoreMessages(
                conversationId,
                beforeTimestamp,
                LIMIT_PER_PAGE,
                clearedAt
            );

            set((state) => ({
                messages: {
                    ...state.messages,
                    [conversationId]: [...olderMessages, ...currentMessages]
                },
                hasMoreMessages: {
                    ...state.hasMoreMessages,
                    [conversationId]: olderMessages.length === LIMIT_PER_PAGE
                },
                isLoadingMore: { ...state.isLoadingMore, [conversationId]: false }
            }));
        } catch (error) {
            console.error('[rtdbMessageSlice] Lỗi loadMoreMessages:', error);
            set((state) => ({
                isLoadingMore: { ...state.isLoadingMore, [conversationId]: false }
            }));
        }
    },

    /** Gửi tin nhắn văn bản */
    sendTextMessage: async (conversationId: string, senderId: string, content: string, mentions?: string[], replyToId?: string) => {
        if (useAuthStore.getState().isBanned) throw new Error('Account is banned');
        
        const msgId = rtdbMessageService.generateMessageId(conversationId);
        const createdAt = getServerSyncedNow();

        set((state) => {
            const existing = state.messages[conversationId] || [];
            const optimisticMsg = {
                id: msgId,
                data: {
                    senderId,
                    type: MessageType.TEXT,
                    content,
                    media: [],
                    mentions: mentions || [],
                    isForwarded: false,
                    replyToId: replyToId || null,
                    isEdited: false,
                    isRecalled: false,
                    deletedBy: {},
                    readBy: {},
                    deliveredTo: {},
                    reactions: {},
                    createdAt,
                    updatedAt: createdAt
                } as RtdbMessage
            };

            return {
                messages: {
                    ...state.messages,
                    [conversationId]: [...existing, optimisticMsg].sort((a, b) => a.data.createdAt - b.data.createdAt)
                }
            };
        });

        try {
            await rtdbMessageService.sendTextMessage(conversationId, senderId, content, {
                mentions,
                replyToId,
                messageId: msgId
            });
            set((state) => {
                const next = { ...state.failedMessageIds };
                delete next[msgId];
                return { failedMessageIds: next };
            });
        } catch (error) {
            console.error('[rtdbMessageSlice] Lỗi sendTextMessage:', error);
            set((state) => ({
                failedMessageIds: { ...state.failedMessageIds, [msgId]: true }
            }));
        }
    },

    /** Chia sẻ bài viết */
    sendSharedPostMessage: async (conversationId: string, senderId: string, payload: SharedPostMessagePayload, replyToId?: string) => {
        if (useAuthStore.getState().isBanned) throw new Error('Account is banned');
        
        const msgId = rtdbMessageService.generateMessageId(conversationId);
        const createdAt = getServerSyncedNow();
        const content = JSON.stringify(payload);

        set((state) => {
            const existing = state.messages[conversationId] || [];
            const optimisticMsg = {
                id: msgId,
                data: {
                    senderId,
                    type: MessageType.SHARE_POST,
                    content,
                    media: [],
                    mentions: [],
                    isForwarded: false,
                    replyToId: replyToId || null,
                    isEdited: false,
                    isRecalled: false,
                    deletedBy: {},
                    readBy: {},
                    deliveredTo: {},
                    reactions: {},
                    createdAt,
                    updatedAt: createdAt
                } as RtdbMessage
            };

            return {
                messages: {
                    ...state.messages,
                    [conversationId]: [...existing, optimisticMsg].sort((a, b) => a.data.createdAt - b.data.createdAt)
                }
            };
        });

        try {
            await rtdbMessageService.sendSharedPostMessage(conversationId, senderId, payload, {
                replyToId,
                messageId: msgId
            });
            set((state) => {
                const next = { ...state.failedMessageIds };
                delete next[msgId];
                return { failedMessageIds: next };
            });
        } catch (error) {
            console.error('[rtdbMessageSlice] Lỗi sendSharedPostMessage:', error);
            set((state) => ({
                failedMessageIds: { ...state.failedMessageIds, [msgId]: true }
            }));
        }
    },

    /** Gửi tin nhắn ảnh */
    sendImageMessage: async (conversationId: string, senderId: string, files: File[], options?: { content?: string; mentions?: string[]; replyToId?: string }) => {
        if (useAuthStore.getState().isBanned) throw new Error('Account is banned');
        
        const { content = '', mentions = [], replyToId } = options || {};
        const msgId = rtdbMessageService.generateMessageId(conversationId);
        const createdAt = getServerSyncedNow();

        set((state) => {
            const existing = state.messages[conversationId] || [];
            const mediaPlaceholders = files.map(file => ({
                url: URL.createObjectURL(file),
                fileName: file.name,
                mimeType: file.type,
                size: file.size,
                isSensitive: false
            }));

            const optimisticMsg = {
                id: msgId,
                data: {
                    senderId,
                    type: MessageType.IMAGE,
                    content,
                    media: mediaPlaceholders,
                    mentions,
                    isForwarded: false,
                    replyToId: replyToId || null,
                    isEdited: false,
                    isRecalled: false,
                    deletedBy: {},
                    readBy: {},
                    deliveredTo: {},
                    reactions: {},
                    createdAt,
                    updatedAt: createdAt
                } as RtdbMessage
            };

            return {
                messages: {
                    ...state.messages,
                    [conversationId]: [...existing, optimisticMsg].sort((a, b) => a.data.createdAt - b.data.createdAt)
                },
                uploadProgress: {
                    ...state.uploadProgress,
                    [msgId]: { progress: 0, localUrls: mediaPlaceholders.map(m => m.url) }
                }
            };
        });

        try {
            await rtdbMessageService.sendImageMessage(conversationId, senderId, files, {
                replyToId,
                content,
                mentions,
                messageId: msgId,
                onProgressWithId: (messageId, progress) => {
                    get().setUploadProgress(messageId, progress.progress);
                }
            });
            set((state) => {
                const next = { ...state.failedMessageIds };
                delete next[msgId];
                return { failedMessageIds: next };
            });
        } catch (error) {
            console.error('[rtdbMessageSlice] Lỗi sendImageMessage:', error);
            set((state) => {
                const nextUploadProgress = { ...state.uploadProgress };
                delete nextUploadProgress[msgId];
                return { 
                    failedMessageIds: { ...state.failedMessageIds, [msgId]: true },
                    uploadProgress: nextUploadProgress
                };
            });
        }
    },

    /** Gửi tin nhắn tệp */
    sendFileMessage: async (conversationId: string, senderId: string, file: File, replyToId?: string) => {
        if (useAuthStore.getState().isBanned) throw new Error('Account is banned');
        
        const msgId = rtdbMessageService.generateMessageId(conversationId);
        const createdAt = getServerSyncedNow();

        const localUrl = URL.createObjectURL(file);

        set((state) => {
            const existing = state.messages[conversationId] || [];
            const optimisticMsg = {
                id: msgId,
                data: {
                    senderId,
                    type: MessageType.FILE,
                    content: '',
                    media: [{
                        url: localUrl,
                        fileName: file.name,
                        mimeType: file.type,
                        size: file.size,
                        isSensitive: false
                    }],
                    mentions: [],
                    isForwarded: false,
                    replyToId: replyToId || null,
                    isEdited: false,
                    isRecalled: false,
                    deletedBy: {},
                    readBy: {},
                    deliveredTo: {},
                    reactions: {},
                    createdAt,
                    updatedAt: createdAt
                } as RtdbMessage
            };

            return {
                messages: {
                    ...state.messages,
                    [conversationId]: [...existing, optimisticMsg].sort((a, b) => a.data.createdAt - b.data.createdAt)
                },
                uploadProgress: {
                    ...state.uploadProgress,
                    [msgId]: { progress: 0, localUrls: [localUrl] }
                }
            };
        });

        try {
            await rtdbMessageService.sendFileMessage(conversationId, senderId, file, {
                replyToId,
                messageId: msgId,
                onProgressWithId: (messageId, progress) => {
                    get().setUploadProgress(messageId, progress.progress);
                }
            });
            set((state) => {
                const next = { ...state.failedMessageIds };
                delete next[msgId];
                return { failedMessageIds: next };
            });
        } catch (error) {
            console.error('[rtdbMessageSlice] Lỗi sendFileMessage:', error);
            set((state) => {
                const nextUploadProgress = { ...state.uploadProgress };
                delete nextUploadProgress[msgId];
                return { 
                    failedMessageIds: { ...state.failedMessageIds, [msgId]: true },
                    uploadProgress: nextUploadProgress
                };
            });
        }
    },

    /** Gửi tin nhắn video */
    sendVideoMessage: async (conversationId: string, senderId: string, file: File, replyToId?: string) => {
        if (useAuthStore.getState().isBanned) throw new Error('Account is banned');
        
        const msgId = rtdbMessageService.generateMessageId(conversationId);
        const createdAt = getServerSyncedNow();
        const localUrl = URL.createObjectURL(file);

        set((state) => {
            const existing = state.messages[conversationId] || [];
            const optimisticMsg = {
                id: msgId,
                data: {
                    senderId,
                    type: MessageType.VIDEO,
                    content: '',
                    media: [{
                        url: localUrl,
                        fileName: file.name,
                        mimeType: file.type,
                        size: file.size,
                        isSensitive: false
                    }],
                    mentions: [],
                    isForwarded: false,
                    replyToId: replyToId || null,
                    isEdited: false,
                    isRecalled: false,
                    deletedBy: {},
                    readBy: {},
                    deliveredTo: {},
                    reactions: {},
                    createdAt,
                    updatedAt: createdAt
                } as RtdbMessage
            };

            return {
                messages: {
                    ...state.messages,
                    [conversationId]: [...existing, optimisticMsg].sort((a, b) => a.data.createdAt - b.data.createdAt)
                },
                uploadProgress: {
                    ...state.uploadProgress,
                    [msgId]: { progress: 0, localUrls: [localUrl] }
                }
            };
        });

        try {
            await rtdbMessageService.sendVideoMessage(conversationId, senderId, file, {
                replyToId,
                messageId: msgId,
                onProgressWithId: (messageId, progress) => {
                    get().setUploadProgress(messageId, progress.progress);
                }
            });
            set((state) => {
                const next = { ...state.failedMessageIds };
                delete next[msgId];
                return { failedMessageIds: next };
            });
        } catch (error) {
            console.error('[rtdbMessageSlice] Lỗi sendVideoMessage:', error);
            set((state) => {
                const nextUploadProgress = { ...state.uploadProgress };
                delete nextUploadProgress[msgId];
                return { 
                    failedMessageIds: { ...state.failedMessageIds, [msgId]: true },
                    uploadProgress: nextUploadProgress
                };
            });
        }
    },

    /** Gửi tin nhắn thoại */
    sendVoiceMessage: async (conversationId: string, senderId: string, file: File, replyToId?: string, duration?: number) => {
        if (useAuthStore.getState().isBanned) throw new Error('Account is banned');
        
        const msgId = rtdbMessageService.generateMessageId(conversationId);
        const createdAt = getServerSyncedNow();
        const localUrl = URL.createObjectURL(file);

        set((state) => {
            const existing = state.messages[conversationId] || [];
            const optimisticMsg = {
                id: msgId,
                data: {
                    senderId,
                    type: MessageType.VOICE,
                    content: duration ? String(duration) : '',
                    media: [{
                        url: localUrl,
                        fileName: file.name,
                        mimeType: file.type,
                        size: file.size,
                        isSensitive: false
                    }],
                    mentions: [],
                    isForwarded: false,
                    replyToId: replyToId || null,
                    isEdited: false,
                    isRecalled: false,
                    deletedBy: {},
                    readBy: {},
                    deliveredTo: {},
                    reactions: {},
                    createdAt,
                    updatedAt: createdAt
                } as RtdbMessage
            };

            return {
                messages: {
                    ...state.messages,
                    [conversationId]: [...existing, optimisticMsg].sort((a, b) => a.data.createdAt - b.data.createdAt)
                },
                uploadProgress: {
                    ...state.uploadProgress,
                    [msgId]: { progress: 0, localUrls: [localUrl] }
                }
            };
        });

        try {
            await rtdbMessageService.sendVoiceMessage(conversationId, senderId, file, {
                replyToId,
                messageId: msgId,
                duration,
                onProgressWithId: (messageId, progress) => {
                    get().setUploadProgress(messageId, progress.progress);
                }
            });
            set((state) => {
                const next = { ...state.failedMessageIds };
                delete next[msgId];
                return { failedMessageIds: next };
            });
        } catch (error) {
            console.error('[rtdbMessageSlice] Lỗi sendVoiceMessage:', error);
            set((state) => {
                const nextUploadProgress = { ...state.uploadProgress };
                delete nextUploadProgress[msgId];
                return { 
                    failedMessageIds: { ...state.failedMessageIds, [msgId]: true },
                    uploadProgress: nextUploadProgress
                };
            });
        }
    },

    /** Gửi tin nhắn GIF */
    sendGifMessage: async (conversationId: string, senderId: string, gifUrl: string, replyToId?: string) => {
        if (useAuthStore.getState().isBanned) throw new Error('Account is banned');
        
        const msgId = rtdbMessageService.generateMessageId(conversationId);
        const createdAt = getServerSyncedNow();

        set((state) => {
            const existing = state.messages[conversationId] || [];
            const optimisticMsg = {
                id: msgId,
                data: {
                    senderId,
                    type: MessageType.GIF,
                    content: gifUrl,
                    media: [],
                    mentions: [],
                    isForwarded: false,
                    replyToId: replyToId || null,
                    isEdited: false,
                    isRecalled: false,
                    deletedBy: {},
                    readBy: {},
                    deliveredTo: {},
                    reactions: {},
                    createdAt,
                    updatedAt: createdAt
                } as RtdbMessage
            };

            return {
                messages: {
                    ...state.messages,
                    [conversationId]: [...existing, optimisticMsg].sort((a, b) => a.data.createdAt - b.data.createdAt)
                }
            };
        });

        try {
            await rtdbMessageService.sendGifMessage(conversationId, senderId, gifUrl, { replyToId, messageId: msgId });
            set((state) => {
                const next = { ...state.failedMessageIds };
                delete next[msgId];
                return { failedMessageIds: next };
            });
        } catch (error) {
            console.error('[rtdbMessageSlice] Lỗi sendGifMessage:', error);
            set((state) => ({
                failedMessageIds: { ...state.failedMessageIds, [msgId]: true }
            }));
        }
    },

    /** Gửi tin nhắn cuộc gọi */
    sendCallMessage: async (conversationId, senderId, payload) => {
        if (useAuthStore.getState().isBanned) throw new Error('Account is banned');
        const msgId = rtdbMessageService.generateMessageId(conversationId);
        const createdAt = getServerSyncedNow();

        set((state) => {
            const existing = state.messages[conversationId] || [];
            const optimisticMsg = {
                id: msgId,
                data: {
                    senderId,
                    type: MessageType.CALL,
                    content: JSON.stringify(payload),
                    media: [],
                    mentions: [],
                    isForwarded: false,
                    isEdited: false,
                    isRecalled: false,
                    deletedBy: {},
                    readBy: {},
                    deliveredTo: {},
                    reactions: {},
                    createdAt,
                    updatedAt: createdAt
                } as RtdbMessage
            };

            return {
                messages: {
                    ...state.messages,
                    [conversationId]: [...existing, optimisticMsg].sort((a, b) => a.data.createdAt - b.data.createdAt)
                }
            };
        });

        try {
            await rtdbMessageService.sendCallMessage(conversationId, senderId, payload, msgId);
            set((state) => {
                const next = { ...state.failedMessageIds };
                delete next[msgId];
                return { failedMessageIds: next };
            });
            return msgId;
        } catch (error) {
            console.error('[rtdbMessageSlice] Lỗi sendCallMessage:', error);
            set((state) => ({
                failedMessageIds: { ...state.failedMessageIds, [msgId]: true }
            }));
            return msgId;
        }
    },

    /** Cập nhật tin nhắn cuộc gọi */
    updateCallMessage: async (conversationId, messageId, payload) => {
        try {
            const content = JSON.stringify(payload);
            await rtdbMessageService.updateMessageContent(conversationId, messageId, content, payload);
            
            set((state) => {
                const conversationMessages = state.messages[conversationId];
                if (!conversationMessages) return state;

                const messageIndex = conversationMessages.findIndex(m => m.id === messageId);
                if (messageIndex === -1) return state;

                const newMessages = [...conversationMessages];
                newMessages[messageIndex] = {
                    ...newMessages[messageIndex],
                    data: {
                        ...newMessages[messageIndex].data,
                        content,
                        updatedAt: getServerSyncedNow()
                    }
                };

                return {
                    messages: {
                        ...state.messages,
                        [conversationId]: newMessages
                    }
                };
            });
        } catch (error) {
            console.error('[rtdbMessageSlice] Lỗi updateCallMessage:', error);
            throw error;
        }
    },

    /** Đánh dấu đã đọc */
    markAsRead: async (conversationId: string, userId: string) => {
        if (get().conversations.some(c => c.id === conversationId)) {
            try {
                await rtdbMessageService.markAsRead(conversationId, userId);
            } catch (error) {
                console.error('[rtdbMessageSlice] Lỗi markAsRead:', error);
            }
        }
    },

    /** Đánh dấu đã phát */
    markAsDelivered: async (conversationId: string, userId: string) => {
        if (get().conversations.some(c => c.id === conversationId)) {
            try {
                await rtdbMessageService.markAsDelivered(conversationId, userId);
            } catch (error) {
                console.error('[rtdbMessageSlice] Lỗi markAsDelivered:', error);
            }
        }
    },

    /** Thu hồi tin nhắn */
    recallMessage: async (conversationId: string, messageId: string) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        const snapshot = get().messages[conversationId]?.find(m => m.id === messageId);

        set(state => {
            const msgs = state.messages[conversationId];
            if (!msgs) return state;
            return {
                messages: {
                    ...state.messages,
                    [conversationId]: msgs.map(m =>
                        m.id === messageId
                            ? { ...m, data: { ...m.data, isRecalled: true } }
                            : m
                    )
                }
            };
        });

        try {
            await rtdbMessageService.recallMessage(conversationId, messageId, userId);
        } catch (error) {
            if (snapshot) {
                set(state => ({
                    messages: {
                        ...state.messages,
                        [conversationId]: state.messages[conversationId]?.map(m =>
                            m.id === messageId ? snapshot : m
                        ) || []
                    }
                }));
            }
            console.error('[rtdbMessageSlice] Lỗi recallMessage:', error);
            throw error;
        }
    },

    /** Xóa tin nhắn phía tôi */
    deleteMessageForMe: async (conversationId: string, messageId: string, userId: string) => {
        const snapshot = get().messages[conversationId]?.find(m => m.id === messageId);
        set(state => {
            const msgs = state.messages[conversationId] || [];
            return {
                messages: {
                    ...state.messages,
                    [conversationId]: msgs.filter(m => m.id !== messageId)
                }
            };
        });

        try {
            await rtdbMessageService.deleteForMe(conversationId, messageId, userId);
        } catch (error) {
            if (snapshot) {
                set(state => {
                    const msgs = state.messages[conversationId] || [];
                    return {
                        messages: {
                            ...state.messages,
                            [conversationId]: [...msgs, snapshot].sort((a, b) => a.data.createdAt - b.data.createdAt)
                        }
                    };
                });
            }
            console.error('[rtdbMessageSlice] Lỗi deleteMessageForMe:', error);
            throw error;
        }
    },

    /** Chuyển tiếp tin nhắn */
    forwardMessage: async (targetConversationId, senderId, srcMessage) => {
        if (useAuthStore.getState().isBanned) throw new Error('Account is banned');
        const msgId = rtdbMessageService.generateMessageId(targetConversationId);
        const createdAt = getServerSyncedNow();

        const optimisticMsg = {
            id: msgId,
            data: {
                ...srcMessage,
                senderId,
                isForwarded: true,
                createdAt,
                updatedAt: createdAt,
                readBy: {},
                deliveredTo: {},
                reactions: {}
            } as RtdbMessage
        };

        set((state) => {
            const existing = state.messages[targetConversationId] || [];
            return {
                messages: {
                    ...state.messages,
                    [targetConversationId]: [...existing, optimisticMsg].sort((a, b) => a.data.createdAt - b.data.createdAt)
                }
            };
        });

        try {
            await rtdbMessageService.forwardMessage(targetConversationId, senderId, srcMessage, msgId);
            set((state) => {
                const next = { ...state.failedMessageIds };
                delete next[msgId];
                return { failedMessageIds: next };
            });
        } catch (error) {
            console.error('[rtdbMessageSlice] Lỗi forwardMessage:', error);
            set((state) => ({
                failedMessageIds: { ...state.failedMessageIds, [msgId]: true }
            }));
        }
    },

    /** Chỉnh sửa tin nhắn */
    editMessage: async (conversationId: string, messageId: string, content: string) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        const snapshot = get().messages[conversationId]?.find(m => m.id === messageId);

        set(state => {
            const msgs = state.messages[conversationId];
            if (!msgs) return state;
            return {
                messages: {
                    ...state.messages,
                    [conversationId]: msgs.map(m =>
                        m.id === messageId
                            ? { ...m, data: { ...m.data, content, isEdited: true, updatedAt: getServerSyncedNow() } }
                            : m
                    )
                }
            };
        });

        try {
            await rtdbMessageService.editMessage(conversationId, messageId, userId, content);
        } catch (error) {
            if (snapshot) {
                set(state => ({
                    messages: {
                        ...state.messages,
                        [conversationId]: state.messages[conversationId]?.map(m =>
                            m.id === messageId ? snapshot : m
                        ) || []
                    }
                }));
            }
            console.error('[rtdbMessageSlice] Lỗi editMessage:', error);
            throw error;
        }
    },

    /** Tương tác tin nhắn */
    toggleReaction: async (conversationId: string, messageId: string, userId: string, emoji: string) => {
        const snapshot = get().messages[conversationId]?.find(m => m.id === messageId);

        set(state => {
            const msgs = state.messages[conversationId];
            if (!msgs) return state;
            return {
                messages: {
                    ...state.messages,
                    [conversationId]: msgs.map(m => {
                        if (m.id !== messageId) return m;
                        const reactions = { ...(m.data.reactions || {}) };
                        if (reactions[userId] === emoji) {
                            delete reactions[userId];
                        } else {
                            reactions[userId] = emoji;
                        }
                        return { ...m, data: { ...m.data, reactions } };
                    })
                }
            };
        });

        try {
            await rtdbMessageService.toggleReaction(conversationId, messageId, userId, emoji);
        } catch (error) {
            if (snapshot) {
                set(state => ({
                    messages: {
                        ...state.messages,
                        [conversationId]: state.messages[conversationId]?.map(m =>
                            m.id === messageId ? snapshot : m
                        ) || []
                    }
                }));
            }
            console.error('[rtdbMessageSlice] Lỗi toggleReaction:', error);
            throw error;
        }
    },

    /** Thử gửi lại tin nhắn bị lỗi */
    resendMessage: async (conversationId: string, messageId: string) => {
        const msgs = get().messages[conversationId] || [];
        const msgObj = msgs.find(m => m.id === messageId);
        if (!msgObj || !get().failedMessageIds[messageId]) return;

        const { data } = msgObj;

        set((state) => {
            const next = { ...state.failedMessageIds };
            delete next[messageId];
            return { failedMessageIds: next };
        });

        try {
            switch (data.type) {
                case MessageType.TEXT:
                    await rtdbMessageService.sendTextMessage(conversationId, data.senderId, data.content, {
                        mentions: data.mentions,
                        replyToId: data.replyToId,
                        messageId
                    });
                    break;
                case MessageType.IMAGE:
                    console.warn('Resend media chưa được hỗ trợ đầy đủ nếu file gốc đã mất');
                    break;
                case MessageType.GIF:
                    await rtdbMessageService.sendGifMessage(conversationId, data.senderId, data.content, {
                        replyToId: data.replyToId,
                        messageId
                    });
                    break;
                case MessageType.SHARE_POST:
                    await rtdbMessageService.sendSharedPostMessage(conversationId, data.senderId, JSON.parse(data.content), {
                        replyToId: data.replyToId,
                        messageId
                    });
                    break;
                default:
                    console.warn('Loại tin nhắn không hỗ trợ gửi lại tự động:', data.type);
            }
        } catch (error) {
            console.error('[rtdbMessageSlice] Lỗi khi gửi lại tin nhắn:', error);
            set((state) => ({
                failedMessageIds: { ...state.failedMessageIds, [messageId]: true }
            }));
        }
    },

    /** Xóa danh sách tin nhắn */
    clearMessages: (conversationId: string) => {
        set((state) => {
            const newMessages = { ...state.messages };
            delete newMessages[conversationId];
            return { messages: newMessages };
        });
    },

    /** Cập nhật tiến độ tải lên */
    setUploadProgress: (messageId: string, progress: number) => {
        set((state) => {
            const next = { ...state.uploadProgress };
            if (progress >= 100) {
                delete next[messageId];
            } else {
                next[messageId] = { ...state.uploadProgress[messageId], progress };
            }
            return { uploadProgress: next };
        });
    },

    /** Thiết lập lỗi tải lên */
    setUploadError: (messageId: string, isError: boolean) => {
        set((state) => ({
            uploadProgress: {
                ...state.uploadProgress,
                [messageId]: { ...state.uploadProgress[messageId], error: isError }
            }
        }));
    },

    /** Ghim tin nhắn */
    pinMessage: async (conversationId: string, messageId: string) => {
        const userId = useAuthStore.getState().user?.id;
        const userName = useAuthStore.getState().user?.fullName;
        if (!userId || !userName) return;

        try {
            await rtdbMessageService.pinMessage(conversationId, messageId, userId, userName);
        } catch (error) {
            console.error('[rtdbMessageSlice] Lỗi pinMessage:', error);
            const errMsg = error instanceof Error ? error.message : 'Có lỗi xảy ra khi ghim tin nhắn';
            toast.error(errMsg);
            throw error;
        }
    },

    /** Bỏ ghim tin nhắn */
    unpinMessage: async (conversationId: string, messageId: string) => {
        const userId = useAuthStore.getState().user?.id;
        const userName = useAuthStore.getState().user?.fullName;
        if (!userId || !userName) return;

        try {
            await rtdbMessageService.unpinMessage(conversationId, messageId, userId, userName);
        } catch (error) {
            console.error('[rtdbMessageSlice] Lỗi unpinMessage:', error);
            const errMsg = error instanceof Error ? error.message : 'Có lỗi xảy ra khi bỏ ghim tin nhắn';
            toast.error(errMsg);
            throw error;
        }
    }
});
