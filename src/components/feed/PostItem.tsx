import React, { useState } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Edit, Trash2, Users, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Avatar, Skeleton, Dropdown, DropdownItem } from '../ui';
import { Post, User } from '../../types';
import { CommentSection } from './CommentSection';

interface PostItemProps {
  post: Post;
  author: User;
  currentUser: User;
  onLike: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

export const PostItem: React.FC<PostItemProps> & { Skeleton: React.FC } = ({
  post,
  author,
  currentUser,
  onLike,
  onEdit,
  onDelete
}) => {
  const [showComments, setShowComments] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);

  const isLiked = post.likes.includes(currentUser.id);
  const isOwner = post.userId === currentUser.id;

  return (
    <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light overflow-hidden mb-4 transition-theme">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex gap-3">
          <Avatar src={author?.avatar} name={author?.name} size="md" status={author?.status} />
          <div>
            <h3 className="font-semibold text-text-primary text-[15px]">
              {author?.name || 'Unknown User'}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
              <span>
                {formatDistanceToNow(post.timestamp, {
                  locale: {
                    ...vi,
                    formatDistance: (token, count) => {
                      const formatRelativeLocale: { [key: string]: string } = {
                        lessThanXSeconds: 'vừa xong',
                        xSeconds: 'vừa xong',
                        halfAMinute: 'vừa xong',
                        lessThanXMinutes: '{{count}} phút',
                        xMinutes: '{{count}} phút',
                        aboutXHours: '{{count}} giờ',
                        xHours: '{{count}} giờ',
                        xDays: '{{count}} ngày',
                        aboutXMonths: '{{count}} tháng',
                        xMonths: '{{count}} tháng',
                        aboutXYears: '{{count}} năm',
                        xYears: '{{count}} năm',
                      };
                      return formatRelativeLocale[token].replace('{{count}}', count.toString());
                    }
                  }
                })}
              </span>
              <span>•</span>
              {post.visibility === 'friends' ? (
                <Users size={12} title="Bạn bè" />
              ) : (
                <Lock size={12} title="Chỉ mình tôi" />
              )}
            </div>
          </div>
        </div>

        {isOwner && (
          <Dropdown
            trigger={
              <button className="text-text-secondary hover:bg-bg-hover p-1.5 rounded-full transition-colors">
                <MoreHorizontal size={20} />
              </button>
            }
          >
            <DropdownItem
              icon={<Edit size={16} />}
              label="Chỉnh sửa"
              onClick={() => onEdit?.(post.id)}
            />
            <DropdownItem
              icon={<Trash2 size={16} />}
              label="Xóa bài viết"
              variant="danger"
              onClick={() => onDelete?.(post.id)}
            />
          </Dropdown>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-text-primary whitespace-pre-line text-[15px] leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* Media (Images & Videos) */}
      {((post.images && post.images.length > 0) || (post.videos && post.videos.length > 0)) && (
        <div className="bg-bg-secondary relative">
          {(() => {
            const allMedia = [
              ...(post.images || []).map(url => ({ url, type: 'image' })),
              ...(post.videos || []).map(url => ({ url, type: 'video' }))
            ];
            const currentMedia = allMedia[mediaIndex];

            if (currentMedia.type === 'video') {
              return (
                <video
                  src={currentMedia.url}
                  controls
                  className="w-full h-auto max-h-[600px] bg-black"
                />
              );
            }

            return (
              <img
                src={currentMedia.url}
                alt="Post content"
                className="w-full h-auto max-h-[600px] object-contain cursor-pointer"
                loading="lazy"
              />
            );
          })()}

          {/* Navigation */}
          {(() => {
            const totalMedia = (post.images?.length || 0) + (post.videos?.length || 0);
            if (totalMedia <= 1) return null;

            return (
              <>
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm z-10">
                  {mediaIndex + 1} / {totalMedia}
                </div>
                <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                  {mediaIndex > 0 && (
                    <button
                      onClick={() => setMediaIndex(mediaIndex - 1)}
                      className="bg-bg-primary bg-opacity-80 hover:bg-opacity-100 p-2 rounded-full shadow-dropdown pointer-events-auto transition-colors"
                    >
                      ←
                    </button>
                  )}
                  {mediaIndex < totalMedia - 1 && (
                    <button
                      onClick={() => setMediaIndex(mediaIndex + 1)}
                      className="bg-bg-primary bg-opacity-80 hover:bg-opacity-100 p-2 rounded-full shadow-dropdown ml-auto pointer-events-auto transition-colors"
                    >
                      →
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-3 flex justify-between items-center border-b border-border-light">
        <div className="flex items-center gap-1.5">
          {post.likes.length > 0 && (
            <>
              <div className="bg-primary-500 p-1 rounded-full">
                <Heart size={12} className="text-white fill-white" />
              </div>
              <span className="text-sm text-text-secondary font-medium">
                {post.likes.length}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-text-secondary">
          {post.commentCount > 0 && (
            <button
              onClick={() => setShowComments(!showComments)}
              className="hover:underline"
            >
              {post.commentCount} bình luận
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex px-2 py-1 border-b border-border-light">
        <button
          onClick={() => onLike(post.id)}
          className={`flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg transition-colors active:scale-95 ${
            isLiked
              ? 'text-primary-500'
              : 'text-text-secondary hover:bg-bg-hover'
          }`}
        >
          <Heart size={20} className={isLiked ? 'fill-current' : ''} />
          <span className="text-sm font-medium">Thích</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg transition-colors ${
            showComments ? 'text-primary-500 bg-primary-50/50' : 'text-text-secondary hover:bg-bg-hover'
          }`}
        >
          <MessageCircle size={20} />
          <span className="text-sm font-medium">Bình luận</span>
        </button>
      </div>

      {showComments && (
        <CommentSection
          postId={post.id}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

// Define and attach Skeleton
const PostSkeleton: React.FC = () => (
  <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light overflow-hidden mb-4 transition-theme">
    <div className="p-4 flex items-start justify-between">
      <div className="flex gap-3">
        <Skeleton variant="circle" width={40} height={40} />
        <div className="space-y-2">
          <Skeleton variant="line" width={128} height={16} />
          <Skeleton variant="line" width={80} height={12} className="opacity-50" />
        </div>
      </div>
    </div>
    <div className="px-4 pb-3 space-y-2">
      <Skeleton variant="line" width="100%" height={16} className="opacity-70" />
      <Skeleton variant="line" width="75%" height={16} className="opacity-70" />
    </div>
    <div className="w-full h-64 bg-bg-secondary flex items-center justify-center">
      <Skeleton variant="rect" width={48} height={48} className="opacity-20" />
    </div>
    <div className="flex px-2 py-3 border-t border-border-light">
      <div className="flex-1 flex justify-center">
        <Skeleton variant="line" width={64} height={16} className="opacity-50" />
      </div>
      <div className="flex-1 flex justify-center">
        <Skeleton variant="line" width={64} height={16} className="opacity-50" />
      </div>
    </div>
  </div>
);

PostItem.Skeleton = PostSkeleton;
