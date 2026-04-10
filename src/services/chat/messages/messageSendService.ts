import { ref, set, push } from 'firebase/database';
import { rtdb } from '../../../firebase/config';
import { RtdbMessage, MessageType, SharedPostMessagePayload } from '../../../../shared/types';
import { validateMessageContent, FileValidationError } from '../../../utils/fileValidation';
import {
    ProgressWithId,
    assignReplyToIdIfPresent,
    createAndSendMediaAlbumMessage,
    createAndSendMediaMessage,
    updateConversationAfterMessage
} from './messageHelpers';

export const messageSendService = {
    sendTextMessage: async (
        convId: string,
        senderId: string,
        content: string,
        options?: {
            replyToId?: string;
            isForwarded?: boolean;
            mentions?: string[];
        }
    ): Promise<string> => {
        try {
            validateMessageContent(content);

            const newMsgRef = push(ref(rtdb, `messages/${convId}`));
            const msgId = newMsgRef.key!;

            const messageData: RtdbMessage = {
                senderId,
                type: MessageType.TEXT,
                content,
                media: [],
                mentions: options?.mentions || [],
                isForwarded: options?.isForwarded || false,
                isEdited: false,
                isRecalled: false,
                deletedBy: {},
                readBy: {},
                deliveredTo: {},
                reactions: {},
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            assignReplyToIdIfPresent(messageData, options?.replyToId);

            await updateConversationAfterMessage(convId, senderId, messageData, content, msgId);
            await set(newMsgRef, messageData);

            return msgId;
        } catch (error) {
            if (error instanceof FileValidationError) {
                throw error;
            }
            console.error('[rtdbMessageService] Lỗi sendTextMessage:', error);
            throw error;
        }
    },

    sendSharedPostMessage: async (
        convId: string,
        senderId: string,
        payload: SharedPostMessagePayload,
        options?: {
            replyToId?: string;
            isForwarded?: boolean;
            mentions?: string[];
        }
    ): Promise<string> => {
        try {
            const newMsgRef = push(ref(rtdb, `messages/${convId}`));
            const msgId = newMsgRef.key!;
            const content = JSON.stringify(payload);

            const messageData: RtdbMessage = {
                senderId,
                type: MessageType.SHARE_POST,
                content,
                media: [],
                mentions: options?.mentions || [],
                isForwarded: options?.isForwarded || false,
                isEdited: false,
                isRecalled: false,
                deletedBy: {},
                readBy: {},
                deliveredTo: {},
                reactions: {},
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            assignReplyToIdIfPresent(messageData, options?.replyToId);

            await updateConversationAfterMessage(convId, senderId, messageData, '[Chia sẻ bài viết]', msgId);
            await set(newMsgRef, messageData);

            return msgId;
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi sendSharedPostMessage:', error);
            throw error;
        }
    },

    sendImageMessage: async (
        convId: string,
        senderId: string,
        file: File | File[],
        options?: {
            replyToId?: string;
            onProgressWithId?: ProgressWithId;
            mentions?: string[];
        }
    ): Promise<string> => {
        try {
            const files = Array.isArray(file) ? file : [file];

            const videoCount = files.filter(f => f.type.startsWith('video/')).length;
            const imageCount = files.filter(f => f.type.startsWith('image/')).length;
            const displayContent = videoCount > 0 && imageCount > 0
                ? '[Album Media]'
                : videoCount > 0 ? '[Video]' : '[Hình ảnh]';

            if (files.length <= 1) {
                const type = files[0].type.startsWith('video/') ? MessageType.VIDEO : MessageType.IMAGE;
                return await createAndSendMediaMessage(convId, senderId, files[0], type, {
                    ...options,
                    compress: type === MessageType.IMAGE,
                    displayContent
                });
            }

            return await createAndSendMediaAlbumMessage(convId, senderId, files, {
                ...options,
                displayContent
            });
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi sendImageMessage:', error);
            throw error;
        }
    },

    sendVideoMessage: async (
        convId: string,
        senderId: string,
        file: File,
        options?: {
            replyToId?: string;
            onProgressWithId?: ProgressWithId;
            mentions?: string[];
        }
    ): Promise<string> => {
        try {
            return await createAndSendMediaMessage(convId, senderId, file, MessageType.VIDEO, {
                ...options,
                compress: false,
                displayContent: '[Video]'
            });
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi sendVideoMessage:', error);
            throw error;
        }
    },

    sendFileMessage: async (
        convId: string,
        senderId: string,
        file: File,
        options?: {
            replyToId?: string;
            onProgressWithId?: ProgressWithId;
            mentions?: string[];
        }
    ): Promise<string> => {
        try {
            return await createAndSendMediaMessage(convId, senderId, file, MessageType.FILE, {
                ...options,
                compress: false,
                displayContent: `[File] ${file.name}`
            });
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi sendFileMessage:', error);
            throw error;
        }
    },

    sendVoiceMessage: async (
        convId: string,
        senderId: string,
        file: File,
        options?: {
            replyToId?: string;
            duration?: number;
            onProgressWithId?: ProgressWithId;
            mentions?: string[];
        }
    ): Promise<string> => {
        try {
            return await createAndSendMediaMessage(convId, senderId, file, MessageType.VOICE, {
                ...options,
                compress: false,
                displayContent: '[Tin nhắn thoại]',
                voiceDuration: options?.duration,
            });
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi sendVoiceMessage:', error);
            throw error;
        }
    },

    sendGifMessage: async (
        convId: string,
        senderId: string,
        gifUrl: string,
        options?: {
            replyToId?: string;
            mentions?: string[];
        }
    ): Promise<string> => {
        try {
            const newMsgRef = push(ref(rtdb, `messages/${convId}`));
            const msgId = newMsgRef.key!;

            const messageData: RtdbMessage = {
                senderId,
                type: MessageType.GIF,
                content: gifUrl,
                media: [],
                mentions: options?.mentions || [],
                isForwarded: false,
                isEdited: false,
                isRecalled: false,
                deletedBy: {},
                readBy: {},
                deliveredTo: {},
                reactions: {},
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            assignReplyToIdIfPresent(messageData, options?.replyToId);

            await updateConversationAfterMessage(convId, senderId, messageData, '[GIF]', msgId);
            await set(newMsgRef, messageData);

            return msgId;
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi sendGifMessage:', error);
            throw error;
        }
    },

    sendSystemMessage: async (
        convId: string,
        content: string
    ): Promise<string> => {
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
                replyToId: undefined,
                isEdited: false,
                isRecalled: false,
                deletedBy: {},
                readBy: {},
                deliveredTo: {},
                reactions: {},
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            await updateConversationAfterMessage(convId, 'system', messageData, content, msgId);
            await set(newMsgRef, messageData);

            return msgId;
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi sendSystemMessage:', error);
            throw error;
        }
    },

    sendCallMessage: async (
        convId: string,
        senderId: string,
        payload: { callType: 'voice' | 'video'; status: 'ended' | 'missed' | 'rejected' | 'started'; duration?: number }
    ): Promise<string> => {
        try {
            const newMsgRef = push(ref(rtdb, `messages/${convId}`));
            const msgId = newMsgRef.key!;

            const content = JSON.stringify(payload);

            const messageData: RtdbMessage = {
                senderId,
                type: MessageType.CALL,
                content,
                media: [],
                mentions: [],
                isForwarded: false,
                replyToId: undefined,
                isEdited: false,
                isRecalled: false,
                deletedBy: {},
                readBy: {},
                deliveredTo: {},
                reactions: {},
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            await updateConversationAfterMessage(convId, senderId, messageData, content, msgId);
            await set(newMsgRef, messageData);

            return msgId;
        } catch (error) {
            console.error('[rtdbMessageService] Lỗi sendCallMessage:', error);
            throw error;
        }
    }
};
