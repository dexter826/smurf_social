import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, FriendStatus } from '../../shared/types';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services/userService';
import { toast } from '../store/toastStore';
import { useUserCache } from '../store/userCacheStore';
import { TOAST_MESSAGES } from '../constants';
import { useProfileData } from './profile/useProfileData';
import { useProfileFriend } from './profile/useProfileFriend';
import { useProfileMedia } from './profile/useProfileMedia';
import { useProfileBlock } from './profile/useProfileBlock';
import { getDirectConversationId } from '../utils/chatUtils';

type TabType = 'posts' | 'media';

export const useProfile = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const profileUserId = (userId === 'me' || !userId) ? currentUser?.id : userId;
  const [activeTab, setActiveTab] = useState<TabType>('posts');

  const data = useProfileData({ profileUserId, currentUser: currentUser ?? null });
  const { profile, setProfile, isOwnProfile, loadProfile } = data;

  const friend = useProfileFriend({
    currentUser: currentUser ?? null,
    profile,
    profileUserId,
    isOwnProfile,
    loadProfile,
  });
  const { friendStatus } = friend;

  const media = useProfileMedia({
    profile,
    setProfile,
    isOwnProfile,
    currentUser: currentUser ?? null,
  });

  const block = useProfileBlock({
    currentUser: currentUser ?? null,
    profile,
    profileUserId,
    isOwnProfile,
  });

  const isBannedProfile = profile?.status === 'banned';
  const canViewContent = true;

  const [showPrivacyConfirm, setShowPrivacyConfirm] = useState(false);

  const handleMessage = useCallback(async (bypassSettingsCheck: boolean = false) => {
    if (!currentUser || !profile) return;
    if (profile.status === 'banned') {
      toast.error(TOAST_MESSAGES.CHAT.BLOCKED_USER);
      return;
    }

    if (block.isMessageBlockedByPartner) {
      toast.error("Bạn không thể nhắn tin cho người dùng này do cài đặt quyền riêng tư.");
      return;
    }

    // Kiểm tra cài đặt của chính mình nếu là người lạ
    const isFriend = friendStatus === FriendStatus.FRIEND;
    if (!isFriend && !bypassSettingsCheck) {
      const { settings } = useAuthStore.getState();
      if (settings && !settings.allowMessagesFromStrangers) {
        setShowPrivacyConfirm(true);
        return;
      }
    }

    try {
      const convId = getDirectConversationId(currentUser.id, profile.id);
      navigate(`/?conv=${convId}`);
    } catch (error: any) {
      console.error('[handleMessage] Lỗi:', error);
      toast.error("Không thể khởi tạo cuộc trò chuyện.");
    }
  }, [currentUser, profile, navigate, friendStatus]);

  const confirmEnablePrivacy = useCallback(async () => {
    if (!currentUser) return;
    try {
      await userService.updateUserSettings(currentUser.id, { allowMessagesFromStrangers: true });
      useAuthStore.getState().updateSettings({ allowMessagesFromStrangers: true });
      setShowPrivacyConfirm(false);
      // Tiếp tục nhắn tin
      handleMessage(true);
    } catch (error) {
      toast.error("Không thể cập nhật cài đặt.");
    }
  }, [currentUser, handleMessage]);

  const handleSaveProfile = useCallback(async (data: Partial<User>) => {
    if (!profile) return;
    try {
      const updated = await userService.updateProfile(profile.id, data);
      setProfile(updated);
      useUserCache.getState().setUser(updated);
      if (isOwnProfile && currentUser) {
        useAuthStore.getState().updateUserProfile(data);
      }
    } catch (error) {
      console.error("Lỗi cập nhật profile", error);
      throw error;
    }
  }, [profile, isOwnProfile, currentUser, setProfile]);

  return {
    currentUser,
    profile: data.profile,
    latestMedia: data.latestMedia,
    loading: data.loading,
    profileUserId,
    isOwnProfile,
    isBannedProfile,
    canViewContent,
    activeTab,
    setActiveTab,
    loadProfile,
    handleMessage,
    handleSaveProfile,
    showPrivacyConfirm,
    setShowPrivacyConfirm,
    confirmEnablePrivacy,

    // Friend
    friendStatus: friend.friendStatus,
    pendingRequestId: friend.pendingRequestId,
    handleFriendAction: friend.handleFriendAction,
    confirmUnfriend: friend.confirmUnfriend,

    // Media
    uploadingType: media.uploadingType,
    uploadProgress: media.uploadProgress,
    handleAvatarChange: media.handleAvatarChange,
    handleCoverChange: media.handleCoverChange,
    handleAvatarDelete: media.handleAvatarDelete,
    handleCoverDelete: media.handleCoverDelete,

    // Block
    isBlockedByMe: block.isBlockedByMe,
    isBlockedByPartner: block.isBlockedByPartner,
    isMessageBlockedByPartner: block.isMessageBlockedByPartner,
    currentBlockOptions: block.currentBlockOptions,
    isBlockModalOpen: block.isBlockModalOpen,
    handleOpenBlockModal: block.handleOpenBlockModal,
    handleApplyBlock: block.handleApplyBlock,
    handleUnblockUser: block.handleUnblockUser,
    confirmUnblock: block.confirmUnblock,
    closeBlockModal: block.closeBlockModal,
  };
};
