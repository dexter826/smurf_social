import { ref, set, get, update, push, increment } from 'firebase/database';
import { rtdb } from '../../../firebase/config';
import { RtdbMessage, RtdbConversation, MessageType } from '../../../../shared/types';
import { TIME_LIMITS } from '../../../constants';
import { getConversationUpdatePaths, ensureConversationExists } from './messageHelpers';
import { getRtdbServerTimestamp, getServerSyncedNow } from '../chatTime';

export const messageActionService = {
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

            const updates: Record<string, any> = {
                [`messages/${convId}/${msgId}/content`]: '',
                [`messages/${convId}/${msgId}/media`]: [],
                [`messages/${convId}/${msgId}/isRecalled`]: true,
                [`messages/${convId}/${msgId}/updatedAt`]: getRtdbServerTimestamp()
            };

            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);

            if (convSnap.exists()) {
                const conv = convSnap.val() as RtdbConversation;
                if (conv.lastMessage && conv.lastMessage.messageId === msgId) {
                    updates[`conversations/${convId}/lastMessage/content`] = 'Tin nhắn đã thu hồi';
                    updates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();
                }
                if (conv.pinnedMessages && conv.pinnedMessages[msgId]) {
                    updates[`conversations/${convId}/pinnedMessages/${msgId}`] = null;
                }
            }

            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi recallMessage:', error);
            throw error;
        }
    },

    deleteForMe: async (convId: string, msgId: string, uid: string): Promise<void> => {
        try {
            const msgRef = ref(rtdb, `messages/${convId}/${msgId}/deletedBy/${uid}`);
            await set(msgRef, true);
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi deleteForMe:', error);
            throw error;
        }
    },

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

            const now = getServerSyncedNow();
            const diffInMillis = now - msgData.createdAt;

            if (diffInMillis > TIME_LIMITS.MESSAGE_EDIT_WINDOW) {
                throw new Error(
                    `Đã hết thời gian chỉnh sửa (tối đa ${TIME_LIMITS.MESSAGE_EDIT_WINDOW / (1000 * 60)} phút)`
                );
            }

            const updates: Record<string, any> = {
                [`messages/${convId}/${msgId}/content`]: newContent,
                [`messages/${convId}/${msgId}/isEdited`]: true,
                [`messages/${convId}/${msgId}/updatedAt`]: getRtdbServerTimestamp()
            };

            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);

            if (convSnap.exists()) {
                const conv = convSnap.val() as RtdbConversation;
                if (conv.lastMessage && conv.lastMessage.messageId === msgId) {
                    updates[`conversations/${convId}/lastMessage/content`] = newContent;
                    updates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();
                }
            }

            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi editMessage:', error);
            throw error;
        }
    },

    forwardMessage: async (
        targetConvId: string,
        senderId: string,
        srcMsg: RtdbMessage,
        messageId?: string
    ): Promise<string> => {
        try {
            const msgId = messageId || push(ref(rtdb, `messages/${targetConvId}`)).key!;
            const newMsgRef = ref(rtdb, `messages/${targetConvId}/${msgId}`);

            const messageData: RtdbMessage = {
                senderId,
                type: srcMsg.type,
                content: srcMsg.content,
                media: srcMsg.media || [],
                mentions: [],
                isForwarded: true,
                isEdited: false,
                isRecalled: false,
                deletedBy: {},
                readBy: {},
                deliveredTo: {},
                reactions: {},
                createdAt: getServerSyncedNow(),
                updatedAt: getServerSyncedNow()
            };

            let displayContent = srcMsg.content;
            if (srcMsg.type === MessageType.IMAGE) {
                const isAlbum = (srcMsg.media || []).length > 1;
                if (isAlbum) {
                    displayContent = '[Album hình ảnh]';
                } else {
                    displayContent = srcMsg.content ? `[Hình ảnh] ${srcMsg.content}` : '[Hình ảnh]';
                }
            } else if (srcMsg.type === MessageType.VIDEO) {
                displayContent = '[Video]';
            } else if (srcMsg.type === MessageType.FILE) {
                displayContent = `[File] ${srcMsg.media?.[0]?.fileName || 'Tài liệu'}`;
            } else if (srcMsg.type === MessageType.VOICE) {
                displayContent = '[Tin nhắn thoại]';
            } else if (srcMsg.type === MessageType.SHARE_POST) {
                displayContent = '[Chia sẻ bài viết]';
            } else if (srcMsg.type === MessageType.CALL) {
                try {
                    const parsed = JSON.parse(srcMsg.content) as { callType?: 'voice' | 'video' };
                    displayContent = parsed.callType === 'video' ? '[Cuộc gọi video]' : '[Cuộc gọi thoại]';
                } catch {
                    displayContent = '[Cuộc gọi]';
                }
            }

            const conversation = await ensureConversationExists(targetConvId, senderId);
            if (!conversation) throw new Error('Conversation not found');

            const updates = getConversationUpdatePaths(targetConvId, senderId, messageData, displayContent, conversation, msgId);
            updates[`messages/${targetConvId}/${msgId}`] = {
                ...messageData,
                createdAt: getRtdbServerTimestamp(),
                updatedAt: getRtdbServerTimestamp()
            };

            await update(ref(rtdb), updates);

            return msgId;
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi forwardMessage:', error);
            throw error;
        }
    },

    updateMessageContent: async (convId: string, msgId: string, newContent: string, payload?: any): Promise<void> => {
        try {
            const msgRef = ref(rtdb, `messages/${convId}/${msgId}`);
            const msgSnap = await get(msgRef);
            if (!msgSnap.exists()) return;
            const msgData = msgSnap.val() as RtdbMessage;

            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);
            if (!convSnap.exists()) return;

            const conv = convSnap.val() as RtdbConversation;

            const coreUpdates: Record<string, any> = {
                [`messages/${convId}/${msgId}/content`]: newContent,
                [`messages/${convId}/${msgId}/updatedAt`]: getRtdbServerTimestamp(),
            };

            if (conv.lastMessage && conv.lastMessage.messageId === msgId) {
                coreUpdates[`conversations/${convId}/lastMessage/content`] = payload
                    ? JSON.stringify(payload)
                    : newContent;
                coreUpdates[`conversations/${convId}/updatedAt`] = getRtdbServerTimestamp();
            }

            await update(ref(rtdb), coreUpdates);

            if (payload?.status === 'missed') {
                try {
                    const memberIds = Object.keys(conv.members || {});
                    const unreadUpdates: Record<string, any> = {};

                    memberIds
                        .filter(mId => mId !== msgData.senderId)
                        .forEach(mId => {
                            unreadUpdates[`user_chats/${mId}/${convId}/unreadCount`] = increment(1);
                        });

                    if (Object.keys(unreadUpdates).length > 0) {
                        await update(ref(rtdb), unreadUpdates);
                    }
                } catch {
                }
            }
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi updateMessageContent:', error);
            throw error;
        }
    },

    /** Ghim tin nhắn trong hội thoại */
    pinMessage: async (convId: string, msgId: string, uid: string, senderName: string): Promise<void> => {
        try {
            const pinnedSnap = await get(ref(rtdb, `conversations/${convId}/pinnedMessages`));
            const currentPinned = pinnedSnap.exists() ? pinnedSnap.val() : {};
            const pinnedCount = Object.keys(currentPinned).length;

            if (pinnedCount >= 3) {
                throw new Error('Chạm giới hạn ghim tin nhắn (tối đa 3 tin)');
            }

            const systemMsgId = push(ref(rtdb, `messages/${convId}`)).key!;
            const systemMessage: RtdbMessage = {
                senderId: 'system',
                type: MessageType.SYSTEM,
                content: `${senderName} đã ghim một tin nhắn`,
                media: [],
                mentions: [],
                createdAt: getServerSyncedNow(),
                updatedAt: getServerSyncedNow()
            };

            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);
            if (!convSnap.exists()) throw new Error('Hội thoại không tồn tại');
            const conversation = convSnap.val() as RtdbConversation;

            const updates = getConversationUpdatePaths(
                convId,
                'system',
                systemMessage,
                `${senderName} đã ghim một tin nhắn`,
                conversation,
                systemMsgId
            );

            updates[`conversations/${convId}/pinnedMessages/${msgId}`] = {
                pinnedBy: uid,
                pinnedAt: getRtdbServerTimestamp()
            };

            updates[`messages/${convId}/${systemMsgId}`] = {
                ...systemMessage,
                createdAt: getRtdbServerTimestamp(),
                updatedAt: getRtdbServerTimestamp()
            };

            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi pinMessage:', error);
            throw error;
        }
    },

    /** Bỏ ghim tin nhắn trong hội thoại */
    unpinMessage: async (convId: string, msgId: string, uid: string, senderName: string): Promise<void> => {
        try {
            const systemMsgId = push(ref(rtdb, `messages/${convId}`)).key!;
            const systemMessage: RtdbMessage = {
                senderId: 'system',
                type: MessageType.SYSTEM,
                content: `${senderName} đã bỏ ghim tin nhắn`,
                media: [],
                mentions: [],
                createdAt: getServerSyncedNow(),
                updatedAt: getServerSyncedNow()
            };

            const convRef = ref(rtdb, `conversations/${convId}`);
            const convSnap = await get(convRef);
            if (!convSnap.exists()) throw new Error('Hội thoại không tồn tại');
            const conversation = convSnap.val() as RtdbConversation;

            const updates = getConversationUpdatePaths(
                convId,
                'system',
                systemMessage,
                `${senderName} đã bỏ ghim tin nhắn`,
                conversation,
                systemMsgId
            );

            updates[`conversations/${convId}/pinnedMessages/${msgId}`] = null;

            updates[`messages/${convId}/${systemMsgId}`] = {
                ...systemMessage,
                createdAt: getRtdbServerTimestamp(),
                updatedAt: getRtdbServerTimestamp()
            };

            await update(ref(rtdb), updates);
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi unpinMessage:', error);
            throw error;
        }
    }
};
