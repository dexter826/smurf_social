import { useState, useEffect, useCallback, useRef } from 'react';
import { Post, User } from '../types';
import { postService } from '../services/postService';
import { userService } from '../services/userService';
import { usePostStore } from '../store/postStore';
import { useUserCache } from '../store/userCacheStore';
import { DocumentSnapshot } from 'firebase/firestore';

interface UseUserPostsReturn {
  posts: Post[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  users: Record<string, User>;
  handleLoadMore: () => void;
  handleLike: (postId: string) => Promise<void>;
  handleDelete: (postId: string, images?: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useUserPosts = (userId: string, currentUser: User): UseUserPostsReturn => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const lastDocRef = useRef<DocumentSnapshot | null>(null);
  const hasMoreRef = useRef(true);
  
  const { setSelectedPost, reactToPost: storeReactToPost } = usePostStore();
  const { users, fetchUsers } = useUserCache();

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
        currentUser.friendIds || [],
        10, 
        isFirstPage ? undefined : (lastDocRef.current || undefined)
      );
      
      const newPosts = result.posts;
      lastDocRef.current = result.lastDoc;
      hasMoreRef.current = result.posts.length === 10;
      setHasMore(hasMoreRef.current);

      if (isFirstPage) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      
      const userIds = [...new Set(newPosts.map(p => p.userId))];
      fetchUsers(userIds);

    } catch (error) {
      console.error("Lỗi load posts", error);
    } finally {
      if (isFirstPage) setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, currentUser.id, currentUser.friendIds, fetchUsers]);

  useEffect(() => {
    loadPosts(true);
    
    const unsubscribe = postService.subscribeToUserPosts(
      userId,
      currentUser.id,
      currentUser.friendIds || [],
      (newPosts) => {
        setPosts(prev => {
          const updatedPosts = [...prev];
          newPosts.forEach(npm => {
            const index = updatedPosts.findIndex(p => p.id === npm.id);
            if (index !== -1) {
              updatedPosts[index] = npm;
            } else {
              const firstPostTime = updatedPosts[0]?.timestamp?.getTime() || 0;
              if (npm.timestamp.getTime() > firstPostTime) {
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
  }, [userId, currentUser.id, currentUser.friendIds, loadPosts]);

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      loadPosts(false);
    }
  }, [loading, loadingMore, hasMore, loadPosts]);

  const handleLike = useCallback(async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.reactions?.[currentUser.id] === '👍';
    
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      
      const newReactions = { ...(p.reactions || {}) };
      if (isLiked) {
        delete newReactions[currentUser.id];
      } else {
        newReactions[currentUser.id] = '👍';
      }
      return { ...p, reactions: newReactions };
    }));

    try {
      await postService.reactToPost(postId, currentUser.id, isLiked ? 'REMOVE' : '👍');
    } catch (error) {
      // Rollback
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        
        const oldReactions = { ...(p.reactions || {}) };
        if (isLiked) {
          oldReactions[currentUser.id] = '👍';
        } else {
          delete oldReactions[currentUser.id];
        }
        return { ...p, reactions: oldReactions };
      }));
    }
  }, [posts, currentUser.id]);

  const handleDelete = useCallback(async (postId: string, images?: string[]) => {
    await postService.deletePost(postId, images);
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

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
    handleLike,
    handleDelete,
    refresh
  };
};
