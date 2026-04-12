import { useEffect, useMemo, useState } from 'react';
import { useRtdbChatStore } from '../../store';
import { useUserCache } from '../../store/userCacheStore';
import { useAuthStore } from '../../store/authStore';
import { friendService } from '../../services/friendService';
import { RtdbConversation, RtdbUserChat, User, UserStatus } from '../../../shared/types';
import { getDirectConversationId } from '../../utils/chatUtils';
import { PAGINATION } from '../../constants';

export type ShareableEntry =
  | { type: 'conversation'; id: string; item: { id: string; data: RtdbConversation; userChat: RtdbUserChat } }
  | { type: 'friend'; id: string; item: User };

/**
 * Hook quản lý danh sách và tìm kiếm đối tượng chia sẻ (Hội thoại + Bạn bè)
 */
export const useShareTargets = (currentUserId: string, searchTerm: string, isOpen: boolean) => {
  const conversations = useRtdbChatStore(state => state.conversations);
  const { users: usersMap, fetchUsers } = useUserCache();
  const blockedUsers = useAuthStore(state => state.blockedUsers);
  const [allFriends, setAllFriends] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load cache thông tin thành viên trong hội thoại
  useEffect(() => {
    if (!isOpen) return;

    const userIds = Array.from(new Set(
      conversations.flatMap(conv => Object.keys(conv.data.members || {}))
    )).filter(id => id !== currentUserId);

    if (userIds.length > 0) {
      fetchUsers(userIds);
    }
  }, [isOpen, conversations, fetchUsers, currentUserId]);

  // Load toàn bộ danh sách bạn bè
  useEffect(() => {
    if (!isOpen) return;

    const loadFriends = async () => {
      try {
        setIsLoading(true);
        const friends = await friendService.getAllFriends(currentUserId);
        setAllFriends(friends);
      } catch (error) {
        console.error('Lỗi load friends trong useShareTargets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFriends();
  }, [isOpen, currentUserId]);

  // Tổng hợp danh sách có thể chia sẻ
  const shareableItems = useMemo(() => {
    // 1. Lọc các hội thoại hợp lệ
    const validConvs = conversations.filter(conv => {
      if (conv.data.isDisbanded) return false;
      if (!conv.data.isGroup) {
        const partnerId = Object.keys(conv.data.members).find(id => id !== currentUserId);
        if (!partnerId) return false;
        
        // Loại bỏ nếu người kia bị mình chặn hoặc ngược lại
        const isBlockedByMe = blockedUsers[partnerId]?.isFullyBlocked || blockedUsers[partnerId]?.isMessageBlocked;
        if (isBlockedByMe) return false;
        
        const partner = usersMap[partnerId];
        if (partner?.status === UserStatus.BANNED) return false;
      }
      return true;
    });

    const convEntries: ShareableEntry[] = validConvs.map(conv => ({
      type: 'conversation',
      id: conv.id,
      item: conv
    }));

    // 2. Lấy danh sách bạn bè chưa có hội thoại
    const existingChatPartnerIds = new Set(
      validConvs
        .filter(c => !c.data.isGroup)
        .map(c => Object.keys(c.data.members).find(id => id !== currentUserId))
        .filter(Boolean)
    );

    const friendEntries: ShareableEntry[] = allFriends
      .filter(friend => friend.id !== currentUserId)
      .filter(friend => !existingChatPartnerIds.has(friend.id))
      .filter(friend => {
        const blocked = blockedUsers[friend.id];
        return !blocked?.isFullyBlocked && !blocked?.isMessageBlocked && friend.status !== UserStatus.BANNED;
      })
      .map(friend => ({
        type: 'friend',
        id: getDirectConversationId(currentUserId, friend.id),
        item: friend
      }));

    return [...convEntries, ...friendEntries];
  }, [conversations, allFriends, currentUserId, blockedUsers, usersMap]);

  // Filter theo search term
  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    
    let results = shareableItems;
    if (normalizedSearch) {
      results = shareableItems.filter(entry => {
        if (entry.type === 'conversation') {
          const conversation = entry.item.data;
          if (conversation.isGroup) {
            return (conversation.name || '').toLowerCase().includes(normalizedSearch);
          }
          const partnerId = Object.keys(conversation.members).find(id => id !== currentUserId) || '';
          const partnerName = usersMap[partnerId]?.fullName || '';
          return partnerName.toLowerCase().includes(normalizedSearch);
        } else {
          const friend = entry.item;
          return (friend.fullName || '').toLowerCase().includes(normalizedSearch) ||
                 (friend.email || '').toLowerCase().includes(normalizedSearch);
        }
      });
    }

    const limit = normalizedSearch ? PAGINATION.SHARE_SEARCH_LIMIT : PAGINATION.SHARE_MODAL_LIMIT;
    return results.slice(0, limit);
  }, [searchTerm, shareableItems, currentUserId, usersMap]);

  return { filteredItems, isLoading, usersMap };
};
