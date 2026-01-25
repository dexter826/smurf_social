import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { userService } from '../services/userService';
import { User } from '../types';
import { Avatar, Spinner } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { usePostStore } from '../store/postStore';
import { CreatePostModal, PostItem, CommentSection, EditPostModal } from '../components/feed';

const FeedPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const {
    posts,
    isLoading,
    hasMore,
    subscribeToPosts,
    likePost,
    createPost,
    updatePost,
    deletePost,
    uploadImages
  } = usePostStore();

  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const friendIds = currentUser.friendIds || [];
    const unsubscribe = subscribeToPosts(currentUser.id, friendIds);
    loadUsers();

    return () => {
      unsubscribe();
    };
  }, [currentUser, subscribeToPosts]);

  useEffect(() => {
    if (posts.length > 0) {
      loadUsers();
    }
  }, [posts]);

  const loadUsers = async () => {
    if (!currentUser) return;

    try {
      const userIds = [...new Set(posts.map(p => p.userId))];
      const users: Record<string, User> = { [currentUser.id]: currentUser };

      for (const userId of userIds) {
        if (userId !== currentUser.id && !usersMap[userId]) {
          const user = await userService.getUserById(userId);
          if (user) users[userId] = user;
        }
      }

      setUsersMap(prev => ({ ...prev, ...users }));
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreatePost = async (
    content: string,
    images: string[],
    visibility: 'public' | 'friends' | 'private'
  ) => {
    if (!currentUser) return;
    await createPost(currentUser.id, content, images, visibility);
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    await likePost(postId, currentUser.id);
  };

  const handleEditPost = async (content: string) => {
    if (!showEditModal) return;
    await updatePost(showEditModal, content);
    setShowEditModal(null);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;

    const post = posts.find(p => p.id === postId);
    await deletePost(postId, post?.images);
  };

  const handleUploadImages = async (files: File[]) => {
    if (!currentUser) throw new Error('Not authenticated');
    return await uploadImages(files, currentUser.id);
  };

  if (!currentUser) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Vui lòng đăng nhập</p>
      </div>
    );
  }

  if (isLoading && posts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const editPost = posts.find(p => p.id === showEditModal);

  return (
    <div className="flex justify-center h-full w-full overflow-y-auto bg-gray-50">
      <div className="w-full max-w-[640px] py-6 space-y-4 px-2 md:px-0 pb-20">
        {/* Create Post Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex gap-3 mb-4">
            <Avatar src={currentUser.avatar} name={currentUser.name} size="md" />
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2.5 flex items-center text-gray-500 cursor-pointer transition-colors text-left"
            >
              {currentUser.name} ơi, bạn đang nghĩ gì thế?
            </button>
          </div>
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-600 transition-colors"
            >
              <ImageIcon className="text-green-500" size={20} />
              Ảnh/Video
            </button>
          </div>
        </div>

        {/* Posts List */}
        {loadingUsers && posts.length > 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500 text-lg font-medium">Chưa có bài viết nào</p>
            <p className="text-gray-400 text-sm mt-2">
              Hãy tạo bài viết đầu tiên của bạn!
            </p>
          </div>
        ) : (
          posts.map((post) => {
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
                onComment={(postId) => setShowCommentModal(postId)}
                onEdit={(postId) => setShowEditModal(postId)}
                onDelete={handleDeletePost}
              />
            );
          })
        )}

        {/* Load More */}
        {hasMore && posts.length > 0 && (
          <div className="flex justify-center py-4">
            <button className="text-primary-500 hover:text-primary-600 font-medium text-sm">
              Xem thêm bài viết
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        currentUser={currentUser}
        onSubmit={handleCreatePost}
        onUploadImages={handleUploadImages}
      />

      {showCommentModal && (
        <CommentSection
          postId={showCommentModal}
          currentUser={currentUser}
          onClose={() => setShowCommentModal(null)}
        />
      )}

      {showEditModal && editPost && (
        <EditPostModal
          isOpen={true}
          onClose={() => setShowEditModal(null)}
          initialContent={editPost.content}
          onSubmit={handleEditPost}
        />
      )}
    </div>
  );
};

export default FeedPage;