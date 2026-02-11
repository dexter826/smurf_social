import { useMemo } from 'react';
import { Conversation, User, UserStatus } from '../../types';
import { formatChatTime, toDate } from '../../utils/dateUtils';
import { getLastName } from '../../utils/uiUtils';

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

  const partner = useMemo(() => 
    conversation.isGroup 
      ? null 
      : conversation.participants.find(p => p.id !== currentUserId),
    [conversation, currentUserId]
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
  const isUnread = (unreadCount > 0 || conversation.markedUnread) && !isActive;

  // Lọc tin nhắn theo mốc thời gian
  const lastMessage = useMemo(() => {
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
    if (lastMessage.type === 'text') {
      return lastMessage.content.replace(/@\[([^\]]+)\]/g, '@$1');
    }
    return lastMessage.content;
  }, [lastMessage]);

  const typingText = useMemo(() => {
    const typingUserIds = (conversation.typingUsers || []).filter(id => id !== currentUserId);
    if (typingUserIds.length === 0) return null;

    const typingUsers = typingUserIds.map(uid => conversation.participants.find(p => p.id === uid)).filter(Boolean);

    if (typingUsers.length === 1) return `${getLastName(typingUsers[0]?.name) || 'Ai đó'} đang soạn tin...`;
    if (typingUsers.length === 2) return `${getLastName(typingUsers[0]?.name)} và ${getLastName(typingUsers[1]?.name)} đang soạn tin...`;
    return `${getLastName(typingUsers[0]?.name)} và ${typingUsers.length - 1} người khác đang soạn tin...`;
  }, [conversation.typingUsers, conversation.participants, currentUserId]);

  const readers = useMemo(() => 
    (lastMessage?.readBy || [])
      .filter(uid => uid !== currentUserId)
      .map(uid => conversation.participants.find(p => p.id === uid))
      .filter((u): u is User => !!u),
    [lastMessage, conversation.participants, currentUserId]
  );

  const displayTime = useMemo(() => {
    const time = (!lastMessage && conversation.isGroup && conversation.memberJoinedAt?.[currentUserId]) 
      ? conversation.memberJoinedAt[currentUserId] 
      : conversation.updatedAt;
    return time ? formatChatTime(time) : '';
  }, [lastMessage, conversation, currentUserId]);

  return {
    partner,
    isDataMissing,
    chatInfo,
    isMessageRequest,
    isUnread,
    unreadCount,
    lastMessage,
    lastMessagePreview,
    isLastMessageMine: lastMessage?.senderId === currentUserId,
    typingText,
    readers,
    isLastMessageRead: readers.length > 0,
    isLastMessageDelivered: !!lastMessage?.deliveredAt,
    displayTime
  };
};
