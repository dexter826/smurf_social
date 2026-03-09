import { useMemo } from 'react';
import { Conversation, LastMessagePreview, User, UserStatus } from '../../types';
import { formatChatTime, toDate } from '../../utils/dateUtils';
import { getLastName } from '../../utils/uiUtils';
import { useUserCache } from '../../store/userCacheStore';
import { useConversationParticipants } from './useConversationParticipants';

interface UseConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  isActive: boolean;
  currentUserFriendIds: string[];
}

// Logic dữ liệu cho từng hội thoại
export const useConversationItem = ({
  conversation,
  currentUserId,
  isActive,
  currentUserFriendIds
}: UseConversationItemProps) => {

  const { users: usersMap } = useUserCache();
  const participants = useConversationParticipants(conversation.participantIds);

  const partnerId = useMemo(() =>
    conversation.isGroup
      ? null
      : conversation.participantIds.find(id => id !== currentUserId),
    [conversation, currentUserId]
  );

  const partner = useMemo(() =>
    partnerId ? (usersMap[partnerId] || participants.find(p => p.id === partnerId)) : null,
    [partnerId, usersMap, participants]
  );

  const isDataMissing = !conversation.isGroup && (!partner || !partner.name);

  const chatInfo = useMemo(() => ({
    name: conversation.isGroup ? conversation.groupName || 'Nhóm chưa đặt tên' : partner?.name || '',
    avatar: conversation.isGroup ? conversation.groupAvatar : partner?.avatar,
    status: partner?.status
  }), [conversation, partner]);

  const isMessageRequest = useMemo(() =>
    !conversation.isGroup && partner && !currentUserFriendIds.includes(partner.id),
    [conversation.isGroup, partner, currentUserFriendIds]
  );

  const unreadCount = conversation.unreadCount?.[currentUserId] || 0;
  const isUnread = (unreadCount > 0 || conversation.markedUnreadBy.includes(currentUserId)) && !isActive;

  // Lọc tin nhắn theo mốc thời gian
  const lastMessage = useMemo((): LastMessagePreview | undefined => {
    const joinedAt = conversation.memberJoinedAt?.[currentUserId];
    const deletedAt = conversation.deletedAt?.[currentUserId];

    let startTime = toDate(joinedAt);
    const delDate = toDate(deletedAt);
    if (delDate && (!startTime || delDate > startTime)) {
      startTime = delDate;
    }

    if (!conversation.lastMessage) return undefined;
    const lastMsgDate = toDate(conversation.lastMessage.createdAt);
    if (startTime && lastMsgDate && lastMsgDate < startTime) return undefined;

    return conversation.lastMessage;
  }, [conversation, currentUserId]);

  const lastMessagePreview = useMemo(() => {
    if (!lastMessage) return 'Chưa có tin nhắn';

    let content = lastMessage.content;

    if (lastMessage.reactorId === currentUserId) {
      const enumEmojiRegex = /^([A-Z_]+)\s+(.+)\s+(đã bày tỏ cảm xúc)$/;
      const match = content.match(enumEmojiRegex);
      if (match) {
        const [_, type, oldName, suffix] = match;
        content = `${type} Bạn ${suffix}`;
      }
    }

    if (lastMessage.type === 'text') {
      return content.replace(/@\[([^\]]+)\]/g, '@$1');
    }
    return content;
  }, [lastMessage, currentUserId]);

  const readers = useMemo(() =>
    (lastMessage?.readBy || [])
      .filter(uid => uid !== currentUserId)
      .map(uid => participants.find(p => p.id === uid))
      .filter((u): u is User => !!u),
    [lastMessage, participants, currentUserId]
  );

  const displayTime = useMemo(() => {
    const time = (!lastMessage && conversation.isGroup && conversation.memberJoinedAt?.[currentUserId])
      ? conversation.memberJoinedAt[currentUserId]
      : conversation.updatedAt;
    return time ? formatChatTime(time) : '';
  }, [lastMessage, conversation, currentUserId]);

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
    readers,
    isLastMessageRead: readers.length > 0,
    isLastMessageDelivered: !!lastMessage?.deliveredAt,
    displayTime
  };
};
