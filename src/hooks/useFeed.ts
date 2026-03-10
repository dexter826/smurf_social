import { useEffect, useCallback, RefObject } from 'react';
import { Post, User, Visibility } from '../types';
import { useAuthStore } from '../store/authStore';
import { usePostStore } from '../store/postStore';
import { useUserCache } from '../store/userCacheStore';
import { useIntersectionObserver } from './utils/useIntersectionObserver';
import { useLoadingStore } from '../store/loadingStore';
import { useFriendIds } from './utils';
import { useBlockedUsers } from './utils';

interface UseFeedReturn {
  posts: Post[];
  isLoading: boolean;
  hasMore: boolean;
  usersMap: Record<string, User>;
  handleLoadMore: () => void;
  handleReact: (postId: string, reaction: string) => Promise<void>;
  handleUpdate: (postId: string, content: string, media: any[], visibility: Visibility) => Promise<void>;
  handleDelete: (postId: string, media?: any[]) => Promise<void>;
  observerRef: RefObject<HTMLDivElement | null>;
}

export const useFeed = (): UseFeedReturn => {
  const { user: currentUser } = useAuthStore();
  const friendIds = useFriendIds();
  const { blockedUserIds } = useBlockedUsers();
  const {
    posts,
    hasMore,
    fetchPosts,
    subscribeToPosts,
    reactToPost,
    updatePost,
    deletePost,
  } = usePostStore();
  const { users: usersMap, fetchUsers } = useUserCache();
  const feedPostsLoading = useLoadingStore(state => state.loadingStates['feed.posts'] ?? false);
  const feedLoadMoreLoading = useLoadingStore(state => state.loadingStates['feed.loadMore'] ?? false);

  const handleLoadMore = useCallback(() => {
    if (!currentUser || feedPostsLoading || feedLoadMoreLoading || !hasMore) return;
    fetchPosts(currentUser.id, friendIds, blockedUserIds, true);
  }, [currentUser, hasMore, fetchPosts, feedPostsLoading, feedLoadMoreLoading, friendIds, blockedUserIds]);

  const observerRef = useIntersectionObserver(handleLoadMore, {
    enabled: hasMore && !feedPostsLoading && !feedLoadMoreLoading && !!currentUser
  });



  const handleSubscribeToPosts = useCallback(() => {
    if (!currentUser) return;
    return subscribeToPosts(currentUser.id, friendIds, blockedUserIds);
  }, [currentUser, subscribeToPosts, friendIds, blockedUserIds]);

  useEffect(() => {
    if (!currentUser) return;

    if (posts.length === 0 || !feedPostsLoading) {
      fetchPosts(currentUser.id, friendIds, blockedUserIds, false);
    }

    const unsubscribe = handleSubscribeToPosts();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.id, blockedUserIds.length, friendIds.length]);

  // Lấy thông tin người dùng khi có bài mới
  useEffect(() => {
    if (posts.length > 0) {
      const userIds = [...new Set(posts.map(p => p.authorId))];
      fetchUsers(userIds);
    }
  }, [posts, fetchUsers]);

  const handleReact = useCallback(async (postId: string, reaction: string) => {
    if (!currentUser) return;
    await reactToPost(postId, currentUser.id, reaction);
  }, [currentUser, reactToPost]);

  const handleUpdate = useCallback(async (
    postId: string,
    content: string,
    media: any[],
    visibility: Visibility
  ) => {
    await updatePost(postId, content, media, visibility);
  }, [updatePost]);

  const handleDelete = useCallback(async (
    postId: string,
    media?: any[]
  ) => {
    if (!currentUser) return;
    await deletePost(postId, currentUser.id, media);
  }, [deletePost, currentUser]);

  return {
    posts,
    isLoading: feedPostsLoading,
    hasMore,
    usersMap,
    handleLoadMore,
    handleReact,
    handleUpdate,
    handleDelete,
    observerRef,
  };
};
