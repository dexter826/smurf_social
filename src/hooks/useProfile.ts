import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User } from '../types';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services/userService';
import { chatService } from '../services/chatService';
import { friendService } from '../services/friendService';
import { postService } from '../services/postService';
import { toast } from '../store/toastStore';
import { validateFileSize } from '../utils/fileUtils';

type TabType = 'media' | 'posts' | 'friends' | 'photos' | 'videos';

interface ProfileStats {
  friendCount: number;
  postCount: number;
}

interface UseProfileReturn {
  // Data
  currentUser: User | null;
  profile: User | null;
  stats: ProfileStats;
  latestMedia: string[];
  loading: boolean;
  uploading: boolean;
  
  // Computed
  profileUserId: string | undefined;
  isOwnProfile: boolean;
  isFriend: boolean;
  canViewContent: boolean;
  
  // UI State
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  
  // Actions
  loadProfile: () => Promise<void>;
  handleMessage: () => Promise<void>;
  handleFriendAction: () => Promise<{ needConfirm: boolean }>;
  confirmUnfriend: () => Promise<void>;
  handleSaveProfile: (data: Partial<User>) => Promise<void>;
  handleAvatarChange: (file: File) => Promise<void>;
  handleCoverChange: (file: File) => Promise<void>;
  handleAvatarDelete: () => Promise<void>;
  handleCoverDelete: () => Promise<void>;
}

export const useProfile = (): UseProfileReturn => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  
  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ friendCount: 0, postCount: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [uploading, setUploading] = useState(false);
  const [latestMedia, setLatestMedia] = useState<string[]>([]);

  const profileUserId = userId || currentUser?.id;
  const isOwnProfile = currentUser?.id === profileUserId;
  const isFriend = currentUser?.friendIds?.includes(profileUserId || '') || false;
  const canViewContent = isOwnProfile || isFriend;

  const loadProfile = useCallback(async () => {
    if (!profileUserId) return;
    
    setLoading(true);
    try {
      const [userData, userStats, userPosts] = await Promise.all([
        userService.getUserById(profileUserId),
        userService.getUserStats(profileUserId),
        postService.getUserPosts(profileUserId, 20)
      ]);
      
      setProfile(userData || null);
      setStats(userStats);

      // Trích xuất 6 media mới nhất
      const media: string[] = [];
      userPosts.posts.forEach(post => {
        if (post.images) media.push(...post.images);
        if (post.videos) media.push(...post.videos);
      });
      setLatestMedia(media.slice(0, 6));

    } catch (error) {
      console.error("Lỗi load profile", error);
    } finally {
      setLoading(false);
    }
  }, [profileUserId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleMessage = useCallback(async () => {
    if (!currentUser || !profile) return;
    try {
      const conversationId = await chatService.getOrCreateConversation(currentUser.id, profile.id);
      navigate(`/?conv=${conversationId}`);
    } catch (error) {
      toast.error('Không thể mở cuộc hội thoại');
    }
  }, [currentUser, profile, navigate]);

  const handleFriendAction = useCallback(async (): Promise<{ needConfirm: boolean }> => {
    if (!currentUser || !profile) return { needConfirm: false };
    
    if (isFriend) {
      return { needConfirm: true };
    } else {
      await friendService.sendFriendRequest(currentUser.id, profile.id);
      toast.success('Đã gửi lời mời kết bạn');
      return { needConfirm: false };
    }
  }, [currentUser, profile, isFriend]);

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

  const handleSaveProfile = useCallback(async (data: Partial<User>) => {
    if (!profile) return;
    
    try {
      const updated = await userService.updateProfile(profile.id, data);
      setProfile(updated);
      
      if (isOwnProfile && currentUser) {
        useAuthStore.setState({ user: updated });
      }
    } catch (error) {
      console.error("Lỗi cập nhật profile", error);
      throw error;
    }
  }, [profile, isOwnProfile, currentUser]);

  const handleAvatarChange = useCallback(async (file: File) => {
    if (!profile || !isOwnProfile) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }
    if (!validateFileSize(file, 'AVATAR')) return;
    
    setUploading(true);
    try {
      const newAvatarUrl = await userService.uploadAvatar(profile.id, file);
      setProfile({ ...profile, avatar: newAvatarUrl });
      if (currentUser) {
        useAuthStore.setState({ user: { ...currentUser, avatar: newAvatarUrl } });
      }
    } catch (error) {
      console.error("Lỗi upload avatar", error);
      toast.error('Không thể tải lên ảnh đại diện');
    } finally {
      setUploading(false);
    }
  }, [profile, isOwnProfile, currentUser]);

  const handleCoverChange = useCallback(async (file: File) => {
    if (!profile || !isOwnProfile) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }
    if (!validateFileSize(file, 'COVER')) return;
    
    setUploading(true);
    try {
      const newCoverUrl = await userService.uploadCoverImage(profile.id, file);
      setProfile({ ...profile, coverImage: newCoverUrl });
    } catch (error) {
      console.error("Lỗi upload cover", error);
      toast.error('Không thể tải lên ảnh bìa');
    } finally {
      setUploading(false);
    }
  }, [profile, isOwnProfile]);

  const handleAvatarDelete = useCallback(async () => {
    if (!profile || !isOwnProfile) return;
    setUploading(true);
    try {
      await userService.deleteAvatar(profile.id);
      setProfile({ ...profile, avatar: '' });
      if (currentUser) {
        useAuthStore.setState({ user: { ...currentUser, avatar: '' } });
      }
      toast.success('Đã xóa ảnh đại diện');
    } catch (error) {
      toast.error('Không thể xóa ảnh đại diện');
    } finally {
      setUploading(false);
    }
  }, [profile, isOwnProfile, currentUser]);

  const handleCoverDelete = useCallback(async () => {
    if (!profile || !isOwnProfile) return;
    setUploading(true);
    try {
      await userService.deleteCoverImage(profile.id);
      setProfile({ ...profile, coverImage: '' });
      toast.success('Đã xóa ảnh bìa');
    } catch (error) {
      toast.error('Không thể xóa ảnh bìa');
    } finally {
      setUploading(false);
    }
  }, [profile, isOwnProfile]);

  return {
    currentUser,
    profile,
    stats,
    latestMedia,
    loading,
    uploading,
    profileUserId,
    isOwnProfile,
    isFriend,
    canViewContent,
    activeTab,
    setActiveTab,
    loadProfile,
    handleMessage,
    handleFriendAction,
    confirmUnfriend,
    handleSaveProfile,
    handleAvatarChange,
    handleCoverChange,
    handleAvatarDelete,
    handleCoverDelete,
  };
};
