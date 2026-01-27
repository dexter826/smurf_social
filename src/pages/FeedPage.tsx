import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { PostItem, PostModal, CreatePost } from '../components/feed';
import { Post, User } from '../types';
import { postService } from '../services/postService';
import { userService } from '../services/userService';
import { Avatar, ConfirmDialog } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { usePostStore } from '../store/postStore';
import { useUserCache } from '../store/userCacheStore';

const FeedPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const {
    posts,
    isLoading,
    hasMore,
    fetchPosts,
    subscribeToPosts,
    likePost,
    createPost,
    updatePost,
    deletePost,
  } = usePostStore();
  const { users: usersMap, fetchUsers } = useUserCache();

  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  
  const observerRef = useRef<HTMLDivElement>(null);

  // Sử dụng useCallback để stable dependencies
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

  useEffect(() => {
    handleFetchPosts();
    const unsubscribe = handleSubscribeToPosts();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [handleFetchPosts, handleSubscribeToPosts]);

  // Infinite Scroll Observer
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

  // Tự động load users khi posts thay đổi
  useEffect(() => {
    if (posts.length > 0) {
      const userIds = [...new Set(posts.map(p => p.userId))];
      fetchUsers(userIds);
    }
  }, [posts, fetchUsers]);

  const handleLoadMore = () => {
    if (!currentUser || isLoading || !hasMore) return;
    fetchPosts(currentUser.id, currentUser.friendIds || [], true);
  };


  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    await likePost(postId, currentUser.id);
  };

  const handleEditPost = async (content: string, images: string[], videos: string[], visibility: 'friends' | 'private') => {
    if (!showEditModal) return;
    await updatePost(showEditModal, content, images, videos, visibility);
    setShowEditModal(null);
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    const post = posts.find(p => p.id === postToDelete);
    await deletePost(postToDelete, post?.images, post?.videos);
    setPostToDelete(null);
  };

  const handleUploadImages = async (files: File[]) => {
    if (!currentUser) throw new Error('Not authenticated');
    return await postService.uploadPostMedia(files, currentUser.id);
  };

  if (!currentUser) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-text-secondary">Vui lòng đăng nhập</p>
      </div>
    );
  }

  const editPost = posts.find(p => p.id === showEditModal);

  return (
    <div className="flex justify-center h-full w-full overflow-y-auto bg-bg-secondary transition-theme">
      <div className="w-full max-w-[720px] py-6 space-y-4 px-2 md:px-0 pb-20">
        {/* Create Post Card */}
        <CreatePost currentUser={currentUser} />

        {/* Posts List */}
        {posts.length === 0 && isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <PostItem.Skeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-bg-primary rounded-xl p-12 shadow-sm border border-border-light text-center transition-theme">
            <p className="text-text-secondary text-lg font-medium">Chưa có bài viết nào</p>
            <p className="text-text-tertiary text-sm mt-2">
              Hãy tạo bài viết đầu tiên của bạn!
            </p>
          </div>
        ) : (
          <>
            {posts.map((post) => {
              const author = usersMap[post.userId] || {
                id: post.userId,
                name: 'Unknown User',
                avatar: '',
                email: '',
                status: 'offline' as const
              };

              return (
                <PostItem
                  key={post.id}
                  post={post}
                  author={author}
                  currentUser={currentUser}
                  onLike={handleLike}
                  onEdit={(postId) => setShowEditModal(postId)}
                  onDelete={(postId) => setPostToDelete(postId)}
                />
              );
            })}

            {/* Load More Trigger & Skeleton */}
            <div ref={observerRef} className="h-4 w-full" />
            
            {isLoading && hasMore && (
              <div className="space-y-4 mt-4">
                {[...Array(2)].map((_, i) => (
                  <PostItem.Skeleton key={`more-${i}`} />
                ))}
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <p className="text-center text-text-tertiary text-sm py-8 font-medium">
                Bạn đã xem hết bài viết.
              </p>
            )}
          </>
        )}
      </div>

      {/* Modal Edit */}
      <PostModal
        isOpen={!!showEditModal}
        onClose={() => {
          setShowEditModal(null);
        }}
        currentUser={currentUser}
        initialPost={editPost}
        onSubmit={handleEditPost}
        onUploadImages={handleUploadImages}
      />

      <ConfirmDialog
        isOpen={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        onConfirm={handleDeletePost}
        title="Xóa bài viết"
        message="Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa ngay"
        variant="danger"
      />
    </div>
  );
};

export default FeedPage;