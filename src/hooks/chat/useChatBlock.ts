import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserStatus, FriendStatus } from '../../types';
import { userService } from '../../services/userService';
import { friendService } from '../../services/friendService';
import { useUserCache } from '../../store/userCacheStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { TOAST_MESSAGES } from '../../constants';

const EMPTY_IDS: string[] = [];

interface UseChatBlockProps {
  partnerId: string | null;
  currentUser: User | null;
  partner: User | null;
  isGroup: boolean;
  usersMap: Record<string, User>;
  friendStatus?: FriendStatus;
  pendingRequestId?: string;
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
}: UseChatBlockProps) => {
  const [partnerStatus, setPartnerStatus] = useState<UserStatus | undefined>();

  const myBlockedUserIds = useAuthStore(state => state.user?.blockedUserIds ?? EMPTY_IDS);

  const isBlockedByMe = useMemo(() =>
    partnerId ? myBlockedUserIds.includes(partnerId) : false,
    [partnerId, myBlockedUserIds]
  );

  const isBlockedByPartner = useMemo(() =>
    partner?.blockedUserIds?.includes(currentUser?.id || '') ?? false,
    [partner?.blockedUserIds, currentUser?.id]
  );

  const isBlocked = isBlockedByMe || isBlockedByPartner;

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

      if (currentStatus === UserStatus.BANNED) {
        return 'Không thể gửi tin nhắn - Người dùng này đã bị khóa tài khoản.';
      }
      if (isBlockedByMe) return 'Bạn đã chặn người này. Bỏ chặn để gửi tin nhắn.';
      if (isBlockedByPartner) return 'Bạn không thể gửi tin nhắn cho người này.';
    }
    return undefined;
  }, [isGroup, partnerId, partnerStatus, partner, usersMap, isBlockedByMe, isBlockedByPartner]);

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
    isBlockedByPartner,
    partnerStatus,
    getBlockedMessage,
    handleToggleBlock,
    blockedMessage,
  };
};
