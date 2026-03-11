import { ref, set, get, update, push, query, orderByChild, limitToLast, endBefore, onChildAdded, onChildChanged, off, increment } from 'firebase/database';
import { rtdb } from '../../firebase/config';
import { RtdbMessage, RtdbConversation, MessageType, MediaObject } from '../../types';
import { TIME_LIMITS, IMAGE_COMPRESSION } from '../../constants';
import { compressImage } from '../../utils/imageUtils';
import { withRetry } from '../../utils/retryUtils';
import { uploadWithProgress, ProgressCallback } from '../../utils/uploadUtils';

/**
 * Cập nhật tin nhắn và lastMessage đồng thời.
 */
async function updateConversationAndMessage(
    convId: string,
    msgId: string,
    senderId: string,
    messageData: RtdbMessage,
    displayContent: string
): Promise<void> {
    try {
        const convRef = ref(rtdb, `conversations/${convId}`);
        const convSnap = await get(convRef);

        const updates: Record<string, any> = {};

        // Ghi tin nhắn mới.
        updates[`messages/${convId}/${msgId}`] = messageData;

        if (convSnap.exists()) {
            const conversation = convSnap.val() as RtdbConversation;
            const memberIds = Object.keys(conversation.members || {});

            // Update conversation lastMessage
            updates[`conversations/${convId}/lastMessage`] = {
                senderId,
                content: displayContent,
                type: messageData.type,
                timestamp: messageData.createdAt || Date.now()
            };
            updates[`conversations/${convId}/updatedAt`] = messageData.createdAt || Date.now();

            // Tăng số lượng tin chưa đọc cho người nhận.
            for (const memberId of memberIds) {
                if (memberId !== senderId) {
                    updates[`user_chats/${memberId}/${convId}/unreadCount`] = increment(1);
                    updates[`user_chats/${memberId}/${convId}/lastMsgTimestamp`] = messageData.createdAt || Date.now();
                    updates[`user_chats/${memberId}/${convId}/isArchived`] = false;
                } else {
                    // Cập nhật mốc thời gian cho người gửi.
                    updates[`user_chats/${memberId}/${convId}/lastMsgTimestamp`] = messageData.createdAt || Date.now();
                }
            }
        }

        await update(ref(rtdb), updates);
    } catch (error) {
        console.error('[rtdbMessageService] Lỗi updateConversationAndMessage:', error);
    }
}

/**
 * Upload and send media message
 */
async function createAndSendMediaMessage(
    convId: string,
    senderId: string,
    file: File,
    type: MessageType,
    options: {
        replyToId?: string;
        replyToSnippet?: RtdbMessage['replyToSnippet'];
        onProgress?: ProgressCallback;
        compress?: boolean;
        displayContent: string;
        mentions?: string[];
    }
): Promise<string> {
    let uploadFile: File = file;

    // Compress image
    if (options.compress && type === MessageType.IMAGE) {
        uploadFile = await compressImage(file, IMAGE_COMPRESSION.CHAT);
    }

    const createdAt = Date.now();
    const path = `chats/${convId}/${createdAt}_${file.name}`;

    const fileUrl = await withRetry(() =>
        uploadWithProgress(path, uploadFile, options.onProgress)
    );

    const mediaObject: MediaObject = {
        url: fileUrl,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        isSensitive: false
    };

    const newMsgRef = push(ref(rtdb, `messages/${convId}`));
    const msgId = newMsgRef.key!;

    const messageData: RtdbMessage = {
        senderId,
        type,
        content: type === MessageType.FILE ? file.name : '',
        media: [mediaObject],
        mentions: options.mentions || [],
        isForwarded: false,
        replyToId: options.replyToId || null,
        replyToSnippet: options.replyToSnippet || null,
        isEdited: false,
        isRecalled: false,
        deletedBy: {},
        readBy: {},
        deliveredTo: {},
        reactions: {},
        createdAt,
        updatedAt: createdAt
    };

    await updateConversationAndMessage(convId, msgId, senderId, messageData, options.displayContent);

    return msgId;
}

export const rtdbMessageService = {
    /**
     * Send text message
     */
    sendTextMessage: async (
        convId: string,
        senderId: string,
        content: string,
        options?: {
            replyToId?: string;
            replyToSnippet?: RtdbMessage['replyToSnippet'];
            isForwarded?: boolean;
            mentions?: string[];
        }
    ): Promise<string> => {
        try {
            const newMsgRef = push(ref(rtdb, `messages/${convId}`));
            const msgId = newMsgRef.key!;

            const messageData: RtdbMessage = {
                senderId,
                type: MessageType.TEXT,
                content,
                media: [],
                mentions: options?.mentions || [],
                isForwarded: options?.isForwarded || false,
                replyToId: options?.replyToId || null,
                replyToSnippet: options?.replyToSnippet || null,
                isEdited: false,
                isRecalled: false,
                deletedBy: {},
                readBy: {},
                deliveredTo: {},
                reactions: {},
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            await updateConversationAndMessage(convId, msgId, senderId, messageData, content);

            return msgId;
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi sendTextMessage:', error);
            throw error;
        }
    },

    /**
     * Send image message
     */
    sendImageMessage: async (
        convId: string,
        senderId: string,
        file: File,
        options?: {
            replyToId?: string;
            replyToSnippet?: RtdbMessage['replyToSnippet'];
            onProgress?: ProgressCallback;
            mentions?: string[];
        }
    ): Promise<string> => {
        try {
            return await createAndSendMediaMessage(convId, senderId, file, MessageType.IMAGE, {
                ...options,
                compress: true,
                displayContent: 'Hình ảnh'
            });
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi sendImageMessage:', error);
            throw error;
        }
    },

    /**
     * Send video message
     */
    sendVideoMessage: async (
        convId: string,
        senderId: string,
        file: File,
        options?: {
            replyToId?: string;
            replyToSnippet?: RtdbMessage['replyToSnippet'];
            onProgress?: ProgressCallback;
            mentions?: string[];
        }
    ): Promise<string> => {
        try {
            return await createAndSendMediaMessage(convId, senderId, file, MessageType.VIDEO, {
                ...options,
                compress: false,
                displayContent: 'Video'
            });
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi sendVideoMessage:', error);
            throw error;
        }
    },

    /**
     * Send file message
     */
    sendFileMessage: async (
        convId: string,
        senderId: string,
        file: File,
        options?: {
            replyToId?: string;
            replyToSnippet?: RtdbMessage['replyToSnippet'];
            onProgress?: ProgressCallback;
            mentions?: string[];
        }
    ): Promise<string> => {
        try {
            return await createAndSendMediaMessage(convId, senderId, file, MessageType.FILE, {
                ...options,
                compress: false,
                displayContent: file.name
            });
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi sendFileMessage:', error);
            throw error;
        }
    },

    /**
     * Send voice message
     */
    sendVoiceMessage: async (
        convId: string,
        senderId: string,
        file: File,
        options?: {
            replyToId?: string;
            replyToSnippet?: RtdbMessage['replyToSnippet'];
            onProgress?: ProgressCallback;
            mentions?: string[];
        }
    ): Promise<string> => {
        try {
            return await createAndSendMediaMessage(convId, senderId, file, MessageType.VOICE, {
                ...options,
                compress: false,
                displayContent: 'Tin nhắn thoại'
            });
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi sendVoiceMessage:', error);
            throw error;
        }
    },

    /**
     * Subscribe to messages (real-time)
     */
    subscribeToMessages: (
        convId: string,
        limitCount: number,
        callback: (messages: Array<{ id: string; data: RtdbMessage }>) => void
    ) => {
        const messagesRef = ref(rtdb, `messages/${convId}`);
        const messagesQuery = query(messagesRef, orderByChild('createdAt'), limitToLast(limitCount));

        const messages: Array<{ id: string; data: RtdbMessage }> = [];

        const childAddedHandler = (snapshot: any) => {
            const msgId = snapshot.key;
            const msgData = snapshot.val() as RtdbMessage;

            // Check if message already exists
            const existingIndex = messages.findIndex(m => m.id === msgId);
            if (existingIndex === -1) {
                messages.push({ id: msgId, data: msgData });
                messages.sort((a, b) => a.data.createdAt - b.data.createdAt);
                callback([...messages]);
            }
        };

        const childChangedHandler = (snapshot: any) => {
            const msgId = snapshot.key;
            const msgData = snapshot.val() as RtdbMessage;

            const existingIndex = messages.findIndex(m => m.id === msgId);
            if (existingIndex !== -1) {
                messages[existingIndex] = { id: msgId, data: msgData };
                callback([...messages]);
            }
        };

        onChildAdded(messagesQuery, childAddedHandler);
        onChildChanged(messagesQuery, childChangedHandler);

        // Return unsubscribe function
        return () => {
            off(messagesQuery, 'child_added', childAddedHandler);
            off(messagesQuery, 'child_changed', childChangedHandler);
        };
    },

    /**
     * Load more messages (pagination)
     */
    loadMoreMessages: async (
        convId: string,
        beforeTimestamp: number,
        limitCount: number
    ): Promise<Array<{ id: string; data: RtdbMessage }>> => {
        try {
            const messagesRef = ref(rtdb, `messages/${convId}`);
            const messagesQuery = query(
                messagesRef,
                orderByChild('createdAt'),
                endBefore(beforeTimestamp),
                limitToLast(limitCount)
            );

            const snapshot = await get(messagesQuery);
            const messages: Array<{ id: string; data: RtdbMessage }> = [];

            if (snapshot.exists()) {
                snapshot.forEach((childSnap) => {
                    messages.push({
                        id: childSnap.key!,
                        data: childSnap.val() as RtdbMessage
                    });
                });
            }

            return messages.sort((a, b) => a.data.createdAt - b.data.createdAt);
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi loadMoreMessages:', error);
            throw error;
        }
    },

    /**
     * Mark messages as read
     */
    markAsRead: async (convId: string, uid: string, lastMsgId?: string): Promise<void> => {
        try {
            const messagesRef = ref(rtdb, `messages/${convId}`);
            const snapshot = await get(messagesRef);

            if (!snapshot.exists()) return;

            const updates: Record<string, any> = {};
            let hasUpdates = false;

            snapshot.forEach((childSnap) => {
                const msgId = childSnap.key!;
                const msgData = childSnap.val() as RtdbMessage;

                // Xác nhận đã đọc tin do người khác gửi.
                if (msgData.senderId !== uid && !msgData.readBy?.[uid]) {
                    updates[`messages/${convId}/${msgId}/readBy/${uid}`] = Date.now();
                    updates[`messages/${convId}/${msgId}/deliveredTo/${uid}`] = Date.now();
                    hasUpdates = true;
                }
            });

            // Ghi đè lastMessage mới nhất.
            const convRef = ref(rtdb, `conversations/${convId}/lastMessage`);
            const convSnap = await get(convRef);
            if (convSnap.exists()) {
                const lastMsg = convSnap.val();
                if (lastMsg && lastMsg.senderId !== uid && !lastMsg.readBy?.[uid]) {
                    updates[`conversations/${convId}/lastMessage/readBy/${uid}`] = Date.now();
                    updates[`conversations/${convId}/lastMessage/deliveredTo/${uid}`] = Date.now();
                    hasUpdates = true;
                }
            }

            if (hasUpdates) {
                await update(ref(rtdb), updates);
            }

            // Xóa bỏ số lượng tin chưa đọc.
            const userChatUpdates: Record<string, any> = {
                [`user_chats/${uid}/${convId}/unreadCount`]: 0
            };

            if (lastMsgId) {
                userChatUpdates[`user_chats/${uid}/${convId}/lastReadMsgId`] = lastMsgId;
            }

            await update(ref(rtdb), userChatUpdates);
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi markAsRead:', error);
            throw error;
        }
    },

    /**
     * Mark messages as delivered
     */
    markAsDelivered: async (convId: string, uid: string): Promise<void> => {
        try {
            const messagesRef = ref(rtdb, `messages/${convId}`);
            const snapshot = await get(messagesRef);

            if (!snapshot.exists()) return;

            const updates: Record<string, any> = {};
            let hasUpdates = false;

            snapshot.forEach((childSnap) => {
                const msgId = childSnap.key!;
                const msgData = childSnap.val() as RtdbMessage;

                // Xác nhận trạng thái đã nhận tin.
                if (msgData.senderId !== uid && !msgData.deliveredTo?.[uid]) {
                    updates[`messages/${convId}/${msgId}/deliveredTo/${uid}`] = Date.now();
                    hasUpdates = true;
                }
            });

            // Đồng bộ trạng thái đã nhận vào lastMessage.
            const convRef = ref(rtdb, `conversations/${convId}/lastMessage`);
            const convSnap = await get(convRef);
            if (convSnap.exists()) {
                const lastMsg = convSnap.val();
                if (lastMsg && lastMsg.senderId !== uid && !lastMsg.deliveredTo?.[uid]) {
                    updates[`conversations/${convId}/lastMessage/deliveredTo/${uid}`] = Date.now();
                    hasUpdates = true;
                }
            }

            if (hasUpdates) {
                await update(ref(rtdb), updates);
            }
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi markAsDelivered:', error);
            throw error;
        }
    },

    /**
     * Recall message (for everyone)
     */
    recallMessage: async (convId: string, msgId: string, uid: string): Promise<void> => {
        try {
            const msgRef = ref(rtdb, `messages/${convId}/${msgId}`);
            const msgSnap = await get(msgRef);

            if (!msgSnap.exists()) {
                throw new Error('Tin nhắn không tồn tại');
            }

            const msgData = msgSnap.val() as RtdbMessage;

            if (msgData.senderId !== uid) {
                throw new Error('Chỉ người gửi mới được thu hồi tin nhắn');
            }

            await update(msgRef, {
                isRecalled: true,
                content: 'Tin nhắn đã được thu hồi',
                updatedAt: Date.now()
            });

            // Update lastMessage if this is the last message
            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);

            if (convSnap.exists()) {
                const conv = convSnap.val() as RtdbConversation;
                if (conv.lastMessage && conv.lastMessage.timestamp === msgData.createdAt) {
                    await update(convRef, {
                        'lastMessage/content': 'Tin nhắn đã được thu hồi',
                        updatedAt: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi recallMessage:', error);
            throw error;
        }
    },

    /**
     * Delete message for me
     */
    deleteForMe: async (convId: string, msgId: string, uid: string): Promise<void> => {
        try {
            const msgRef = ref(rtdb, `messages/${convId}/${msgId}/deletedBy/${uid}`);
            await set(msgRef, true);
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi deleteForMe:', error);
            throw error;
        }
    },

    /**
     * Edit message (within time limit)
     */
    editMessage: async (convId: string, msgId: string, uid: string, newContent: string): Promise<void> => {
        try {
            const msgRef = ref(rtdb, `messages/${convId}/${msgId}`);
            const msgSnap = await get(msgRef);

            if (!msgSnap.exists()) {
                throw new Error('Tin nhắn không tồn tại');
            }

            const msgData = msgSnap.val() as RtdbMessage;

            if (msgData.senderId !== uid) {
                throw new Error('Chỉ người gửi mới được chỉnh sửa tin nhắn');
            }

            const now = Date.now();
            const diffInMillis = now - msgData.createdAt;

            if (diffInMillis > TIME_LIMITS.MESSAGE_EDIT_WINDOW) {
                throw new Error(
                    `Đã hết thời gian chỉnh sửa (tối đa ${TIME_LIMITS.MESSAGE_EDIT_WINDOW / (1000 * 60)} phút)`
                );
            }

            await update(msgRef, {
                content: newContent,
                isEdited: true,
                updatedAt: now
            });
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi editMessage:', error);
            throw error;
        }
    },

    /**
     * Forward message
     */
    forwardMessage: async (
        targetConvId: string,
        senderId: string,
        srcMsg: RtdbMessage
    ): Promise<string> => {
        try {
            const newMsgRef = push(ref(rtdb, `messages/${targetConvId}`));
            const msgId = newMsgRef.key!;

            const messageData: RtdbMessage = {
                senderId,
                type: srcMsg.type,
                content: srcMsg.content,
                media: srcMsg.media || [],
                mentions: [],
                isForwarded: true,
                replyToId: null,
                replyToSnippet: null,
                isEdited: false,
                isRecalled: false,
                deletedBy: {},
                readBy: {},
                deliveredTo: {},
                reactions: {},
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            let displayContent = srcMsg.content;
            if (srcMsg.type === MessageType.IMAGE) displayContent = 'Hình ảnh';
            else if (srcMsg.type === MessageType.VIDEO) displayContent = 'Video';
            else if (srcMsg.type === MessageType.FILE) displayContent = srcMsg.media?.[0]?.fileName || 'Tài liệu';
            else if (srcMsg.type === MessageType.VOICE) displayContent = 'Tin nhắn thoại';

            await updateConversationAndMessage(targetConvId, msgId, senderId, messageData, displayContent);

            return msgId;
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi forwardMessage:', error);
            throw error;
        }
    },

    /**
     * Toggle reaction
     */
    toggleReaction: async (convId: string, msgId: string, uid: string, emoji: string): Promise<void> => {
        try {
            const reactionRef = ref(rtdb, `messages/${convId}/${msgId}/reactions/${uid}`);
            const reactionSnap = await get(reactionRef);

            if (reactionSnap.exists() && reactionSnap.val() === emoji) {
                // Remove reaction
                await set(reactionRef, null);
            } else {
                // Add or update reaction
                await set(reactionRef, emoji);
            }
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi toggleReaction:', error);
            throw error;
        }
    },

    /**
     * Send system message
     */
    sendSystemMessage: async (convId: string, content: string): Promise<string> => {
        try {
            const newMsgRef = push(ref(rtdb, `messages/${convId}`));
            const msgId = newMsgRef.key!;

            const messageData: RtdbMessage = {
                senderId: 'system',
                type: MessageType.SYSTEM,
                content,
                media: [],
                mentions: [],
                isForwarded: false,
                replyToId: null,
                replyToSnippet: null,
                isEdited: false,
                isRecalled: false,
                deletedBy: {},
                readBy: {},
                deliveredTo: {},
                reactions: {},
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            await set(newMsgRef, messageData);

            // Update conversation lastMessage
            const convRef = ref(rtdb, `conversations/${convId}`);
            await update(convRef, {
                lastMessage: {
                    senderId: 'system',
                    content,
                    type: MessageType.SYSTEM,
                    timestamp: Date.now()
                },
                updatedAt: Date.now()
            });

            return msgId;
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi sendSystemMessage:', error);
            throw error;
        }
    }
};
