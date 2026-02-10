import { useMemo } from 'react';
import { Conversation } from '../../types';

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
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    };

    return {
      friendConversations: friends.sort(sortFn),
      requestConversations: requests.sort(sortFn)
    };
  }, [conversations, currentUserId, currentUserFriendIds]);

  // Danh sách hiển thị dựa trên chế độ xem và bộ lọc
  const displayConversations = useMemo(() => {
    if (viewMode === 'archived') {
      return conversations.filter(c => c.archived).sort((a, b) => 
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );
    }

    let list = friendConversations;
    if (activeFilter === 'group') {
      list = list.filter(c => c.isGroup);
    }
    return list;
  }, [viewMode, friendConversations, conversations, activeFilter]);

  return {
    friendConversations,
    requestConversations,
    displayConversations
  };
};
