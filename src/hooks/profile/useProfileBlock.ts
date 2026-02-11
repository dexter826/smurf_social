import { useCallback, useMemo } from 'react';
import { User } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService';
import { friendService } from '../../services/friendService';
import { toast } from '../../store/toastStore';
import { FriendStatus } from '../../types';
import { TOAST_MESSAGES } from '../../constants';

interface UseProfileBlockProps {
  currentUser: User | null;
  profile: User | null;
  profileUserId: string | undefined;
  isOwnProfile: boolean;
  friendStatus: FriendStatus;
  pendingRequestId?: string;
}

// Xử lý block/unblock user
export const useProfileBlock = ({
  currentUser,
  profile,
  profileUserId,
  isOwnProfile,
  friendStatus,
  pendingRequestId
}: UseProfileBlockProps) => {
  const blockedUserIds = useAuthStore(state => state.user?.blockedUserIds || []);
  
  const isBlockedByMe = useMemo(() => 
    blockedUserIds.includes(profileUserId || ''),
    [blockedUserIds, profileUserId]
  );

  const isBlockedByThem = useMemo(() => 
    profile?.blockedUserIds?.includes(currentUser?.id || '') || false,
    [profile?.blockedUserIds, currentUser?.id]
  );

  const canViewContent = !isBlockedByMe && !isBlockedByThem;

  const handleBlockUser = useCallback(async () => {
    if (!currentUser || !profile || isOwnProfile) return;
    try {
      if (friendStatus === FriendStatus.FRIEND) {
        await friendService.unfriend(currentUser.id, profile.id);
      }

      if (pendingRequestId) {
        await friendService.cancelFriendRequest(pendingRequestId);
      }

      await userService.blockUser(currentUser.id, profile.id);

      useAuthStore.getState().updateBlockList('add', profile.id);

      toast.success(TOAST_MESSAGES.BLOCK.BLOCK_SUCCESS);
    } catch (error) {
      toast.error(TOAST_MESSAGES.BLOCK.BLOCK_FAILED);
    }
  }, [currentUser, profile, isOwnProfile, friendStatus, pendingRequestId]);

  const handleUnblockUser = useCallback(async () => {
    if (!currentUser || !profile || isOwnProfile) return;
    try {
      await userService.unblockUser(currentUser.id, profile.id);

      useAuthStore.getState().updateBlockList('remove', profile.id);

      toast.success(TOAST_MESSAGES.BLOCK.UNBLOCK_SUCCESS);
    } catch (error) {
      toast.error(TOAST_MESSAGES.BLOCK.UNBLOCK_FAILED);
    }
  }, [currentUser, profile, isOwnProfile]);

  return {
    isBlockedByMe,
    canViewContent,
    handleBlockUser,
    handleUnblockUser,
  };
};
