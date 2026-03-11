import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, FriendStatus, RtdbConversation } from '../../types';
import { userService } from '../../services/userService';
import { friendService } from '../../services/friendService';
import { useUserCache } from '../../store/userCacheStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { TOAST_MESSAGES } from '../../constants';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

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
  const [isBlockedByPartner, setIsBlockedByPartner] = useState(false);

  const myBlockedUserIds = useAuthStore(state => state.blockedUserIds);

  const isBlockedByMe = useMemo(() =>
    partnerId ? myBlockedUserIds.includes(partnerId) : false,
    [partnerId, myBlockedUserIds]
  );

  // Mình bị chặn hoặc đã chặn đối phương
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

  // Subscribe realtime để biết bị partner chặn
  useEffect(() => {
    if (!partnerId || !currentUser || isGroup) {
      setIsBlockedByPartner(false);
      return;
    }

    const blockRef = doc(db, 'users', partnerId, 'blockedUsers', currentUser.id);
    const unsub = onSnapshot(blockRef, (snap) => {
      setIsBlockedByPartner(snap.exists());
    });
    return () => unsub();
  }, [partnerId, currentUser, isGroup]);

  const getBlockedMessage = useCallback((): string | undefined => {
    if (!isGroup && partnerId) {
      const currentStatus = partnerStatus || partner?.status || usersMap[partnerId]?.status;
      if (currentStatus === 'banned') return 'Không thể gửi tin nhắn - Người dùng này đã bị khóa tài khoản.';
      if (isBlockedByMe) return 'Bạn đã chặn người này. Bỏ chặn để gửi tin nhắn.';
      if (isBlockedByPartner) return 'Không thể gửi tin nhắn cho người dùng này.';
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

