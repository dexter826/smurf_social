import React, { useState, useCallback } from 'react';
import { Post, User, Visibility } from '../../../shared/types';
import { PostItem, CreatePost, PostModal } from '../feed';
import { ConfirmDialog } from '../ui';
import { toast } from '../../store/toastStore';
import { usePostStore } from '../../store';
import { useUserPosts, useIntersectionObserver } from '../../hooks';
import { postService } from '../../services/postService';
import { FileText } from 'lucide-react';

interface PostsTabProps {
  userId: string;
  currentUser: User;
  onViewPost?: (post: Post) => void;
  isActivityBlockedByPartner?: boolean;
}

export const PostsTab: React.FC<PostsTabProps> = ({ 
  userId, 
  currentUser, 
  onViewPost,
  isActivityBlockedByPartner = false
}) => {
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  const {
    posts,
    loading,
    loadingMore,
    hasMore,
    users,
    handleLoadMore,
    handleReact,
    handleDelete: performDelete,
    handleUpdate: performUpdate,
  } = useUserPosts(userId, currentUser);

  const [showEditModal, setShowEditModal] = useState<string | null>(null);

  const observerRef = useIntersectionObserver(handleLoadMore, {
    enabled: hasMore && !loading && !loadingMore
  });

  const handleEditPost = useCallback(async (
    content: string,
    media: any[],
    visibility: Visibility,
    pendingFiles?: File[],
    onProgress?: (progress: number) => void
  ) => {
    if (!showEditModal) return;
    try {
      await performUpdate(showEditModal, content, media, visibility, pendingFiles, onProgress);
      setShowEditModal(null);
    } catch (error) {
      console.error("Lỗi cập nhật bài viết", error);
    }
  }, [showEditModal, performUpdate]);

  const handleUploadImages = useCallback(async (files: File[], onProgress?: (progress: number) => void) => {
    return await postService.uploadPostMedia(files, currentUser.id, (overallProgress) => {
      onProgress?.(overallProgress);
    });
  }, [currentUser.id]);

  const handleDelete = async () => {
    if (!postToDelete) return;

    try {
      const post = posts.find(p => p.id === postToDelete);
      const mediaUrls = post?.media?.map(m => m.url) || [];
      await performDelete(postToDelete, mediaUrls);
      setPostToDelete(null);
    } catch (error) {
      console.error("Lỗi xóa post", error);
    }
  };

  if (loading && !isActivityBlockedByPartner) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <PostItem.Skeleton key={i} />
        ))}
      </div>
    );
  }

  const showEmptyState = isActivityBlockedByPartner || posts.length === 0;

  return (
    <div className="space-y-4">
      {userId === currentUser.id && (
        <CreatePost currentUser={currentUser} />
      )}

      {/* Header with Title */}
      <div className="bg-bg-primary rounded-lg shadow-sm border border-border-light p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-theme">
        <h3 className="font-bold text-lg text-text-primary">Bài viết</h3>
      </div>

      {showEmptyState ? (
        <div className="bg-bg-primary rounded-lg shadow-sm border border-border-light p-8 text-center transition-theme">
          <FileText size={48} className="mx-auto mb-3 text-text-secondary" />
          <p className="text-text-secondary">Chưa có bài viết nào</p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              author={users[post.authorId]}
              currentUser={currentUser}
              onReact={handleReact}
              onEdit={(postId) => setShowEditModal(postId)}
              onDelete={(id) => setPostToDelete(id)}
              onViewDetail={onViewPost}
            />
          ))}

          <div ref={observerRef} className="h-4 w-full" />
          {loadingMore && (
            <div className="space-y-4 mt-4">
              {[...Array(2)].map((_, i) => (
                <PostItem.Skeleton key={`more-${i}`} />
              ))}
            </div>
          )}
        </>
      )}

      <PostModal
        isOpen={!!showEditModal}
        onClose={() => setShowEditModal(null)}
        currentUser={currentUser}
        initialPost={posts.find(p => p.id === showEditModal)}
        onSubmit={handleEditPost}
        onUploadImages={handleUploadImages}
      />

      <ConfirmDialog
        isOpen={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        onConfirm={handleDelete}
        title="Xóa bài viết"
        message="Bạn có chắc chắn muốn xóa bài viết này?"
        confirmLabel="Xóa ngay"
        variant="danger"
      />
    </div>
  );
};
