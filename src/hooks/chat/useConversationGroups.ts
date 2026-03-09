import { useMemo } from 'react';
import { Conversation } from '../../types';
import { useChatStore } from '../../store/chatStore';

interface UseConversationGroupsProps {
  conversations: Conversation[];
  currentUserId: string;
  currentUserFriendIds: string[];
  blockedUserIds: string[];
  viewMode: 'normal' | 'archived';
  activeFilter: 'all' | 'group';
}

// Phân loại và sắp xếp hội thoại
export const useConversationGroups = ({
  conversations,
  currentUserId,
  currentUserFriendIds,
  blockedUserIds,
  viewMode,
  activeFilter
}: UseConversationGroupsProps) => {

  const memberSettings = useChatStore(state => state.memberSettings);
  const { friendConversations, requestConversations } = useMemo(() => {
    const friends: Conversation[] = [];
    const requests: Conversation[] = [];

    // Phân loại: Bạn bè/Nhóm vs Người lạ (Tin nhắn chờ)
    conversations.forEach(conv => {
      if (conv.isGroup) {
        friends.push(conv);
      } else {
        const partnerId = conv.participantIds.find(id => id !== currentUserId);
        if (partnerId && currentUserFriendIds.includes(partnerId)) {
          friends.push(conv);
        } else {
          requests.push(conv);
        }
      }
    });

    // Sắp xếp: Ghim ưu tiên, sau đó theo thời gian cập nhật
    const sortFn = (a: Conversation, b: Conversation) => {
        const isAPinned = memberSettings[a.id]?.isPinned ?? false;
        const isBPinned = memberSettings[b.id]?.isPinned ?? false;
      if (!isAPinned && isBPinned) return 1;
      return (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0);
    };

    return {
      friendConversations: friends.sort(sortFn),
      requestConversations: requests.sort(sortFn)
    };
  }, [conversations, currentUserId, currentUserFriendIds, memberSettings]);

  // Danh sách hiển thị dựa trên chế độ xem và bộ lọc
  const displayConversations = useMemo(() => {
    if (viewMode === 'archived') {
      return conversations.filter(c => memberSettings[c.id]?.isArchived).sort((a, b) =>
        (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0)
      );
    }

    let list = friendConversations;
    if (activeFilter === 'group') {
      list = list.filter(c => c.isGroup);
    }
    return list;
  }, [viewMode, friendConversations, conversations, activeFilter, memberSettings]);

  return {
    friendConversations,
    requestConversations,
    displayConversations
  };
};
