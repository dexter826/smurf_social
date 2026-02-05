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
    handleReact,
    handleUpdate,
    handleDelete,
    observerRef,
  } = useFeed();

  const { selectedPost, setSelectedPost } = usePostStore();

  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  const handleEditPost = async (content: string, images: string[], videos: string[], visibility: 'public' | 'friends' | 'private', videoThumbnails?: Record<string, string>) => {
    if (!showEditModal) return;
    await handleUpdate(showEditModal, content, images, videos, visibility, videoThumbnails);
    setShowEditModal(null);
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    const post = posts.find(p => p.id === postToDelete);
    await handleDelete(postToDelete, post?.images, post?.videos);
    setPostToDelete(null);
  };

  const handleUploadImages = async (files: File[], onProgress?: (progress: number) => void) => {
    if (!currentUser) throw new Error('Not authenticated');
    return await postService.uploadPostMedia(files, currentUser.id, (progress) => {
      onProgress?.(progress);
    });
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
    <div className="flex justify-center h-full w-full overflow-y-auto transition-theme scroll-smooth" id="feed-container">
      <div className="w-full max-w-[680px] py-4 md:py-6 space-y-3 md:space-y-4 px-2 md:px-0 pb-24 md:pb-8">
        <CreatePost currentUser={currentUser} />

        {posts.length === 0 ? (
          <div className="bg-bg-primary rounded-xl p-8 md:p-12 shadow-sm border border-border-light text-center transition-theme mx-2 md:mx-0">
            <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
               <span className="text-4xl" role="img" aria-label="notes">📝</span>
            </div>
            <p className="text-text-primary text-lg font-semibold">Chưa có bài viết nào</p>
            <p className="text-text-secondary text-sm mt-2 max-w-[250px] mx-auto">
              Hãy kết nối với bạn bè hoặc chia sẻ khoảnh khắc đầu tiên của bạn!
            </p>
          </div>
        ) : (
          <>
            {posts.map((post) => {
              const author = usersMap[post.userId] || {
                id: post.userId,
                name: 'Người dùng',
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
                  onReact={handleReact}
                  onEdit={(postId) => setShowEditModal(postId)}
                  onDelete={(postId) => setPostToDelete(postId)}
                  onViewDetail={(post) => setSelectedPost(post)}
                />
              );
            })}

            <div ref={observerRef} className="h-4 w-full" />
            
            {isLoading && hasMore && (
              <div className="space-y-4 mt-4 px-2 md:px-0">
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
        onReact={handleReact}
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