import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserStatus } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useContactStore } from '../../store/contactStore';
import { userService } from '../../services/userService';
import { postService } from '../../services/postService';
import { useUserCache } from '../../store/userCacheStore';

interface ProfileStats {
  friendCount: number;
  postCount: number;
}

interface UseProfileDataProps {
  profileUserId: string | undefined;
  currentUser: User | null;
}

// Lấy và đồng bộ dữ liệu profile
export const useProfileData = ({ profileUserId, currentUser }: UseProfileDataProps) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ friendCount: 0, postCount: 0 });
  const [loading, setLoading] = useState(true);
  const [latestMedia, setLatestMedia] = useState<string[]>([]);

  const isOwnProfile = currentUser?.id === profileUserId;
  const friendIds = useContactStore(state => state.friends.map(f => f.id));

  const loadProfile = useCallback(async () => {
    if (!profileUserId) return;

    setLoading(true);
    try {
      const [userData, userStats, userPosts] = await Promise.all([
        userService.getUserById(profileUserId),
        userService.getUserStats(profileUserId, currentUser?.id, friendIds),
        postService.getUserPosts(profileUserId, currentUser?.id || '', friendIds, 20)
      ]);

      setProfile(userData || null);
      setStats(userStats);

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
  }, [profileUserId, currentUser?.id, friendIds]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!profileUserId) return;

    const unsubscribeProfile = userService.subscribeToUser(profileUserId, (updatedUser) => {
      setProfile(prev => {
        if (!prev) return updatedUser;
        return { ...prev, ...updatedUser };
      });
      useUserCache.getState().setUser(updatedUser);
    });

    return () => unsubscribeProfile();
  }, [profileUserId]);

  return {
    profile,
    setProfile,
    stats,
    latestMedia,
    loading,
    isOwnProfile,
    loadProfile,
  };
};
