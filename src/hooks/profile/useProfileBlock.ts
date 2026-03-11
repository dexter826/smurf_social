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
  const blockedUserIds = useAuthStore(state => state.blockedUserIds);

  const isBlockedByMe = useMemo(() =>
    blockedUserIds.includes(profileUserId || ''),
    [blockedUserIds, profileUserId]
  );

  const canViewContent = !isBlockedByMe;

  // Thực hiện chặn người dùng
  const handleBlockUser = useCallback(async () => {
    if (!currentUser || !profile || isOwnProfile) return;
    try {
      // Logic hủy kết bạn và xóa request đã được xử lý tự động trong Cloud Function
      await userService.blockUser(currentUser.id, profile.id);

      useAuthStore.getState().updateBlockList('add', profile.id);
      toast.success(TOAST_MESSAGES.BLOCK.BLOCK_SUCCESS);
    } catch (error) {
      toast.error(TOAST_MESSAGES.BLOCK.BLOCK_FAILED);
    }
  }, [currentUser, profile, isOwnProfile]);

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
