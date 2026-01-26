import React, { useEffect, useState, useRef, useCallback } from 'react';
import { DocumentSnapshot } from 'firebase/firestore';
import { Post, User } from '../../types';
import { postService } from '../../services/postService';
import { userService } from '../../services/userService';
import { Spinner } from '../ui';
import { PostItem } from '../feed/PostItem';
import { FileText } from 'lucide-react';

interface PostsTabProps {
  userId: string;
  currentUser: User;
}

export const PostsTab: React.FC<PostsTabProps> = ({ userId, currentUser }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef<IntersectionObserver>();

  const [loading, setLoading] = useState(true);

  // Reset state khi đổi user
  useEffect(() => {
    setPosts([]);
    setLastDoc(null);
    setHasMore(true);
    setLoading(true);
    loadPosts(true);
  }, [userId]);

  const lastPostElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadPosts(false);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);



  const loadPosts = async (isFirstPage: boolean = false) => {
    if (!isFirstPage && !hasMore) return;
    
    if (isFirstPage) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await postService.getUserPosts(
        userId, 
        10, 
        isFirstPage ? undefined : (lastDoc || undefined)
      );
      
      const newPosts = result.posts;
      setLastDoc(result.lastDoc);
      setHasMore(result.posts.length === 10); // Nếu trả về < 10 bài -> hết dữ liệu

      if (isFirstPage) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      
      // Load user info cho posts mới
      const userIds = Array.from(new Set(newPosts.map(p => p.userId)));
      // Filter out users we already have
      const missingUserIds = userIds.filter(uid => !users[uid]);
      
      if (missingUserIds.length > 0) {
        const newUsersData: Record<string, User> = {};
        await Promise.all(missingUserIds.map(async (uid) => {
          const user = await userService.getUserById(uid);
          if (user) newUsersData[uid] = user;
        }));
        setUsers(prev => ({ ...prev, ...newUsersData }));
      }

    } catch (error) {
      console.error("Lỗi load posts", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const isLiked = post.likes.includes(currentUser.id);
      await postService.likePost(postId, currentUser.id, isLiked);
      
      await loadPosts(true);
    } catch (error) {
      console.error("Lỗi like post", error);
    }
  };

  const handleComment = (postId: string) => {
    // Scroll to comment section
  };

  const handleEdit = (postId: string) => {
    // Open edit modal
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
    
    try {
      const post = posts.find(p => p.id === postId);
      await postService.deletePost(postId, post?.images);
      await loadPosts(true);
    } catch (error) {
      console.error("Lỗi xóa post", error);
      alert('Không thể xóa bài viết');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
    <div className="space-y-4">
      {/* Header with Title and Filter */}
      <div className="bg-bg-primary rounded-lg shadow-sm border border-border-light p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-theme">
        <h3 className="font-bold text-lg text-text-primary">Bài viết</h3>
      </div>
      
      {posts.length === 0 ? (
        <div className="bg-bg-primary rounded-lg shadow-sm border border-border-light p-8 text-center transition-theme">
          <FileText size={48} className="mx-auto mb-3 text-text-secondary" />
          <p className="text-text-secondary">Chưa có bài viết nào</p>
        </div>
      ) : null}
    </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Title */}
      <div className="bg-bg-primary rounded-lg shadow-sm border border-border-light p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-theme">
        <h3 className="font-bold text-lg text-text-primary">Bài viết</h3>
      </div>
        {posts.map((post, index) => {
          if (posts.length === index + 1) {
             return (
               <div ref={lastPostElementRef} key={post.id}>
                 <PostItem
                    post={post}
                    author={users[post.userId]}
                    currentUser={currentUser}
                    onLike={handleLike}
                    onComment={handleComment}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
               </div>
             );
          } else {
            return (
              <PostItem
                key={post.id}
                post={post}
                author={users[post.userId]}
                currentUser={currentUser}
                onLike={handleLike}
                onComment={handleComment}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            );
          }
        })}
        {loadingMore && (
           <div className="flex justify-center py-4">
             <Spinner />
           </div>
        )}
      </div>
  );
};
