import { useState, useEffect, useCallback } from 'react';
import { User, UserStatus, FriendRequest } from '../../types';
import { friendService } from '../../services/friendService';
import { toast } from '../../store/toastStore';

export enum FriendStatus {
  NOT_FRIEND = 'not_friend',
  PENDING_SENT = 'pending_sent',
  PENDING_RECEIVED = 'pending_received',
  FRIEND = 'friend'
}

interface UseProfileFriendProps {
  currentUser: User | null;
  profile: User | null;
  profileUserId: string | undefined;
  isOwnProfile: boolean;
  loadProfile: () => Promise<void>;
}

// Xử lý friend request và friend status
export const useProfileFriend = ({
  currentUser,
  profile,
  profileUserId,
  isOwnProfile,
  loadProfile
}: UseProfileFriendProps) => {
  const [friendStatus, setFriendStatus] = useState<FriendStatus>(FriendStatus.NOT_FRIEND);
  const [pendingRequestId, setPendingRequestId] = useState<string | undefined>();

  useEffect(() => {
    if (!currentUser || !profileUserId || isOwnProfile) return;

    if (currentUser.friendIds?.includes(profileUserId)) {
      setFriendStatus(FriendStatus.FRIEND);
      setPendingRequestId(undefined);
      return;
    }

    let sentRequest: FriendRequest | null = null;
    let receivedRequest: FriendRequest | null = null;

    const updateStatus = () => {
      if (sentRequest) {
        setFriendStatus(FriendStatus.PENDING_SENT);
        setPendingRequestId(sentRequest.id);
      } else if (receivedRequest) {
        setFriendStatus(FriendStatus.PENDING_RECEIVED);
        setPendingRequestId(receivedRequest.id);
      } else {
        setFriendStatus(FriendStatus.NOT_FRIEND);
        setPendingRequestId(undefined);
      }
    };

    const unsubscribeSent = friendService.subscribeToSentRequests(currentUser.id, (requests) => {
      sentRequest = requests.find(r => r.receiverId === profileUserId) || null;
      updateStatus();
    });

    const unsubscribeReceived = friendService.subscribeToReceivedRequests(currentUser.id, (requests) => {
      receivedRequest = requests.find(r => r.senderId === profileUserId) || null;
      updateStatus();
    });

    return () => {
      unsubscribeSent();
      unsubscribeReceived();
    };
  }, [currentUser, profileUserId, isOwnProfile]);

  const handleFriendAction = useCallback(async (): Promise<{ needConfirm: boolean }> => {
    if (!currentUser || !profile || isOwnProfile) return { needConfirm: false };

    if (profile.status === UserStatus.BANNED) {
      toast.error('Không thể tương tác với người dùng đã bị khóa');
      return { needConfirm: false };
    }

    try {
      if (friendStatus === FriendStatus.FRIEND) {
        return { needConfirm: true };
      }

      if (friendStatus === FriendStatus.PENDING_RECEIVED && pendingRequestId) {
        await friendService.acceptFriendRequest(pendingRequestId, currentUser.id, profile.id);
        toast.success('Đã trở thành bạn bè');
        return { needConfirm: false };
      }

      if (friendStatus === FriendStatus.PENDING_SENT && pendingRequestId) {
        await friendService.cancelFriendRequest(pendingRequestId);
        toast.success('Đã hủy lời mời kết bạn');
        return { needConfirm: false };
      }

      if (friendStatus === FriendStatus.NOT_FRIEND) {
        await friendService.sendFriendRequest(currentUser.id, profile.id);
        toast.success('Đã gửi lời mời kết bạn');
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Thao tác thất bại');
    }

    return { needConfirm: false };
  }, [currentUser, profile, isOwnProfile, friendStatus, pendingRequestId]);

  const confirmUnfriend = useCallback(async () => {
    if (!currentUser || !profile) return;
    try {
      await friendService.unfriend(currentUser.id, profile.id);
      toast.success('Đã hủy kết bạn');
      await loadProfile();
    } catch (error) {
      toast.error('Không thể hủy kết bạn');
    }
  }, [currentUser, profile, loadProfile]);

  return {
    friendStatus,
    pendingRequestId,
    handleFriendAction,
    confirmUnfriend,
  };
};
