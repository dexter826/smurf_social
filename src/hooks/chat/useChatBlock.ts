import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, RtdbConversation, BlockOptions, UserStatus, UserSettings } from '../../../shared/types';
import { userService } from '../../services/userService';
import { useUserCache } from '../../store/userCacheStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { TOAST_MESSAGES } from '../../constants';
import { usePostStore } from '../../store';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface UseChatBlockProps {
  partnerId: string | null;
  currentUser: User | null;
  partner: User | null;
  isGroup: boolean;
  usersMap: Record<string, User>;
  conversation?: RtdbConversation;
  isFriend?: boolean;
}

export const useChatBlock = ({
  partnerId,
  currentUser,
  partner,
  isGroup,
  usersMap,
  isFriend = true,
}: UseChatBlockProps) => {
  const [partnerStatus, setPartnerStatus] = useState<UserStatus | undefined>();
  const [isMessageBlockedByPartner, setIsMessageBlockedByPartner] = useState(false);
  const [isCallBlockedByPartner, setIsCallBlockedByPartner] = useState(false);
  const [isPartnerBlockingStrangers, setIsPartnerBlockingStrangers] = useState(false);
  const { settings, blockedUsers: myBlockedUsers } = useAuthStore();

  const myBlockOptions = useMemo(() =>
    partnerId ? myBlockedUsers[partnerId] : undefined,
    [partnerId, myBlockedUsers]
  );

  const isBlockedByMe = !!myBlockOptions;
  const isMessageBlockedByMe = !!myBlockOptions?.blockMessages;
  const isCallBlockedByMe = !!myBlockOptions?.blockCalls;

  const isBlocked = isMessageBlockedByMe || isMessageBlockedByPartner || partnerStatus === UserStatus.BANNED;
  const shouldShowBlockBanner = isBlockedByMe;

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

  useEffect(() => {
    if (!partnerId || !currentUser || isGroup) {
      setIsMessageBlockedByPartner(false);
      setIsCallBlockedByPartner(false);
      return;
    }

    const blockRef = doc(db, 'users', partnerId, 'blockedUsers', currentUser.id);
    const unsub = onSnapshot(blockRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsMessageBlockedByPartner(data.blockMessages === true);
        setIsCallBlockedByPartner(data.blockCalls === true);
      } else {
        setIsMessageBlockedByPartner(false);
        setIsCallBlockedByPartner(false);
      }
    });
    return () => unsub();
  }, [partnerId, currentUser, isGroup]);

  useEffect(() => {
    if (!partnerId || isGroup || isFriend || !currentUser) {
      setIsPartnerBlockingStrangers(false);
      return;
    }

    const settingsRef = doc(db, 'users', partnerId, 'private', 'settings');
    const unsub = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserSettings;
        setIsPartnerBlockingStrangers(data.allowMessagesFromStrangers === false);
      } else {
        setIsPartnerBlockingStrangers(false);
      }
    }, () => {
      setIsPartnerBlockingStrangers(false);
    });

    return () => unsub();
  }, [partnerId, isGroup, isFriend, currentUser]);

  const { blockedMessage, isStrangerBlocking } = useMemo(() => {
    if (!isGroup && partnerId) {
      const currentStatus = partnerStatus || partner?.status || usersMap[partnerId]?.status;
      if (currentStatus === UserStatus.BANNED) return { blockedMessage: 'Không thể gửi tin nhắn - Người dùng này đã bị khóa tài khoản.', isStrangerBlocking: false };
      if (isMessageBlockedByMe) return { blockedMessage: 'Bạn đã chặn liên lạc với người này. Bỏ chặn để gửi tin nhắn.', isStrangerBlocking: false };
      if (isMessageBlockedByPartner) return { blockedMessage: 'Không thể gửi tin nhắn cho người dùng này.', isStrangerBlocking: false };
      
      if (!isFriend) {
        if (isPartnerBlockingStrangers) {
          return {
            blockedMessage: 'Người dùng này không nhận tin nhắn từ người lạ.',
            isStrangerBlocking: false
          };
        }
        if (settings && !settings.allowMessagesFromStrangers) {
          return {
            blockedMessage: 'Bạn đang tắt nhận tin nhắn từ người lạ. Hãy bật lại để nhắn tin.',
            isStrangerBlocking: true
          };
        }
      }
    }
    return { blockedMessage: undefined, isStrangerBlocking: false };
  }, [isGroup, partnerId, partnerStatus, partner, usersMap, isMessageBlockedByMe, isMessageBlockedByPartner, isFriend, settings, isPartnerBlockingStrangers]);

  const handleUnblock = useCallback(async (targetIdOverride?: string) => {
    const finalTargetId = targetIdOverride || partnerId;
    if (!finalTargetId || !currentUser) return;
    try {
      await useAuthStore.getState().updateBlockEntry('remove', finalTargetId);
      usePostStore.getState().refreshFeed(currentUser.id);
      toast.success(TOAST_MESSAGES.BLOCK.UNBLOCK_SUCCESS);
    } catch {
      toast.error(TOAST_MESSAGES.BLOCK.UNBLOCK_FAILED);
    }
  }, [partnerId, currentUser]);

  const handleApplyBlock = useCallback(async (options: BlockOptions, targetIdOverride?: string) => {
    const finalTargetId = targetIdOverride || partnerId;
    if (!finalTargetId || !currentUser) return;

    const hasAnyOption = options.blockMessages || options.blockCalls
      || options.blockViewMyActivity || options.hideTheirActivity;

    if (!hasAnyOption) {
      return handleUnblock(finalTargetId);
    }

    try {
      await useAuthStore.getState().updateBlockEntry('add', finalTargetId, options);

      if (options.hideTheirActivity) {
        usePostStore.getState().filterPostsByAuthor(finalTargetId);
      }

      toast.success(TOAST_MESSAGES.BLOCK.BLOCK_SUCCESS);
    } catch {
      toast.error(TOAST_MESSAGES.BLOCK.BLOCK_FAILED);
    }
  }, [partnerId, currentUser, handleUnblock]);

  return {
    isBlocked,
    isBlockedByMe,
    isMessageBlockedByMe,
    isCallBlockedByMe,
    isBlockedByPartner: isMessageBlockedByPartner,
    isCallBlockedByPartner,
    myBlockOptions,
    partnerStatus,
    handleApplyBlock,
    handleUnblock,
    blockedMessage,
    shouldShowBlockBanner,
    isStrangerBlocking,
  };
};
