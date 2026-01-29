import { useState, useEffect, useCallback } from 'react';
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
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const { setSelectedPost, likePost: storeLikePost } = usePostStore();
  const { users, fetchUsers } = useUserCache();

  const loadPosts = useCallback(async (isFirstPage: boolean = false) => {
    if (!isFirstPage && !hasMore) return;
    
    if (isFirstPage) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await postService.getUserPosts(
        userId, 
        currentUser.id,
        currentUser.friendIds || [],
        10, 
        isFirstPage ? undefined : (lastDoc || undefined)
      );
      
      const newPosts = result.posts;
      setLastDoc(result.lastDoc);
      setHasMore(result.posts.length === 10);

      if (isFirstPage) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      
      // Load user info từ cache store
      const userIds = [...new Set(newPosts.map(p => p.userId))];
      fetchUsers(userIds);

    } catch (error) {
      console.error("Lỗi load posts", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, currentUser.id, currentUser.friendIds, hasMore, lastDoc, fetchUsers]);

  // Reset và load khi đổi userId
  useEffect(() => {
    loadPosts(true);
    
    // Đăng ký theo dõi thay đổi real-time
    const unsubscribe = postService.subscribeToUserPosts(
      userId,
      currentUser.id,
      currentUser.friendIds || [],
      (newPosts) => {
        // Chỉ cập nhật trang đầu nếu đang không load thêm
        setPosts(prev => {
          // Logic đơn giản: Nếu là bài mới thì thêm vào đầu, nếu là update thì thay thế
          // Tuy nhiên để đồng nhất với Infinite scroll, ta chỉ nên cập nhật các bài đang hiển thị
          const updatedPosts = [...prev];
          newPosts.forEach(npm => {
            const index = updatedPosts.findIndex(p => p.id === npm.id);
            if (index !== -1) {
              updatedPosts[index] = npm;
            } else {
              // Bài mới (có thể kiểm tra timestamp để đưa lên đầu)
              const firstPostTime = updatedPosts[0]?.timestamp?.getTime() || 0;
              if (npm.timestamp.getTime() > firstPostTime) {
                updatedPosts.unshift(npm);
              }
            }
          });
          return updatedPosts;
        });

        // Fetch users cho các bài mới
        fetchUsers(newPosts.map(p => p.userId));
      }
    );

    return () => unsubscribe();
  }, [userId, currentUser.id, currentUser.friendIds, fetchUsers]);

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      loadPosts(false);
    }
  }, [loading, loadingMore, hasMore, loadPosts]);

  const handleLike = useCallback(async (postId: string) => {
    // Cập nhật UI nhanh thông qua store nếu post đó có trong store
    // Hoặc cập nhật local state nếu không có trong store
    const isLiked = posts.find(p => p.id === postId)?.likes.includes(currentUser.id);
    
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { 
            ...p, 
            likes: isLiked 
              ? p.likes.filter(id => id !== currentUser.id) 
              : [...p.likes, currentUser.id] 
          } 
        : p
    ));

    try {
      await postService.likePost(postId, currentUser.id, !!isLiked);
    } catch (error) {
      // Rollback nếu lỗi
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              likes: isLiked 
                ? [...p.likes, currentUser.id] 
                : p.likes.filter(id => id !== currentUser.id) 
            } 
          : p
      ));
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
