import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Post } from '../../../shared/types';
import { useFriendIds } from '../utils';
import { userService } from '../../services/userService';
import { postService } from '../../services/postService';
import { useUserCache } from '../../store/userCacheStore';
import { useBlockedUsers } from '../utils/useBlockedUsers';
import { usePostStore } from '../../store';

interface UseProfileDataProps {
  profileUserId: string | undefined;
  currentUser: User | null;
}

/**
 * Lấy và đồng bộ dữ liệu profile
 */
export const useProfileData = ({ profileUserId, currentUser }: UseProfileDataProps) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbPosts, setDbPosts] = useState<Post[]>([]);

  const isOwnProfile = currentUser?.id === profileUserId;
  const rawFriendIds = useFriendIds();
  const friendIds = useMemo(() => rawFriendIds, [JSON.stringify(rawFriendIds)]);

  const { isFullyBlocked } = useBlockedUsers();
  const lastIdRef = useRef<string | undefined>(undefined);

  const allStorePosts = usePostStore(state => state.posts);

  const latestMedia = useMemo(() => {
    if (!profileUserId) return [];

    const storeMediaPosts = allStorePosts.filter(p =>
      p.authorId === profileUserId && p.media && p.media.length > 0
    );

    const combinedPosts = [...storeMediaPosts, ...dbPosts];

    const urls = new Set<string>();
    combinedPosts.forEach(post => {
      post.media?.forEach(m => {
        if (m.url) urls.add(m.url);
      });
    });

    return Array.from(urls).slice(0, 6);
  }, [allStorePosts, dbPosts, profileUserId]);

  const loadProfile = useCallback(async (isInitial = false) => {
    if (!profileUserId) return;

    const isDifferentUser = lastIdRef.current !== profileUserId;
    if (isInitial && isDifferentUser) {
      setLoading(true);
    }

    lastIdRef.current = profileUserId;
    try {
      const isBlockedWith = profileUserId ? isFullyBlocked(profileUserId) : false;
      const [userData, userPosts] = await Promise.all([
        userService.getUserById(profileUserId),
        isBlockedWith ? Promise.resolve({ posts: [], lastDoc: null }) : postService.getUserPosts(profileUserId, currentUser?.id || '', rawFriendIds, 20)
      ]);

      setProfile(userData || null);
      setDbPosts(userPosts.posts || []);

    } catch (error) {
      console.error("Lỗi load profile", error);
    } finally {
      if (isInitial && isDifferentUser) {
        setLoading(false);
      }
    }
  }, [profileUserId, currentUser?.id, rawFriendIds, isFullyBlocked]);

  useEffect(() => {
    loadProfile(true);
  }, [profileUserId]);

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
    latestMedia,
    loading,
    isOwnProfile,
    loadProfile,
  };
};
