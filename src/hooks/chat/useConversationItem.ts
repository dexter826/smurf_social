import { useMemo, useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../firebase/config';
import { RtdbConversation, RtdbUserChat, UserStatus, MessageType } from '../../../shared/types';
import { formatChatTime } from '../../utils/dateUtils';
import { useUserCache } from '../../store/userCacheStore';
import { useRtdbChatStore } from '../../store';
import { useConversationParticipants } from './useConversationParticipants';
import { useMessageStatus } from './useMessageStatus';
import { userService } from '../../services/userService';
import { getMessageDisplayContent } from '../../utils/chatUtils';

interface UseConversationItemProps {
  conversation: { id: string; data: RtdbConversation; userChat: RtdbUserChat };
  currentUserId: string;
  isActive: boolean;
  currentUserFriendIds: string[];
}

export const useConversationItem = ({
  conversation,
  currentUserId,
  isActive,
  currentUserFriendIds
}: UseConversationItemProps) => {
  const { users: usersMap } = useUserCache();
  const storeMessages = useRtdbChatStore(state => state.messages[conversation.id] ?? []);

  const participantIds = Object.keys(conversation.data.members);
  const participants = useConversationParticipants(participantIds);

  const partnerId = useMemo(() =>
    conversation.data.isGroup
      ? null
      : participantIds.find(id => id !== currentUserId),
    [conversation.data.isGroup, participantIds, currentUserId]
  );

  const partner = useMemo(() =>
    partnerId ? (usersMap[partnerId] || participants.find(p => p.id === partnerId)) : null,
    [partnerId, usersMap, participants]
  );

  const isDataMissing = !conversation.data.isGroup && (!partner || !partner.fullName);

  useEffect(() => {
    if (conversation.data.isGroup || !partnerId) return;
    const unsub = userService.subscribeToUser(partnerId, (u) => {
      useUserCache.getState().setUser(u);
    });
    return () => unsub();
  }, [partnerId, conversation.data.isGroup]);

  const chatInfo = useMemo(() => ({
    name: conversation.data.isGroup ? conversation.data.name || 'Nhóm chưa đặt tên' : partner?.fullName || '',
    avatar: conversation.data.isGroup ? conversation.data.avatar : partner?.avatar,
    status: partner?.status
  }), [conversation.data, partner]);

  const isMessageRequest = useMemo(() =>
    !conversation.data.isGroup && partner && !currentUserFriendIds.includes(partner.id),
    [conversation.data.isGroup, partner, currentUserFriendIds]
  );

  const unreadCount = conversation.userChat?.unreadCount || 0;
  const isUnread = unreadCount > 0 && !isActive;

  const [isLastMessageDeleted, setIsLastMessageDeleted] = useState(false);

  useEffect(() => {
    const msgId = conversation.data.lastMessage?.messageId;
    if (!msgId) {
      setIsLastMessageDeleted(false);
      return;
    }

    const deletedRef = ref(rtdb, `messages/${conversation.id}/${msgId}/deletedBy/${currentUserId}`);
    return onValue(deletedRef, (snapshot) => {
      setIsLastMessageDeleted(snapshot.exists());
    });
  }, [conversation.id, conversation.data.lastMessage?.messageId, currentUserId]);

  const effectiveLastMessage = useMemo(() => {
    if (storeMessages.length > 0) {
      const lastMsg = storeMessages[storeMessages.length - 1];
      
      if (lastMsg.id === conversation.data.lastMessage?.messageId && isLastMessageDeleted) {
        return storeMessages.length > 1 ? {
          messageId: storeMessages[storeMessages.length - 2].id,
          senderId: storeMessages[storeMessages.length - 2].data.senderId,
          content: storeMessages[storeMessages.length - 2].data.content,
          type: storeMessages[storeMessages.length - 2].data.type,
          timestamp: storeMessages[storeMessages.length - 2].data.createdAt,
          readBy: storeMessages[storeMessages.length - 2].data.readBy,
          deliveredTo: storeMessages[storeMessages.length - 2].data.deliveredTo
        } : null;
      }

      return {
        messageId: lastMsg.id,
        senderId: lastMsg.data.senderId,
        content: lastMsg.data.content,
        type: lastMsg.data.type,
        timestamp: lastMsg.data.createdAt,
        readBy: lastMsg.data.readBy,
        deliveredTo: lastMsg.data.deliveredTo
      };
    }

    if (isLastMessageDeleted) {
      return null;
    }

    return conversation.data.lastMessage;
  }, [storeMessages, conversation.data.lastMessage, isLastMessageDeleted]);

  const lastMessage = effectiveLastMessage;

  const lastMessagePreview = useMemo(() => {
    const clearedAt = conversation.userChat?.clearedAt || 0;
    if (!lastMessage || (lastMessage.timestamp && lastMessage.timestamp <= clearedAt)) {
      return 'Chưa có tin nhắn';
    }

    const content = lastMessage.content;

    if (lastMessage.type === MessageType.CALL) {
      const isMine = lastMessage.senderId === currentUserId;
      const isGroup = conversation.data.isGroup;
      try {
        const parsed = JSON.parse(content);
        const status = parsed.status;

        if (isGroup) {
          if (status === 'started') return 'Cuộc gọi nhóm đang diễn ra';
          if (status === 'ended') {
            const timeStr = parsed.duration
              ? ` • ${Math.floor(parsed.duration / 60)}:${(parsed.duration % 60).toString().padStart(2, '0')}`
              : '';
            return `Cuộc gọi nhóm${timeStr}`;
          }
          return 'Cuộc gọi nhóm đã kết thúc';
        }

        // 1-1
        if (status === 'missed') {
          return 'Cuộc gọi nhỡ';
        }
        if (status === 'rejected') {
          return isMine ? 'Cuộc gọi bị từ chối' : 'Cuộc gọi';
        }
        if (status === 'ended') {
          const timeStr = parsed.duration
            ? ` (${Math.floor(parsed.duration / 60)}:${(parsed.duration % 60).toString().padStart(2, '0')})`
            : '';
          return isMine ? `Cuộc gọi đi${timeStr}` : `Cuộc gọi đến${timeStr}`;
        }
        return 'Cuộc gọi';
      } catch {
        return 'Cuộc gọi';
      }
    }

    return getMessageDisplayContent({ 
        type: lastMessage.type, 
        content: lastMessage.content,
        media: [],
        isRecalled: false
    } as any);
  }, [lastMessage, currentUserId, conversation.userChat?.clearedAt, conversation.data.isGroup]);

  const isFriend = useMemo(() =>
    !conversation.data.isGroup && partner
      ? currentUserFriendIds.includes(partner.id)
      : true,
    [conversation.data.isGroup, partner, currentUserFriendIds]
  );

  const messagesForStatus = useMemo(() => {
    if (storeMessages.length > 0) return storeMessages;

    if (!lastMessage?.messageId || !lastMessage.senderId) return [];
    return [{
      id: lastMessage.messageId,
      data: {
        senderId: lastMessage.senderId,
        type: lastMessage.type,
        content: lastMessage.content,
        readBy: lastMessage.readBy ?? {},
        deliveredTo: lastMessage.deliveredTo ?? {},
        isRecalled: false,
        createdAt: lastMessage.timestamp ?? 0,
        updatedAt: lastMessage.timestamp ?? 0,
        media: [],
        mentions: [],
        isForwarded: false,
        replyToId: null,
        isEdited: false,
        deletedBy: {},
        reactions: {},
      } as any,
    }];
  }, [storeMessages, lastMessage]);

  const { lastMessageReaders, isLastMessageRead, isLastMessageDelivered } = useMessageStatus({
    messages: messagesForStatus,
    conversation,
    currentUserId,
    usersMap,
    partnerStatus: partner?.status as UserStatus | undefined,
    isFriend,
  });

  const displayTime = useMemo(() => {
    const time = conversation.data.updatedAt;
    return time ? formatChatTime(new Date(time)) : '';
  }, [conversation.data.updatedAt]);

  return {
    partner,
    participants,
    isDataMissing,
    chatInfo,
    isMessageRequest,
    isUnread,
    unreadCount,
    lastMessage,
    lastMessagePreview,
    isLastMessageMine: lastMessage?.senderId === currentUserId,
    readers: lastMessageReaders,
    isLastMessageRead,
    isLastMessageDelivered,
    displayTime,
  };
};
