import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, FriendStatus, RtdbConversation } from '../../types';
import { userService } from '../../services/userService';
import { friendService } from '../../services/friendService';
import { useUserCache } from '../../store/userCacheStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { TOAST_MESSAGES } from '../../constants';

interface UseChatBlockProps {
  partnerId: string | null;
  currentUser: User | null;
  partner: User | null;
  isGroup: boolean;
  usersMap: Record<string, User>;
  friendStatus?: FriendStatus;
  pendingRequestId?: string;
  conversation?: RtdbConversation;
}

// Xử lý logic block/unblock trong chat
export const useChatBlock = ({
  partnerId,
  currentUser,
  partner,
  isGroup,
  usersMap,
  friendStatus,
  pendingRequestId,
  conversation,
}: UseChatBlockProps) => {
  const [partnerStatus, setPartnerStatus] = useState<'active' | 'banned' | undefined>();

  const myBlockedUserIds = useAuthStore(state => state.blockedUserIds);

  const isBlockedByMe = useMemo(() =>
    partnerId ? myBlockedUserIds.includes(partnerId) : false,
    [partnerId, myBlockedUserIds]
  );

  const isBlocked = isBlockedByMe;

  useEffect(() => {
    if (!partnerId) {
      setPartnerStatus(undefined);
      return;
    }

    const unsub = userService.subscribeToUser(partnerId, (u) => {
      setPartnerStatus(u.status);
      useUserCache.getState().setUser(u);
    });
    return () => unsub();
  }, [partnerId]);

  const getBlockedMessage = useCallback((): string | undefined => {
    if (!isGroup && partnerId) {
      const currentStatus = partnerStatus || partner?.status || usersMap[partnerId]?.status;

      if (currentStatus === 'banned') {
        return 'Không thể gửi tin nhắn - Người dùng này đã bị khóa tài khoản.';
      }
      if (isBlockedByMe) return 'Bạn đã chặn người này. Bỏ chặn để gửi tin nhắn.';
      // RTDB doesn't have blockedBy field in conversation
    }
    return undefined;
  }, [isGroup, partnerId, partnerStatus, partner, usersMap, isBlockedByMe]);

  const blockedMessage = useMemo(() => getBlockedMessage(), [getBlockedMessage]);

  const handleToggleBlock = useCallback(async (selectConversation: (id: string | null) => void) => {
    if (!partnerId || !currentUser) return;

    try {
      if (isBlockedByMe) {
        await userService.unblockUser(currentUser.id, partnerId);
        useAuthStore.getState().updateBlockList('remove', partnerId);
        toast.success(TOAST_MESSAGES.BLOCK.UNBLOCK_SUCCESS);
      } else {
        // Dọn dẹp quan hệ bạn bè trước khi chặn
        if (friendStatus === FriendStatus.FRIEND) {
          await friendService.unfriend(currentUser.id, partnerId);
        }
        if (pendingRequestId) {
          await friendService.cancelFriendRequest(pendingRequestId);
        }

        await userService.blockUser(currentUser.id, partnerId);
        useAuthStore.getState().updateBlockList('add', partnerId);
        toast.success(TOAST_MESSAGES.BLOCK.BLOCK_SUCCESS);
        selectConversation(null);
      }
    } catch {
      toast.error(TOAST_MESSAGES.BLOCK.BLOCK_FAILED);
    }
  }, [partnerId, currentUser, isBlockedByMe, friendStatus, pendingRequestId]);

  return {
    isBlocked,
    isBlockedByMe,
    partnerStatus,
    getBlockedMessage,
    handleToggleBlock,
    blockedMessage,
  };
};
