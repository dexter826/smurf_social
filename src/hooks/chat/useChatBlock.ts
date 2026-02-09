import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserStatus } from '../../types';
import { userService } from '../../services/userService';
import { useUserCache } from '../../store/userCacheStore';

interface UseChatBlockProps {
  partnerId: string | null;
  currentUser: User | null;
  partner: User | null;
  isGroup: boolean;
  usersMap: Record<string, User>;
}

// Xử lý logic block/unblock trong chat
export const useChatBlock = ({ 
  partnerId, 
  currentUser, 
  partner,
  isGroup,
  usersMap 
}: UseChatBlockProps) => {
  const [partnerStatus, setPartnerStatus] = useState<UserStatus | undefined>();

  const isBlockedByMe = useMemo(() => 
    partnerId ? currentUser?.blockedUserIds?.includes(partnerId) ?? false : false, 
    [partnerId, currentUser?.blockedUserIds]
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

  const handleToggleBlock = useCallback(async (selectConversation: (id: string | null) => void) => {
    if (!partnerId || !currentUser) return;
    
    if (isBlockedByMe) {
      await userService.unblockUser(currentUser.id, partnerId);
    } else {
      await userService.blockUser(currentUser.id, partnerId);
      selectConversation(null);
    }
  }, [partnerId, currentUser, isBlockedByMe]);

  return {
    isBlocked,
    isBlockedByMe,
    partnerStatus,
    getBlockedMessage,
    handleToggleBlock,
    blockedMessage: getBlockedMessage(),
  };
};
