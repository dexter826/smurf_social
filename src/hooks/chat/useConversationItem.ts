import { useMemo } from 'react';
import { RtdbConversation, User, RtdbUserChat } from '../../../shared/types';
import { formatChatTime } from '../../utils/dateUtils';
import { useUserCache } from '../../store/userCacheStore';
import { useConversationParticipants } from './useConversationParticipants';

interface UseConversationItemProps {
  conversation: { id: string; data: RtdbConversation; userChat: RtdbUserChat };
  currentUserId: string;
  isActive: boolean;
  currentUserFriendIds: string[];
}

// Logic dữ liệu cho từng hội thoại (RTDB version)
export const useConversationItem = ({
  conversation,
  currentUserId,
  isActive,
  currentUserFriendIds
}: UseConversationItemProps) => {

  const { users: usersMap } = useUserCache();
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

    let content = lastMessage.content;

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
          return isMine ? (isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại') : (isVideo ? 'Cuộc gọi video nhỡ' : 'Cuộc gọi thoại nhỡ');
        }
        if (status === 'rejected' || status === 'busy') {
            return isMine ? (isVideo ? 'Cuộc gọi video bị từ chối' : 'Cuộc gọi thoại bị từ chối') : (isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại');
        }

        if (status === 'ended') {
            const timeStr = parsed.duration ? ` (${Math.floor(parsed.duration / 60)}:${(parsed.duration % 60).toString().padStart(2, '0')})` : '';
            return isMine 
                ? (isVideo ? `Cuộc gọi video đi${timeStr}` : `Cuộc gọi thoại đi${timeStr}`)
                : (isVideo ? `Cuộc gọi video đến${timeStr}` : `Cuộc gọi thoại đến${timeStr}`);
        }

        return isMine 
            ? (isVideo ? 'Cuộc gọi video đi' : 'Cuộc gọi thoại đi')
            : (isVideo ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến');
      } catch (e) {
        if (content.includes('nhỡ')) return content.includes('video') ? 'Cuộc gọi video nhỡ' : 'Cuộc gọi thoại nhỡ';
        if (content.includes('kết thúc')) {
            return isMine ? (content.includes('video') ? 'Cuộc gọi video đi' : 'Cuộc gọi thoại đi') : (content.includes('video') ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến');
        }
        if (content.includes('diễn ra')) return content.includes('video') ? 'Cuộc gọi video đang diễn ra' : 'Cuộc gọi thoại đang diễn ra';
        
        return content.replace(/[\[\]]/g, '');
      }
    }

    return content;
  }, [lastMessage]);

  const readers = useMemo(() => {
    if (!lastMessage || isMessageRequest) return [];
    const readBy = lastMessage.readBy || {};
    return Object.keys(readBy)
      .filter(uid => uid !== currentUserId)
      .map(uid => participants.find(p => p.id === uid) ?? usersMap[uid])
      .filter((u): u is User => !!u);
  }, [lastMessage, participants, usersMap, currentUserId, isMessageRequest]);

  const deliveredUsers = useMemo(() => {
    if (!lastMessage) return [];
    const deliveredTo = lastMessage.deliveredTo || {};
    return Object.keys(deliveredTo).filter(uid => uid !== currentUserId);
  }, [lastMessage, currentUserId]);

  const displayTime = useMemo(() => {
    const time = conversation.data.updatedAt;
    return time ? formatChatTime(new Date(time)) : '';
  }, [conversation.data.updatedAt]);

  return useMemo(() => ({
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
    readers,
    isLastMessageRead: readers.length > 0,
    isLastMessageDelivered: deliveredUsers.length > 0,
    displayTime
  }), [
    partner,
    participants,
    isDataMissing,
    chatInfo,
    isMessageRequest,
    isUnread,
    unreadCount,
    lastMessage,
    lastMessagePreview,
    currentUserId,
    readers,
    deliveredUsers,
    displayTime
  ]);
};
