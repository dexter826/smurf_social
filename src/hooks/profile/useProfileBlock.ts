import { useCallback, useEffect, useMemo, useState } from 'react';
import { User, BlockOptions } from '../../../shared/types';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService';
import { toast } from '../../store/toastStore';
import { TOAST_MESSAGES } from '../../constants';
import { usePostStore } from '../../store';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface UseProfileBlockProps {
  currentUser: User | null;
  profile: User | null;
  profileUserId: string | undefined;
  isOwnProfile: boolean;
}

export const useProfileBlock = ({
  currentUser,
  profile,
  profileUserId,
  isOwnProfile,
}: UseProfileBlockProps) => {
  const blockedUsers = useAuthStore(state => state.blockedUsers);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isFullyBlockedByPartner, setIsFullyBlockedByPartner] = useState(false);

  const isBlockedByMe = useMemo(() =>
    !!blockedUsers[profileUserId || ''],
    [blockedUsers, profileUserId]
  );

  const currentBlockOptions = useMemo(() =>
    profileUserId ? blockedUsers[profileUserId] : undefined,
    [blockedUsers, profileUserId]
  );

  const handleOpenBlockModal = useCallback(() => {
    if (!currentUser || !profile || isOwnProfile) return;
    setIsBlockModalOpen(true);
  }, [currentUser, profile, isOwnProfile]);

  useEffect(() => {
    if (!currentUser || !profileUserId || isOwnProfile) {
      setIsFullyBlockedByPartner(false);
      return;
    }
    const blockRef = doc(db, 'users', profileUserId, 'blockedUsers', currentUser.id);
    const unsub = onSnapshot(blockRef, (snap) => {
      if (snap.exists()) {
        setIsFullyBlockedByPartner(snap.data()?.isFullyBlocked === true);
      } else {
        setIsFullyBlockedByPartner(false);
      }
    });
    return () => unsub();
  }, [currentUser, profileUserId, isOwnProfile]);

  const confirmUnblock = useCallback(async () => {
    if (!currentUser || !profile || isOwnProfile) return;
    try {
      await userService.unblockUser(currentUser.id, profile.id);
      useAuthStore.getState().updateBlockEntry('remove', profile.id);
      
      usePostStore.getState().refreshFeed(currentUser.id);
      
      toast.success(TOAST_MESSAGES.BLOCK.UNBLOCK_SUCCESS);
    } catch {
      toast.error(TOAST_MESSAGES.BLOCK.UNBLOCK_FAILED);
    }
  }, [currentUser, profile, isOwnProfile]);

  const handleUnblockUser = useCallback(async () => {
    if (!currentUser || !profile || isOwnProfile) return;
    setIsBlockModalOpen(true);
  }, [currentUser, profile, isOwnProfile]);

  const handleApplyBlock = useCallback(async (options: BlockOptions) => {
    if (!currentUser || !profile || isOwnProfile) return;

    const hasAnyOption = options.isFullyBlocked || options.isMessageBlocked;
    
    if (!hasAnyOption) {
      return handleUnblockUser();
    }

    try {
      await userService.blockUser(currentUser.id, profile.id, options);
      useAuthStore.getState().updateBlockEntry('add', profile.id, options);
      
      if (options.isFullyBlocked) {
        usePostStore.getState().filterPostsByAuthor(profile.id);
      }
      
      toast.success(TOAST_MESSAGES.BLOCK.BLOCK_SUCCESS);
    } catch {
      toast.error(TOAST_MESSAGES.BLOCK.BLOCK_FAILED);
      throw new Error('block failed');
    }
  }, [currentUser, profile, isOwnProfile, handleUnblockUser]);

  return {
    isBlockedByMe,
    isFullyBlockedByPartner,
    currentBlockOptions,
    isBlockModalOpen,
    handleOpenBlockModal,
    handleApplyBlock,
    handleUnblockUser,
    confirmUnblock,
    closeBlockModal: () => setIsBlockModalOpen(false),
  };
};
