import { useMemo, useEffect } from 'react';
import { RtdbConversation, RtdbUserChat } from '../../../shared/types';
import { formatChatTime } from '../../utils/dateUtils';
import { useUserCache } from '../../store/userCacheStore';
import { useRtdbChatStore } from '../../store';
import { useConversationParticipants } from './useConversationParticipants';
import { useMessageStatus } from './useMessageStatus';
import { userService } from '../../services/userService';

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

  const lastMessage = conversation.data.lastMessage;

  const lastMessagePreview = useMemo(() => {
    const clearedAt = conversation.userChat?.clearedAt || 0;
    if (!lastMessage || (lastMessage.timestamp && lastMessage.timestamp <= clearedAt)) {
      return 'Chưa có tin nhắn';
    }

    const content = lastMessage.content;

    if (lastMessage.type === 'text') {
      return content.replace(/@\[([^\]]+)\]/g, '@$1');
    }

    if (lastMessage.type === 'call') {
      const isMine = lastMessage.senderId === currentUserId;
      try {
        const parsed = JSON.parse(content);
        const isVideo = parsed.callType === 'video';
        const status = parsed.status;

        if (status === 'started') {
          return isVideo ? 'Cuộc gọi video đang diễn ra' : 'Cuộc gọi thoại đang diễn ra';
        }
        if (status === 'missed') {
          return isMine
            ? (isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại')
            : (isVideo ? 'Cuộc gọi video nhỡ' : 'Cuộc gọi thoại nhỡ');
        }
        if (status === 'rejected') {
          return isMine
            ? (isVideo ? 'Cuộc gọi video bị từ chối' : 'Cuộc gọi thoại bị từ chối')
            : (isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại');
        }
        if (status === 'ended') {
          const timeStr = parsed.duration
            ? ` (${Math.floor(parsed.duration / 60)}:${(parsed.duration % 60).toString().padStart(2, '0')})`
            : '';
          return isMine
            ? (isVideo ? `Cuộc gọi video đi${timeStr}` : `Cuộc gọi thoại đi${timeStr}`)
            : (isVideo ? `Cuộc gọi video đến${timeStr}` : `Cuộc gọi thoại đến${timeStr}`);
        }
        return isMine
          ? (isVideo ? 'Cuộc gọi video đi' : 'Cuộc gọi thoại đi')
          : (isVideo ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến');
      } catch {
        if (content.includes('nhỡ')) return content.includes('video') ? 'Cuộc gọi video nhỡ' : 'Cuộc gọi thoại nhỡ';
        if (content.includes('kết thúc')) {
          return isMine
            ? (content.includes('video') ? 'Cuộc gọi video đi' : 'Cuộc gọi thoại đi')
            : (content.includes('video') ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến');
        }
        if (content.includes('diễn ra')) return content.includes('video') ? 'Cuộc gọi video đang diễn ra' : 'Cuộc gọi thoại đang diễn ra';
        return content.replace(/[\[\]]/g, '');
      }
    }

    return content;
  }, [lastMessage, currentUserId]);

  // Use the shared status hook — reads from actual messages store (same source as ChatBox)
  // Falls back to lastMessage snapshot when messages haven't been loaded yet
  const messagesForStatus = useMemo(() => {
    if (isMessageRequest) return [];
    if (storeMessages.length > 0) return storeMessages;

    // Fallback: synthesize a minimal message from lastMessage snapshot
    // so status is never blank before messages are loaded
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
  }, [isMessageRequest, storeMessages, lastMessage]);

  const { lastMessageReaders, isLastMessageRead, isLastMessageDelivered } = useMessageStatus({
    messages: messagesForStatus,
    conversation,
    currentUserId,
    usersMap,
    partnerStatus: partner?.status as 'active' | 'banned' | undefined,
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
