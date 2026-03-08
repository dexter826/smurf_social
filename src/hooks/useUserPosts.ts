import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Post, User } from '../types';
import { postService } from '../services/postService';
import { userService } from '../services/userService';
import { useFriendIds } from './utils';
import { useUserCache } from '../store/userCacheStore';
import { usePostStore } from '../store/postStore';
import { DocumentSnapshot } from 'firebase/firestore';

interface UseUserPostsReturn {
  posts: Post[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  users: Record<string, User>;
  handleLoadMore: () => void;
  handleReact: (postId: string, reaction: string) => Promise<void>;
  handleDelete: (postId: string, images?: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useUserPosts = (userId: string, currentUser: User): UseUserPostsReturn => {
  const [dbPosts, setDbPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const lastDocRef = useRef<DocumentSnapshot | null>(null);
  const hasMoreRef = useRef(true);

  const { users, fetchUsers } = useUserCache();
  const { posts: allStorePosts, deletePost: deleteStorePost } = usePostStore();
  const friendIds = useFriendIds();

  const posts = useMemo(() => {
    if (userId !== currentUser.id) return dbPosts;

    const dbPostIds = new Set(dbPosts.map(p => p.id));
    const uploadingPosts = allStorePosts.filter(p =>
      p.userId === userId && !dbPostIds.has(p.id)
    );

    return [...uploadingPosts, ...dbPosts];
  }, [dbPosts, allStorePosts, userId, currentUser.id]);

  const loadPosts = useCallback(async (isFirstPage: boolean = false) => {
    if (!isFirstPage && !hasMoreRef.current) return;

    if (isFirstPage) {
      setLoading(true);
      lastDocRef.current = null;
      hasMoreRef.current = true;
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await postService.getUserPosts(
        userId,
        currentUser.id,
        friendIds,
        10,
        isFirstPage ? undefined : (lastDocRef.current || undefined)
      );

      const newPosts = result.posts;
      lastDocRef.current = result.lastDoc;
      hasMoreRef.current = result.posts.length === 10;
      setHasMore(hasMoreRef.current);

      if (isFirstPage) {
        setDbPosts(newPosts);
      } else {
        setDbPosts(prev => [...prev, ...newPosts]);
      }

      const userIds = [...new Set(newPosts.map(p => p.userId))];
      fetchUsers(userIds);

    } catch (error) {
      console.error("Lỗi load posts", error);
    } finally {
      if (isFirstPage) setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, currentUser.id, friendIds, fetchUsers]);

  useEffect(() => {
    loadPosts(true);

    const unsubscribe = postService.subscribeToUserPosts(
      userId,
      currentUser.id,
      friendIds,
      (newPosts) => {
        setDbPosts(prev => {
          const updatedPosts = [...prev];
          newPosts.forEach(npm => {
            const index = updatedPosts.findIndex(p => p.id === npm.id);
            if (index !== -1) {
              updatedPosts[index] = npm;
            } else {
              const firstPostTime = updatedPosts[0]?.createdAt?.getTime() || 0;
              if (npm.createdAt.getTime() > firstPostTime) {
                updatedPosts.unshift(npm);
              }
            }
          });
          return updatedPosts;
        });

        fetchUsers(newPosts.map(p => p.userId));
      }
    );

    return () => unsubscribe();
  }, [userId, currentUser.id, friendIds, loadPosts, fetchUsers]);

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      loadPosts(false);
    }
  }, [loading, loadingMore, hasMore, loadPosts]);

  const handleReact = useCallback(async (postId: string, reaction: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const { myPostReactions } = usePostStore.getState();
    const oldReaction = myPostReactions[postId];
    const isRemove = oldReaction === reaction;

    const prevSummary = post.reactionSummary;
    const newSummary = { ...prevSummary };
    let newCount = post.reactionCount;

    if (isRemove) {
      if (oldReaction) {
        newSummary[oldReaction] = Math.max(0, (newSummary[oldReaction] ?? 0) - 1);
        if (newSummary[oldReaction] === 0) delete newSummary[oldReaction];
      }
      newCount = Math.max(0, newCount - 1);
    } else if (oldReaction) {
      newSummary[oldReaction] = Math.max(0, (newSummary[oldReaction] ?? 0) - 1);
      if (newSummary[oldReaction] === 0) delete newSummary[oldReaction];
      newSummary[reaction] = (newSummary[reaction] ?? 0) + 1;
    } else {
      newSummary[reaction] = (newSummary[reaction] ?? 0) + 1;
      newCount += 1;
    }

    setDbPosts(prev => prev.map(p => p.id !== postId ? p : {
      ...p, reactionCount: newCount, reactionSummary: newSummary
    }));

    // Update myPostReactions in store
    const newMyReactions = { ...myPostReactions };
    if (isRemove) {
      delete newMyReactions[postId];
    } else {
      newMyReactions[postId] = reaction;
    }
    usePostStore.setState({ myPostReactions: newMyReactions });

    try {
      await postService.reactToPost(postId, currentUser.id, isRemove ? 'REMOVE' : reaction);
    } catch (error) {
      // Rollback
      setDbPosts(prev => prev.map(p => p.id !== postId ? p : {
        ...p, reactionCount: post.reactionCount, reactionSummary: prevSummary
      }));
      usePostStore.setState({ myPostReactions: { ...usePostStore.getState().myPostReactions, [postId]: oldReaction } });
    }
  }, [posts, currentUser.id]);

  const handleDelete = useCallback(async (postId: string, images?: string[]) => {
    try {
      // Gọi hàm xóa từ store để cập nhật trạng thái toàn cục
      await deleteStorePost(postId, currentUser.id, images);
      // Cập nhật trạng thái local
      setDbPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error) {
      console.error("Lỗi khi xóa bài viết trong hook:", error);
      throw error;
    }
  }, [deleteStorePost, currentUser.id]);

  const refresh = useCallback(async () => {
    await loadPosts(true);
  }, [loadPosts]);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    users,
    handleLoadMore,
    handleReact,
    handleDelete,
    refresh
  };
};
