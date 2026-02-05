import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { Heart, MessageCircle, MoreHorizontal, Edit, Trash2, Globe, Users, Lock, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime, formatDateTime } from '../../utils/dateUtils';
import { Avatar, UserAvatar, Skeleton, Dropdown, DropdownItem, IconButton, Button, ReactionDisplay, ReactionSelector } from '../ui';
import { Post, User, UserStatus, ReportType } from '../../types';
import { useReportStore } from '../../store/reportStore';
import { REACTION_LABELS, REACTIONS } from '../../constants';

interface PostItemProps {
  post: Post;
  author: User;
  currentUser: User;
  onReact: (postId: string, reaction: string) => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onViewDetail?: (post: Post) => void;
  onProfileClick?: () => void;
}

export const PostItem: React.FC<PostItemProps> & { Skeleton: React.FC } = ({
  post,
  author,
  currentUser,
  onReact,
  onEdit,
  onDelete,
  onViewDetail,
  onProfileClick
}) => {
  const navigate = useNavigate();
  const [mediaIndex, setMediaIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const { openReportModal } = useReportStore();

  const myReaction = post.reactions?.[currentUser.id];
  const isOwner = post.userId === currentUser.id;

  const handleProfileClick = () => {
    if (author?.id) {
      onProfileClick?.();
      navigate(`/profile/${author.id}`);
    }
  };

  const threshold = 300;
  const shouldTruncate = post.content.length > threshold;
  
  const displayContent = !shouldTruncate || isExpanded 
    ? post.content 
    : post.content.slice(0, threshold) + '...';

  return (
    <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light overflow-hidden mb-4 transition-theme">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex gap-3">
          <UserAvatar 
            userId={author?.id} 
            src={author?.avatar} 
            name={author?.name} 
            size="md" 
            initialStatus={author?.status} 
            onClick={handleProfileClick}
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 
                className="font-semibold text-text-primary text-[15px] cursor-pointer hover:underline"
                onClick={handleProfileClick}
              >
                {author?.name || 'Unknown User'}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
              <span title={formatDateTime(post.timestamp)}>
                {formatRelativeTime(post.timestamp)}
              </span>
              <span>•</span>
              {post.visibility === 'public' ? (
                <Globe size={12} title="Công khai" />
              ) : post.visibility === 'friends' ? (
                <Users size={12} title="Bạn bè" />
              ) : (
                <Lock size={12} title="Chỉ mình tôi" />
              )}
            </div>
          </div>
        </div>

        {isOwner ? (
          <Dropdown
            trigger={<IconButton icon={<MoreHorizontal size={18} />} size="md" />}
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
        ) : (
          <Dropdown
            trigger={<IconButton icon={<MoreHorizontal size={18} />} size="md" />}
          >
            <DropdownItem
              icon={<Flag size={16} />}
              label="Báo cáo"
              variant="danger"
              onClick={() => openReportModal(ReportType.POST, post.id, post.userId)}
            />
          </Dropdown>
        )}
      </div>

      {/* Content */}
      <div 
        className="px-4 pb-3"
      >
        <p className="text-text-primary whitespace-pre-line text-[15px] leading-relaxed">
          {displayContent}
          {shouldTruncate && (
            <span 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-primary font-bold cursor-pointer hover:underline ml-1.5 transition-all text-sm tracking-wider"
            >
              {isExpanded ? 'Thu gọn' : 'Xem thêm'}
            </span>
          )}
        </p>
      </div>

      {/* Media (Images & Videos) */}
      {((post.images && post.images.length > 0) || (post.videos && post.videos.length > 0)) && (
        <div className="bg-bg-secondary relative select-none overflow-hidden">
          {(() => {
            const allMedia = [
              ...(post.images || []).map(url => ({ url, type: 'image' })),
              ...(post.videos || []).map(url => ({ url, type: 'video' }))
            ];
            
            const count = allMedia.length;
            
            // Layout đặc biệt cho nhiều ảnh giống Facebook/Instagram
            if (count === 1) {
              const item = allMedia[0];
              return (
                <div 
                  className="relative group cursor-pointer bg-black/5 flex items-center justify-center overflow-hidden max-h-[600px]"
                  onClick={() => onViewDetail?.(post)}
                >
                  {/* Blurred Background for Premium Feel */}
                  <div 
                    className="absolute inset-0 scale-110 blur-2xl opacity-30 grayscale pointer-events-none"
                    style={{ backgroundImage: `url(${item.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  />
                  {item.type === 'video' ? (
                    <video 
                      src={item.url} 
                      poster={post.videoThumbnails?.[item.url]}
                      controls 
                      className="relative z-10 w-full h-auto max-h-[600px] object-contain" 
                    />
                  ) : (
                    <img src={item.url} alt="" className="relative z-10 w-full h-auto max-h-[600px] object-contain transition-transform duration-500 group-hover:scale-[1.02]" loading="lazy" />
                  )}
                </div>
              );
            }

            // Grid Layout cho 2 ảnh trở lên
            return (
              <div 
                className={`grid gap-0.5 aspect-[4/3] sm:aspect-video cursor-pointer ${
                  count === 2 ? 'grid-cols-2' : 
                  count === 3 ? 'grid-cols-2 grid-rows-2' : 
                  'grid-cols-2 grid-rows-2'
                }`}
                onClick={() => onViewDetail?.(post)}
              >
                {allMedia.slice(0, 4).map((item, idx) => {
                  // Logic span cho layout 3 ảnh
                  const isLarge = count === 3 && idx === 0;
                  return (
                    <div 
                      key={idx} 
                      className={`relative overflow-hidden bg-bg-tertiary ${isLarge ? 'row-span-2' : ''}`}
                    >
                      {item.type === 'video' ? (
                        <video 
                          src={item.url} 
                          poster={post.videoThumbnails?.[item.url]}
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <img src={item.url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
                      )}
                      
                      {/* Overlay cho ảnh cuối nếu còn ảnh nữa */}
                      {idx === 3 && count > 4 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-2xl font-bold">+{count - 4}</span>
                        </div>
                      )}
                      
                      {/* Video Icon Indicator */}
                      {item.type === 'video' && (
                        <div className="absolute top-2 right-2 p-1 bg-black/20 backdrop-blur-md rounded-full text-white">
                          <IconButton icon={<ChevronRight size={16} fill="white" />} size="sm" className="!bg-transparent" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Thống kê */}
      {(post.reactions && Object.keys(post.reactions).length > 0) || post.commentCount > 0 ? (
        <div className="px-4 py-1 flex justify-between items-center border-b border-border-light min-h-[40px]">
          <div className="flex items-center gap-1.5">
            <ReactionDisplay reactions={post.reactions} variant="minimal" />
          </div>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            {post.commentCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetail?.(post)}
                className="hover:underline hover:!bg-transparent text-text-secondary"
              >
                {post.commentCount} bình luận
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="h-2 border-b border-border-light"></div>
      )}

      {/* Thao tác */}
      <div className="flex px-2 py-1 relative">
        <div 
            className="flex-1 relative group/reaction-btn" 
            onMouseLeave={() => setShowReactions(false)}
        >
          {showReactions && (
            <ReactionSelector 
              className="absolute bottom-full left-0 mb-2 ml-4 transform origin-bottom-left"
              onSelect={(emoji) => {
                onReact(post.id, emoji);
                setShowReactions(false);
              }}
              onClose={() => setShowReactions(false)}
            />
          )}
          <Button
            variant="ghost"
            className={`w-full group ${myReaction ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}
            onClick={() => onReact(post.id, myReaction || '👍')}
            onMouseEnter={() => setShowReactions(true)}
            // onTouchStart={() => setShowReactions(true)} // Handle separate for mobile if needed
          >
            <div className="flex items-center gap-2 transition-transform active:scale-95">
              {myReaction ? <span className="text-xl animate-in zoom-in spin-in-12 duration-300">{myReaction}</span> : <Heart size={20} className="group-hover:scale-110 transition-transform" />}
              <span className={`text-sm font-medium ${myReaction ? `text-${REACTION_LABELS[myReaction]}` : ''}`}>
                {myReaction ? REACTION_LABELS[myReaction] : 'Thích'}
              </span>
            </div>
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={() => onViewDetail?.(post)}
          className="flex-1 text-text-secondary hover:text-primary hover:bg-bg-secondary"
          icon={<MessageCircle size={20} />}
        >
          <span className="text-sm font-medium">Bình luận</span>
        </Button>
      </div>


    </div>
  );
};

// Skeleton loading
const PostSkeleton: React.FC = () => (
  <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light mb-4 transition-theme">
    <div className="p-3 sm:p-4 flex items-start justify-between">
      <div className="flex gap-3">
        <Skeleton variant="circle" width={40} height={40} />
        <div className="space-y-2">
          <Skeleton variant="line" width={128} height={16} />
          <Skeleton variant="line" width={80} height={12} className="opacity-50" />
        </div>
      </div>
    </div>
    <div className="px-3 sm:px-4 pb-3 space-y-2">
      <Skeleton variant="line" width="90%" height={16} className="opacity-70" />
      <Skeleton variant="line" width="60%" height={16} className="opacity-70" />
    </div>
    <div className="w-full h-64 bg-bg-secondary flex items-center justify-center">
      <Skeleton variant="rect" width={48} height={48} className="opacity-20" />
    </div>
    <div className="flex px-2 py-1 border-t border-border-light">
      <div className="flex-1 flex justify-center py-2">
        <Skeleton variant="line" width={64} height={20} className="opacity-50" />
      </div>
      <div className="flex-1 flex justify-center py-2">
        <Skeleton variant="line" width={64} height={20} className="opacity-50" />
      </div>
    </div>
  </div>
);

PostItem.Skeleton = PostSkeleton;
