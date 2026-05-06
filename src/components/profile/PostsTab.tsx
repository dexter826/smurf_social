import React, { useState, useCallback } from 'react';
import { Post, User, Visibility, MediaObject } from '../../../shared/types';
import { PostItem, CreatePost, PostModal } from '../feed';
import { ConfirmDialog, EmptyState } from '../ui';
import { usePostStore } from '../../store';
import { useUserPosts, useIntersectionObserver } from '../../hooks';
import { FileText } from 'lucide-react';

interface PostsTabProps {
  userId: string;
  currentUser: User;
  onViewPost?: (post: Post) => void;
  isViewActivityBlocked?: boolean;
  onSharePost?: (post: Post, authorName: string) => void;
}

export const PostsTab: React.FC<PostsTabProps> = ({
  userId, currentUser, onViewPost, isViewActivityBlocked = false, onSharePost,
}) => {
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);

  const {
    posts, loading, loadingMore, hasMore, users,
    handleLoadMore, handleReact, handleDelete: performDelete, handleUpdate: performUpdate,
  } = useUserPosts(userId, currentUser);

  const observerRef = useIntersectionObserver(handleLoadMore, {
    enabled: hasMore && !loading && !loadingMore,
  });

  const handleEditPost = useCallback(async (
    content: string,
    media: MediaObject[],
    visibility: Visibility,
    pendingFiles?: File[]
  ) => {
    if (!showEditModal) return;
    await performUpdate(showEditModal, content, media, visibility, pendingFiles);
    setShowEditModal(null);
  }, [showEditModal, performUpdate]);

  const handleDelete = async () => {
    if (!postToDelete) return;
    const post = posts.find(p => p.id === postToDelete);
    await performDelete(postToDelete, post?.media?.map(m => m.url) || []);
    setPostToDelete(null);
  };

  if (loading && !isViewActivityBlocked) {
    return (
      <div className="space-y-3 md:space-y-4">
        {[...Array(3)].map((_, i) => <PostItem.Skeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {userId === currentUser.id && <CreatePost currentUser={currentUser} />}

      {isViewActivityBlocked || posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Chưa có bài viết nào"
          variant="boxed"
          size="md"
        />
      ) : (
        <>
          {posts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              author={users[post.authorId]}
              currentUser={currentUser}
              onReact={handleReact}
              onEdit={setShowEditModal}
              onDelete={setPostToDelete}
              onViewDetail={onViewPost}
              onShare={onSharePost}
            />
          ))}
          <div ref={observerRef} className="h-4 w-full" />
          {loadingMore && (
            <div className="space-y-3 md:space-y-4 mt-2">
              {[...Array(2)].map((_, i) => <PostItem.Skeleton key={`more-${i}`} />)}
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
