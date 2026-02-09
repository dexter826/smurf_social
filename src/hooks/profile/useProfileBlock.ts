import { useCallback, useMemo } from 'react';
import { User } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService';
import { friendService } from '../../services/friendService';
import { toast } from '../../store/toastStore';
import { FriendStatus } from './useProfileFriend';

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
  const isBlockedByMe = useMemo(() => 
    currentUser?.blockedUserIds?.includes(profileUserId || '') || false,
    [currentUser?.blockedUserIds, profileUserId]
  );

  const canViewContent = !isBlockedByMe;

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

      toast.success('Đã chặn người dùng');
    } catch (error) {
      toast.error('Không thể chặn người dùng');
    }
  }, [currentUser, profile, isOwnProfile, friendStatus, pendingRequestId]);

  const handleUnblockUser = useCallback(async () => {
    if (!currentUser || !profile || isOwnProfile) return;
    try {
      await userService.unblockUser(currentUser.id, profile.id);

      useAuthStore.getState().updateBlockList('remove', profile.id);

      toast.success('Đã bỏ chặn người dùng');
    } catch (error) {
      toast.error('Không thể bỏ chặn người dùng');
    }
  }, [currentUser, profile, isOwnProfile]);

  return {
    isBlockedByMe,
    canViewContent,
    handleBlockUser,
    handleUnblockUser,
  };
};
