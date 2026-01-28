import React, { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { Post, User } from '../types';
import { useAuthStore } from '../store/authStore';
import { usePostStore } from '../store/postStore';
import { useUserCache } from '../store/userCacheStore';

interface UseFeedReturn {
  posts: Post[];
  isLoading: boolean;
  hasMore: boolean;
  usersMap: Record<string, User>;
  handleLoadMore: () => void;
  handleLike: (postId: string) => Promise<void>;
  handleUpdate: (postId: string, content: string, images: string[], videos: string[], visibility: 'friends' | 'private') => Promise<void>;
  handleDelete: (postId: string, images?: string[], videos?: string[]) => Promise<void>;
  observerRef: RefObject<HTMLDivElement | null>;
}

export const useFeed = (): UseFeedReturn => {
  const { user: currentUser } = useAuthStore();
  const {
    posts,
    isLoading,
    hasMore,
    fetchPosts,
    subscribeToPosts,
    likePost,
    updatePost,
    deletePost,
  } = usePostStore();
  const { users: usersMap, fetchUsers } = useUserCache();
  
  const observerRef = useRef<HTMLDivElement>(null);

  const handleFetchPosts = useCallback(() => {
    if (!currentUser) return;
    const friendIds = currentUser.friendIds || [];
    fetchPosts(currentUser.id, friendIds);
  }, [currentUser, fetchPosts]);

  const handleSubscribeToPosts = useCallback(() => {
    if (!currentUser) return;
    const friendIds = currentUser.friendIds || [];
    return subscribeToPosts(currentUser.id, friendIds);
  }, [currentUser, subscribeToPosts]);

  // Lấy dữ liệu ban đầu và theo dõi
  useEffect(() => {
    handleFetchPosts();
    const unsubscribe = handleSubscribeToPosts();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [handleFetchPosts, handleSubscribeToPosts]);

  // Cuộn vô tận
  useEffect(() => {
    if (!hasMore || isLoading || !currentUser) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, posts.length]);

  // Lấy thông tin người dùng khi có bài mới
  useEffect(() => {
    if (posts.length > 0) {
      const userIds = [...new Set(posts.map(p => p.userId))];
      fetchUsers(userIds);
    }
  }, [posts, fetchUsers]);

  const handleLoadMore = useCallback(() => {
    if (!currentUser || isLoading || !hasMore) return;
    fetchPosts(currentUser.id, currentUser.friendIds || [], true);
  }, [currentUser, isLoading, hasMore, fetchPosts]);

  const handleLike = useCallback(async (postId: string) => {
    if (!currentUser) return;
    await likePost(postId, currentUser.id);
  }, [currentUser, likePost]);

  const handleUpdate = useCallback(async (
    postId: string,
    content: string,
    images: string[],
    videos: string[],
    visibility: 'friends' | 'private'
  ) => {
    await updatePost(postId, content, images, videos, visibility);
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
    hasMore,
    usersMap,
    handleLoadMore,
    handleLike,
    handleUpdate,
    handleDelete,
    observerRef,
  };
};
