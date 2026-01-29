import React, { useState } from 'react';
import { PostItem, PostModal, PostViewModal, CreatePost, FeedSkeleton } from '../components/feed';
import { postService } from '../services/postService';
import { useAuthStore } from '../store/authStore';
import { usePostStore } from '../store/postStore';
import { useFeed } from '../hooks';
import { ConfirmDialog } from '../components/ui';

const FeedPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const {
    posts,
    isLoading,
    isRevalidating,
    hasMore,
    usersMap,
    handleLike,
    handleUpdate,
    handleDelete,
    observerRef,
  } = useFeed();

  const { selectedPost, setSelectedPost } = usePostStore();

  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  const handleEditPost = async (content: string, images: string[], videos: string[], visibility: 'friends' | 'private') => {
    if (!showEditModal) return;
    await handleUpdate(showEditModal, content, images, videos, visibility);
    setShowEditModal(null);
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    const post = posts.find(p => p.id === postToDelete);
    await handleDelete(postToDelete, post?.images, post?.videos);
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

  if (isLoading && posts.length === 0) {
    return <FeedSkeleton />;
  }

  return (
    <div className="flex justify-center h-full w-full overflow-y-auto bg-bg-secondary transition-theme">
      <div className="w-full max-w-[720px] py-6 space-y-4 px-2 md:px-0 pb-20">
        <CreatePost currentUser={currentUser} />

        {/* Nhãn cập nhật bài viết */}
        {isRevalidating && (
          <div className="text-center py-2 bg-primary/5 rounded-lg border border-primary/10 animate-pulse">
            <span className="text-xs text-primary font-medium italic">
              Đang cập nhật bài viết mới nhất...
            </span>
          </div>
        )}

        {posts.length === 0 ? (
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
                  onViewDetail={(post) => setSelectedPost(post)}
                />
              );
            })}

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

      <PostModal
        isOpen={!!showEditModal}
        onClose={() => setShowEditModal(null)}
        currentUser={currentUser}
        initialPost={editPost}
        onSubmit={handleEditPost}
        onUploadImages={handleUploadImages}
      />

      <PostViewModal
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        post={selectedPost}
        author={selectedPost ? usersMap[selectedPost.userId] : null}
        currentUser={currentUser}
        onLike={handleLike}
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