import { useMemo } from 'react';
import { RtdbMessage, RtdbConversation, User } from '../../../shared/types';
import { useAuthStore } from '../../store/authStore';

interface UseMessageStatusOptions {
    /** Actual message objects from the messages store (most accurate source) */
    messages: Array<{ id: string; data: RtdbMessage }>;
    conversation: { data: RtdbConversation };
    currentUserId: string;
    usersMap: Record<string, User>;
}

export interface MessageStatusResult {
    /** Map of messageId → users who last read up to that message */
    lastReadByMap: Record<string, User[]>;
    /** Readers of the last sent message by currentUser */
    lastMessageReaders: User[];
    /** Whether the last sent message has been read by at least one other member */
    isLastMessageRead: boolean;
    /** Whether the last sent message has been delivered to at least one other member */
    isLastMessageDelivered: boolean;
}

/**
 * Single source of truth for message read/delivered status.
 * Used by both ConversationItem (LastMessagePreview) and ChatBox to ensure consistency.
 */
export function useMessageStatus({
    messages,
    conversation,
    currentUserId,
    usersMap,
}: UseMessageStatusOptions): MessageStatusResult {
    const { settings } = useAuthStore();

    const activeMembers = useMemo(
        () => new Set(Object.keys(conversation.data.members)),
        [conversation.data.members]
    );

    const lastReadByMap = useMemo(() => {
        const map: Record<string, User[]> = {};

        if (settings?.showReadReceipts === false) return map;
        if (messages.length === 0) return map;

        const reversed = [...messages].reverse();
        const memberIds = [...activeMembers].filter(uid => uid !== currentUserId);

        if (conversation.data.isGroup) {
            memberIds.forEach(uid => {
                const user = usersMap[uid];
                const lastReadMsg = reversed.find(m => m.data.readBy?.[uid]);
                if (lastReadMsg && user) {
                    if (!map[lastReadMsg.id]) map[lastReadMsg.id] = [];
                    map[lastReadMsg.id].push(user);
                }
            });

            // Sort readers within each message by read timestamp
            Object.keys(map).forEach(msgId => {
                const msg = messages.find(m => m.id === msgId);
                if (msg?.data.readBy) {
                    const readByEntries = Object.entries(msg.data.readBy);
                    map[msgId].sort((a, b) => {
                        const aTime = readByEntries.find(([uid]) => uid === a.id)?.[1] || 0;
                        const bTime = readByEntries.find(([uid]) => uid === b.id)?.[1] || 0;
                        return aTime - bTime;
                    });
                }
            });
        } else {
            const partnerId = memberIds[0];
            const partner = partnerId ? usersMap[partnerId] : null;
            if (partnerId && partner) {
                const lastReadMsg = reversed.find(m => m.data.readBy?.[partnerId]);
                if (lastReadMsg) {
                    map[lastReadMsg.id] = [partner];
                }
            }
        }

        return map;
    }, [messages, conversation.data.isGroup, activeMembers, currentUserId, usersMap, settings?.showReadReceipts]);

    // Find the last message sent by currentUser to determine its status
    const lastSentMessage = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg.data.senderId === currentUserId && !msg.data.isRecalled) {
                return msg;
            }
        }
        return null;
    }, [messages, currentUserId]);

    const lastMessageReaders = useMemo(() => {
        if (!lastSentMessage) return [];
        return lastReadByMap[lastSentMessage.id] || [];
    }, [lastSentMessage, lastReadByMap]);

    const isLastMessageRead = lastMessageReaders.length > 0;

    const isLastMessageDelivered = useMemo(() => {
        if (!lastSentMessage) return false;
        const deliveredTo = lastSentMessage.data.deliveredTo || {};
        return Object.keys(deliveredTo).some(uid => uid !== currentUserId && activeMembers.has(uid));
    }, [lastSentMessage, currentUserId, activeMembers]);

    return {
        lastReadByMap,
        lastMessageReaders,
        isLastMessageRead,
        isLastMessageDelivered,
    };
}
