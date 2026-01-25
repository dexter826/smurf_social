import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Edit, Trash2, Globe, Users, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Avatar } from '../ui';
import { Post, User } from '../../types';

interface PostItemProps {
  post: Post;
  author: User;
  currentUser: User;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

export const PostItem: React.FC<PostItemProps> = ({
  post,
  author,
  currentUser,
  onLike,
  onComment,
  onEdit,
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const isLiked = post.likes.includes(currentUser.id);
  const isOwner = post.userId === currentUser.id;

  const visibilityIcons = {
    public: { icon: Globe, label: 'Công khai' },
    friends: { icon: Users, label: 'Bạn bè' },
    private: { icon: Lock, label: 'Chỉ mình tôi' }
  };

  const VisibilityIcon = visibilityIcons[post.visibility].icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex gap-3">
          <Avatar src={author?.avatar} name={author?.name} size="md" status={author?.status} />
          <div>
            <h3 className="font-semibold text-gray-900 text-[15px]">
              {author?.name || 'Unknown User'}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
              <span>
                {formatDistanceToNow(post.timestamp, {
                  addSuffix: true,
                  locale: vi
                })}
              </span>
              {post.edited && <span>• Đã chỉnh sửa</span>}
              <span>•</span>
              <VisibilityIcon size={12} />
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
            >
              <MoreHorizontal size={20} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px]">
                  <button
                    onClick={() => {
                      onEdit?.(post.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <Edit size={16} />
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={() => {
                      onDelete?.(post.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 size={16} />
                    Xóa bài viết
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-900 whitespace-pre-line text-[15px] leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <div className="bg-gray-100 relative">
          <img
            src={post.images[imageIndex]}
            alt="Post image"
            className="w-full h-auto max-h-[600px] object-contain cursor-pointer"
            loading="lazy"
          />
          {post.images.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
              {imageIndex + 1} / {post.images.length}
            </div>
          )}
          {post.images.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between px-4">
              {imageIndex > 0 && (
                <button
                  onClick={() => setImageIndex(imageIndex - 1)}
                  className="bg-white bg-opacity-80 hover:bg-opacity-100 p-2 rounded-full shadow-lg"
                >
                  ←
                </button>
              )}
              {imageIndex < post.images.length - 1 && (
                <button
                  onClick={() => setImageIndex(imageIndex + 1)}
                  className="bg-white bg-opacity-80 hover:bg-opacity-100 p-2 rounded-full shadow-lg ml-auto"
                >
                  →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-3 flex justify-between items-center border-b border-gray-50">
        <div className="flex items-center gap-1.5">
          {post.likes.length > 0 && (
            <>
              <div className="bg-primary-500 p-1 rounded-full">
                <Heart size={12} className="text-white fill-white" />
              </div>
              <span className="text-sm text-gray-600 font-medium">
                {post.likes.length}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {post.commentCount > 0 && (
            <button
              onClick={() => onComment(post.id)}
              className="hover:underline"
            >
              {post.commentCount} bình luận
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex px-2 py-1">
        <button
          onClick={() => onLike(post.id)}
          className={`flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg transition-all active:scale-95 ${
            isLiked
              ? 'text-primary-500'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Heart size={20} className={isLiked ? 'fill-current' : ''} />
          <span className="text-sm font-medium">Thích</span>
        </button>
        <button
          onClick={() => onComment(post.id)}
          className="flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all"
        >
          <MessageCircle size={20} />
          <span className="text-sm font-medium">Bình luận</span>
        </button>
        <button className="flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all">
          <Share2 size={20} />
          <span className="text-sm font-medium">Chia sẻ</span>
        </button>
      </div>
    </div>
  );
};
