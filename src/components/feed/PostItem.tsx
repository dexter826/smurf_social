import React, { useCallback } from 'react';
import { MoreHorizontal, Edit, Trash2, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime, formatDateTime } from '../../utils/dateUtils';
import { UserAvatar, Skeleton, Dropdown, DropdownItem, IconButton } from '../ui';
import { Post, PostStatus, Visibility, PostType, User, ReportType, ReactionType } from '../../../shared/types';
import { useReportStore } from '../../store/reportStore';
import { usePostStore } from '../../store';
import { useFriendIds, useFilteredReactions } from '../../hooks';
import { VisibilityBadge, TruncatedText, ReactionActions, PostMediaGrid, SystemPostMedia } from './shared';
import { ReactionDetailsModal } from '../ui';

interface PostItemProps {
  post: Post;
  author: User;
  currentUser: User;
  onReact: (postId: string, reaction: ReactionType | 'REMOVE') => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onViewDetail?: (post: Post) => void;
  onProfileClick?: () => void;
}

const PostItemInner: React.FC<PostItemProps> = ({
  post,
  author,
  currentUser,
  onReact: onReactProp,
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

  const isOwner = post.authorId === currentUser.id;

  const { filteredSummary, filteredCount, currentUserReaction } = useFilteredReactions(
    post.id,
    'post',
    post.authorId,
    post.reactionCount
  );

  const displayReaction = currentUserReaction;

  const hasMedia = (post.media?.length ?? 0) > 0;

  const handleProfileClick = useCallback(() => {
    if (author?.id) {
      onProfileClick?.();
      navigate(`/profile/${author.id}`);
    }
  }, [author?.id, onProfileClick, navigate]);

  const handleViewDetail = useCallback(() => onViewDetail?.(post), [onViewDetail, post]);
  const handleOpenReactions = useCallback(() => setIsReactionsModalOpen(true), []);
  const handleCloseReactions = useCallback(() => setIsReactionsModalOpen(false), []);

  const onReact = (type: ReactionType | 'REMOVE') => {
    onReactProp(post.id, type);
  };

  const isSystemPost = post.type === PostType.AVATAR_UPDATE || post.type === PostType.COVER_UPDATE;

  return (
    <div className="bg-bg-primary border border-border-light sm:rounded-xl overflow-hidden transition-theme group/post animate-in fade-in duration-base mb-4">
      <div className="flex items-center px-4 py-3 gap-3">
        <UserAvatar
          userId={author?.id}
          src={author?.avatar?.url}
          name={author?.fullName}
          size="md"
          initialStatus={author?.status}
          onClick={handleProfileClick}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4
              className="font-bold text-text-primary text-[15px] hover:underline cursor-pointer truncate"
              onClick={handleProfileClick}
            >
              {author?.fullName || 'Người dùng'}
            </h4>
            {post.type === PostType.AVATAR_UPDATE && (
              <span className="text-[14px] text-text-secondary font-normal">vừa cập nhật ảnh đại diện mới.</span>
            )}
            {post.type === PostType.COVER_UPDATE && (
              <span className="text-[14px] text-text-secondary font-normal">vừa cập nhật ảnh bìa mới.</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[12px] text-text-tertiary mt-0.5">
            <span title={formatDateTime(post.createdAt)}>
              {formatRelativeTime(post.createdAt)}
            </span>
            <span className="opacity-40">•</span>
            <VisibilityBadge visibility={post.visibility} size={12} />
          </div>
        </div>

        {isOwner ? (
          <Dropdown
            trigger={<IconButton icon={<MoreHorizontal size={18} />} size="md" className="min-w-[44px] min-h-[44px]" />}
          >
            <DropdownItem
              icon={<Edit size={16} />}
              label={isSystemPost ? "Chỉnh sửa quyền riêng tư" : "Chỉnh sửa"}
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
              onClick={() => openReportModal(ReportType.POST, post.id, post.authorId)}
            />
          </Dropdown>
        )}
      </div>

      {!isSystemPost && post.content && (
        <div className="px-4 pb-3 relative w-full overflow-hidden">
          <p className="text-text-primary whitespace-pre-line break-words break-all text-[15px] leading-relaxed w-full">
            <TruncatedText content={post.content} threshold={300} />
          </p>

          {error && (
            <div className="mt-2 p-2 bg-error-light dark:bg-error/10 border border-error/20 rounded-lg">
              <span className="text-xs text-error font-medium">{error}</span>
            </div>
          )}
        </div>
      )}

      {!isSystemPost ? (
        <PostMediaGrid
          media={post.media || []}
          onClick={handleViewDetail}
          uploadProgress={uploadState?.progress}
        />
      ) : (
        <SystemPostMedia 
          type={post.type as PostType.AVATAR_UPDATE | PostType.COVER_UPDATE}
          media={post.media || []}
          onClick={handleViewDetail}
        />
      )}

      <ReactionActions
        reactionSummary={filteredSummary}
        reactionCount={filteredCount}
        myReaction={displayReaction}
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
        authorId={post.authorId}
        context="POST"
        friendsIds={friendIds}
        initialCount={post.reactionCount}
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
