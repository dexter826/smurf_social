import React, { useEffect, useCallback, RefObject } from 'react';
import { Post, User } from '../types';
import { useAuthStore } from '../store/authStore';
import { usePostStore } from '../store/postStore';
import { useUserCache } from '../store/userCacheStore';
import { useIntersectionObserver } from './useIntersectionObserver';

interface UseFeedReturn {
  posts: Post[];
  isLoading: boolean;
  isRevalidating: boolean;
  hasMore: boolean;
  usersMap: Record<string, User>;
  handleLoadMore: () => void;
  handleReact: (postId: string, reaction: string) => Promise<void>;
  handleUpdate: (postId: string, content: string, images: string[], videos: string[], visibility: 'public' | 'friends' | 'private', videoThumbnails?: Record<string, string>) => Promise<void>;
  handleDelete: (postId: string, images?: string[], videos?: string[]) => Promise<void>;
  observerRef: RefObject<HTMLDivElement | null>;
}

export const useFeed = (): UseFeedReturn => {
  const { user: currentUser } = useAuthStore();
  const {
    posts,
    isLoading,
    isRevalidating,
    hasMore,
    fetchPosts,
    subscribeToPosts,
    reactToPost,
    updatePost,
    deletePost,
  } = usePostStore();
  const { users: usersMap, fetchUsers } = useUserCache();
  
  const handleLoadMore = useCallback(() => {
    if (!currentUser || isLoading || !hasMore) return;
    const blockedUserIds = currentUser.blockedUserIds || [];
    fetchPosts(currentUser.id, currentUser.friendIds || [], blockedUserIds, true);
  }, [currentUser, isLoading, hasMore, fetchPosts]);

  const observerRef = useIntersectionObserver(handleLoadMore, {
    enabled: hasMore && !isLoading && !!currentUser
  });

  const handleFetchPosts = useCallback(() => {
    if (!currentUser) return;
    const friendIds = currentUser.friendIds || [];
    const blockedUserIds = currentUser.blockedUserIds || [];
    fetchPosts(currentUser.id, friendIds, blockedUserIds);
  }, [currentUser, fetchPosts]);

  const handleSubscribeToPosts = useCallback(() => {
    if (!currentUser) return;
    const friendIds = currentUser.friendIds || [];
    const blockedUserIds = currentUser.blockedUserIds || [];
    return subscribeToPosts(currentUser.id, friendIds, blockedUserIds);
  }, [currentUser, subscribeToPosts]);

  // Lấy dữ liệu ban đầu và theo dõi
  useEffect(() => {
    handleFetchPosts();
    const unsubscribe = handleSubscribeToPosts();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [handleFetchPosts, handleSubscribeToPosts]);

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
    visibility: 'public' | 'friends' | 'private',
    videoThumbnails?: Record<string, string>
  ) => {
    await updatePost(postId, content, images, videos, visibility, videoThumbnails);
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
    isLoading,
    isRevalidating,
    hasMore,
    usersMap,
    handleLoadMore,
    handleReact,
    handleUpdate,
    handleDelete,
    observerRef,
  };
};
