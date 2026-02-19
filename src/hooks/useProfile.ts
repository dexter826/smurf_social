import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, UserStatus } from '../types';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services/userService';
import { conversationService } from '../services/chat/conversationService';
import { toast } from '../store/toastStore';
import { useUserCache } from '../store/userCacheStore';
import { TOAST_MESSAGES } from '../constants';
import { useProfileData } from './profile/useProfileData';
import { useProfileFriend } from './profile/useProfileFriend';
import { useProfileMedia } from './profile/useProfileMedia';
import { useProfileBlock } from './profile/useProfileBlock';

type TabType = 'posts' | 'media';

export const useProfile = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const profileUserId = userId || currentUser?.id;
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
    friendStatus: friend.friendStatus,
    pendingRequestId: friend.pendingRequestId,
  });

  const isBannedProfile = profile?.status === UserStatus.BANNED;

  const handleMessage = useCallback(async () => {
    if (!currentUser || !profile) return;
    if (profile.status === UserStatus.BANNED) {
      toast.error(TOAST_MESSAGES.CHAT.BLOCKED_USER);
      return;
    }
    try {
      const conversationId = await conversationService.getOrCreateConversation(currentUser.id, profile.id);
      navigate(`/?conv=${conversationId}`);
    } catch {
      toast.error(TOAST_MESSAGES.CHAT.OPEN_FAILED);
    }
  }, [currentUser, profile, navigate]);

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
    stats: data.stats,
    latestMedia: data.latestMedia,
    loading: data.loading,
    profileUserId,
    isOwnProfile,
    isBannedProfile,
    activeTab,
    setActiveTab,
    loadProfile,
    handleMessage,
    handleSaveProfile,

    // Friend
    friendStatus: friend.friendStatus,
    pendingRequestId: friend.pendingRequestId,
    handleFriendAction: friend.handleFriendAction,
    confirmUnfriend: friend.confirmUnfriend,

    // Media
    uploading: media.uploading,
    uploadProgress: media.uploadProgress,
    handleAvatarChange: media.handleAvatarChange,
    handleCoverChange: media.handleCoverChange,
    handleAvatarDelete: media.handleAvatarDelete,
    handleCoverDelete: media.handleCoverDelete,

    // Block
    isBlockedByMe: block.isBlockedByMe,
    isBlockedByThem: block.isBlockedByThem,
    canViewContent: block.canViewContent,
    handleBlockUser: block.handleBlockUser,
    handleUnblockUser: block.handleUnblockUser,
  };
};
