import { useState, useEffect, useCallback } from 'react';
import { User, UserStatus, FriendRequest, FriendStatus } from '../../types';
import { friendService } from '../../services/friendService';
import { toast } from '../../store/toastStore';
import { TOAST_MESSAGES } from '../../constants';

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
      toast.error(TOAST_MESSAGES.FRIEND.BLOCKED_USER);
      return { needConfirm: false };
    }

    try {
      if (friendStatus === FriendStatus.FRIEND) {
        return { needConfirm: true };
      }

      if (friendStatus === FriendStatus.PENDING_RECEIVED && pendingRequestId) {
        await friendService.acceptFriendRequest(pendingRequestId, currentUser.id, profile.id);
        toast.success(TOAST_MESSAGES.FRIEND.ACCEPT_SUCCESS);
        return { needConfirm: false };
      }

      if (friendStatus === FriendStatus.PENDING_SENT && pendingRequestId) {
        await friendService.cancelFriendRequest(pendingRequestId);
        toast.success(TOAST_MESSAGES.FRIEND.CANCEL_SUCCESS);
        return { needConfirm: false };
      }

      if (friendStatus === FriendStatus.NOT_FRIEND) {
        await friendService.sendFriendRequest(currentUser.id, profile.id);
        toast.success(TOAST_MESSAGES.FRIEND.SEND_SUCCESS);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(TOAST_MESSAGES.FRIEND.ACTION_FAILED(err.message));
    }

    return { needConfirm: false };
  }, [currentUser, profile, isOwnProfile, friendStatus, pendingRequestId]);

  const confirmUnfriend = useCallback(async () => {
    if (!currentUser || !profile) return;
    try {
      await friendService.unfriend(currentUser.id, profile.id);
      toast.success(TOAST_MESSAGES.FRIEND.UNFRIEND_SUCCESS);
      await loadProfile();
    } catch (error) {
      toast.error(TOAST_MESSAGES.FRIEND.UNFRIEND_FAILED);
    }
  }, [currentUser, profile, loadProfile]);

  return {
    friendStatus,
    pendingRequestId,
    handleFriendAction,
    confirmUnfriend,
  };
};
