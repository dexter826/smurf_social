import { useEffect, useCallback, RefObject } from 'react';
import { Post, User, Visibility } from '../types';
import { useAuthStore } from '../store/authStore';
import { usePostStore } from '../store/postStore';
import { useUserCache } from '../store/userCacheStore';
import { useIntersectionObserver } from './utils/useIntersectionObserver';
import { useLoadingStore } from '../store/loadingStore';
import { useFriendIds } from './utils';

interface UseFeedReturn {
  posts: Post[];
  isLoading: boolean;
  hasMore: boolean;
  usersMap: Record<string, User>;
  handleLoadMore: () => void;
  handleReact: (postId: string, reaction: string) => Promise<void>;
  handleUpdate: (postId: string, content: string, images: string[], videos: string[], visibility: Visibility, videoThumbnails?: Record<string, string>, pendingFiles?: File[]) => Promise<void>;
  handleDelete: (postId: string, images?: string[], videos?: string[]) => Promise<void>;
  observerRef: RefObject<HTMLDivElement | null>;
}

export const useFeed = (): UseFeedReturn => {
  const { user: currentUser } = useAuthStore();
  const friendIds = useFriendIds();
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
    const blockedUserIds = currentUser.blockedUserIds || [];
    fetchPosts(currentUser.id, friendIds, blockedUserIds, true);
  }, [currentUser, hasMore, fetchPosts, feedPostsLoading, feedLoadMoreLoading, friendIds]);

  const observerRef = useIntersectionObserver(handleLoadMore, {
    enabled: hasMore && !feedPostsLoading && !feedLoadMoreLoading && !!currentUser
  });



  const handleSubscribeToPosts = useCallback(() => {
    if (!currentUser) return;
    const blockedUserIds = currentUser.blockedUserIds || [];
    return subscribeToPosts(currentUser.id, friendIds, blockedUserIds);
  }, [currentUser, subscribeToPosts, friendIds]);

  useEffect(() => {
    if (!currentUser) return;

    const blockedUserIds = currentUser.blockedUserIds || [];

    if (posts.length === 0 || !feedPostsLoading) {
      fetchPosts(currentUser.id, friendIds, blockedUserIds, false);
    }

    const unsubscribe = handleSubscribeToPosts();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.id, currentUser?.blockedUserIds?.length, friendIds.length]);

  // Lấy thông tin người dùng khi có bài mới
  useEffect(() => {
    if (posts.length > 0) {
      const userIds = [...new Set(posts.map(p => p.userId))];
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
    images: string[],
    videos: string[],
    visibility: Visibility,
    videoThumbnails?: Record<string, string>,
    pendingFiles?: File[]
  ) => {
    await updatePost(postId, content, images, videos, visibility, videoThumbnails, pendingFiles);
  }, [updatePost]);

  const handleDelete = useCallback(async (
    postId: string,
    images?: string[],
    videos?: string[]
  ) => {
    await deletePost(postId, images, videos);
  }, [deletePost]);

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
