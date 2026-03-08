import React, { useCallback } from 'react';
import { MoreHorizontal, Edit, Trash2, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime, formatDateTime } from '../../utils/dateUtils';
import { UserAvatar, Skeleton, Dropdown, DropdownItem, IconButton } from '../ui';
import { Post, User, ReportType, PostType } from '../../types';
import { useReportStore } from '../../store/reportStore';
import { usePostStore } from '../../store/postStore';
import { useFriendIds } from '../../hooks';
import { VisibilityBadge, TruncatedText, ReactionActions, PostMediaGrid } from './shared';
import { ReactionDetailsModal } from '../ui';

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

const PostItemInner: React.FC<PostItemProps> = ({
  post,
  author,
  currentUser,
  onReact,
  onEdit,
  onDelete,
  onViewDetail,
  onProfileClick
}) => {
  const [isReactionsModalOpen, setIsReactionsModalOpen] = React.useState(false);
  const navigate = useNavigate();
  const { openReportModal } = useReportStore();

  const { uploadingStates } = usePostStore();
  const friendIds = useFriendIds();
  const uploadState = uploadingStates[post.id];
  const isUploading = !!uploadState && !uploadState.error;
  const error = uploadState?.error;
  const progress = uploadState?.progress || 0;

  const myReaction = usePostStore(state => state.myPostReactions[post.id]);
  const isOwner = post.userId === currentUser.id;

  const hasMedia = (post.images?.length ?? 0) > 0 || (post.videos?.length ?? 0) > 0;

  const handleProfileClick = useCallback(() => {
    if (author?.id) {
      onProfileClick?.();
      navigate(`/profile/${author.id}`);
    }
  }, [author?.id, onProfileClick, navigate]);

  const handleViewDetail = useCallback(() => onViewDetail?.(post), [onViewDetail, post]);
  const handleOpenReactions = useCallback(() => setIsReactionsModalOpen(true), []);
  const handleCloseReactions = useCallback(() => setIsReactionsModalOpen(false), []);

  return (
    <div className="bg-bg-primary rounded-xl shadow-sm border-2 border-border-light overflow-hidden mb-4 transition-all duration-base relative">

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
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3
                className="font-semibold text-text-primary text-[15px] cursor-pointer hover:underline"
                onClick={handleProfileClick}
              >
                {author?.name || 'Unknown User'}
              </h3>
              {post.type && post.type !== PostType.NORMAL && (
                <span className="text-[14px] text-text-secondary font-normal">
                  {post.content}
                </span>
              )}
              {isUploading && !hasMedia && (
                <span className="text-xs text-info font-medium">
                  Đang đăng...
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
              <span title={formatDateTime(post.createdAt)}>
                {formatRelativeTime(post.createdAt)}
              </span>
              <span>•</span>
              <VisibilityBadge visibility={post.visibility} size={12} />
            </div>
          </div>
        </div>

        {isOwner ? (
          <Dropdown
            trigger={<IconButton icon={<MoreHorizontal size={18} />} size="md" className="min-w-[44px] min-h-[44px]" />}
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
            trigger={<IconButton icon={<MoreHorizontal size={18} />} size="md" className="min-w-[44px] min-h-[44px]" />}
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

      {(!post.type || post.type === PostType.NORMAL) && (
        <div
          className="px-4 pb-3 relative"
        >
          <p className="text-text-primary whitespace-pre-line text-[15px] leading-relaxed">
            <TruncatedText content={post.content} threshold={300} />
          </p>

          {/* Hiển thị lỗi tải lên */}
          {error && (
            <div className="mt-2 p-2 bg-error-light dark:bg-error/10 border border-error/20 rounded-lg">
              <span className="text-xs text-error font-medium">{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Vẫn hiển thị lỗi nếu có, kể cả khi ẩn content */}
      {(post.type && post.type !== PostType.NORMAL && error) && (
        <div className="px-4 pb-3">
          <div className="p-2 bg-error-light dark:bg-error/10 border border-error/20 rounded-lg">
            <span className="text-xs text-error font-medium">{error}</span>
          </div>
        </div>
      )}

      <PostMediaGrid
        images={post.images}
        videos={post.videos}
        videoThumbnails={post.videoThumbnails}
        onClick={handleViewDetail}
        uploadProgress={uploadState?.progress}
      />

      <ReactionActions
        postId={post.id}
        reactionSummary={post.reactionSummary}
        reactionCount={post.reactionCount}
        myReaction={myReaction}
        commentCount={post.commentCount}
        onReact={onReact}
        onCommentClick={handleViewDetail}
        onViewReactions={handleOpenReactions}
        showEmptyDivider
      />

      <ReactionDetailsModal
        isOpen={isReactionsModalOpen}
        onClose={handleCloseReactions}
        sourceId={post.id}
        sourceType="post"
        currentUserId={currentUser.id}
        context="POST"
        friendsIds={friendIds}
      />
    </div>
  );
};

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

export const PostItem: React.FC<PostItemProps> & { Skeleton: React.FC } = Object.assign(
  React.memo(PostItemInner),
  { Skeleton: PostSkeleton }
);
