import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, MoreHorizontal, Edit, Trash2, Flag } from 'lucide-react';
import { UserAvatar, IconButton, Modal, Dropdown, DropdownItem, Skeleton, ReactionDetailsModal } from '../../ui';
import { Post, User, ReportType, ReactionType, PostType } from '../../../../shared/types';
import { CommentSection } from '../comment/CommentSection';
import { formatRelativeTime, formatDateTime } from '../../../utils/dateUtils';
import { useReportStore } from '../../../store/reportStore';
import { usePostStore } from '../../../store/postStore';
import { useFriendIds, useFilteredReactions } from '../../../hooks';
import { VisibilityBadge, TruncatedText, ReactionActions, PostMediaGrid } from '../shared';
import { MediaViewer } from '../../ui';

interface PostViewModalProps {
  post: Post | null;
  author: User | null;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onReact: (postId: string, reaction: ReactionType | 'REMOVE') => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  isLoading?: boolean;
}

export const PostViewModal: React.FC<PostViewModalProps> = ({
  post,
  author,
  currentUser,
  isOpen,
  onClose,
  onReact,
  onEdit,
  onDelete,
  isLoading
}) => {
  const navigate = useNavigate();
  const { openReportModal } = useReportStore();
  const friendIds = useFriendIds();
  const myReaction = usePostStore(state => state.myPostReactions[post?.id || '']);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [isReactionsModalOpen, setIsReactionsModalOpen] = useState(false);

  const { filteredSummary, filteredCount } = useFilteredReactions(
    post?.id || '',
    'post',
    post?.authorId || ''
  );

  const handleProfileClick = useCallback(() => {
    if (author?.id) {
      onClose();
      navigate(`/profile/${author.id}`);
    }
  }, [author?.id, onClose, navigate]);

  // Reset trạng thái khi đổi bài viết
  React.useEffect(() => {
    if (isOpen) {
      setActiveMediaIndex(0);
    }
  }, [isOpen, post?.id]);

  const allMedia = useMemo(() => {
    if (!post) return [];
    return (post.media || []).map(m => ({
      url: m.url,
      type: m.mimeType.startsWith('video/') ? 'video' as const : 'image' as const,
      thumbnail: m.thumbnailUrl
    }));
  }, [post?.media]);

  if (!isOpen) return null;

  const shouldShowSkeleton = !post || isLoading;
  const isCinema = post ? (post.media?.length ?? 0) > 0 : false;

  if (shouldShowSkeleton) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        showHeader={false}
        maxWidth={isCinema ? 'full' : '2xl'}
        padding="none"
        fullScreen={isCinema ? true : 'mobile'}
        className="transition-all duration-base overflow-hidden"
        bodyClassName={`overflow-hidden flex flex-col h-full ${isCinema ? 'lg:flex-row' : ''}`}
      >
        {/* Skeleton cho phần Media (Cinema) */}
        {isCinema && (
          <div className="hidden lg:flex flex-[1.6] bg-[#0a0c10] items-center justify-center border-r border-white/5 shrink-0">
            <Skeleton className="w-[80%] aspect-video rounded-xl opacity-10" />
          </div>
        )}

        {/* Skeleton cho phần Content Panel */}
        <div className={`flex flex-col bg-bg-primary shrink-0 transition-theme ${isCinema ? 'h-full w-full lg:w-[460px] flex-1 lg:flex-none' : 'w-full h-auto'}`}>
          {/* Header Skeleton */}
          <div className="w-full p-4 md:p-5 border-b border-border-light flex items-center shrink-0">
            <div className="flex gap-3 items-center flex-1">
              <Skeleton variant="circle" width={42} height={42} />
              <div className="space-y-1.5 mt-0.5">
                <Skeleton width={140} height={16} />
                <Skeleton width={80} height={12} />
              </div>
            </div>
            <div className="flex gap-1 ml-auto">
              <Skeleton variant="circle" width={32} height={32} />
              <Skeleton variant="circle" width={32} height={32} />
            </div>
          </div>

          {/* Body Skeleton */}
          <div className="flex-1 overflow-hidden">
            <div className="p-5 md:p-6 space-y-3">
              <Skeleton width="100%" height={16} />
              <Skeleton width="100%" height={16} />
              <Skeleton width="70%" height={16} />
            </div>

            {/* Stats & Actions Skeleton */}
            <div className="mt-4">
              <div className="px-5 md:px-6 py-4 flex justify-between items-center border-b border-border-light/60">
                <Skeleton width={120} height={14} />
                <Skeleton width={60} height={14} />
              </div>
              <div className="flex px-5 py-3 gap-8">
                <Skeleton width={80} height={20} />
                <Skeleton width={80} height={20} />
              </div>
            </div>

            {/* Comment Section Skeleton */}
            <div className="p-5 md:p-6 space-y-6 mt-2 opacity-50">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton variant="circle" width={32} height={32} />
                  <div className="space-y-2 flex-1">
                    <Skeleton width="40%" height={14} />
                    <Skeleton width="90%" height={12} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  const isOwner = post.authorId === currentUser.id;
  const hasMedia = allMedia.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showHeader={false}
      maxWidth={hasMedia ? 'full' : '2xl'}
      padding="none"
      fullScreen={hasMedia ? true : 'mobile'}
      className={`
        transition-all duration-base overflow-hidden
      `}
      bodyClassName={`overflow-hidden flex flex-col ${hasMedia ? 'lg:flex-row h-full' : 'h-auto max-h-[90vh]'}`}
    >

      {/* Khong gian Cinema cho Media (Desktop) */}
      {hasMedia && (
        <div className="hidden lg:flex flex-[1.6] bg-[#0a0c10] items-center justify-center relative group select-none overflow-hidden touch-none grow shrink-0 border-r border-white/5">
          <div className="w-full h-full relative z-10 flex items-center justify-center">
            {/* Media Content */}
            <div className="w-full h-full flex items-center justify-center">
              {!allMedia[activeMediaIndex] ? (
                <div className="text-white/40">Không tìm thấy nội dung</div>
              ) : allMedia[activeMediaIndex].type === 'video' ? (
                <video
                  src={allMedia[activeMediaIndex].url}
                  poster={allMedia[activeMediaIndex].thumbnail}
                  controls
                  playsInline
                  preload="none"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <img
                  src={allMedia[activeMediaIndex].url}
                  alt=""
                  className="max-w-full max-h-full object-contain animate-in fade-in zoom-in-95 duration-base"
                  onClick={() => setIsMediaViewerOpen(true)}
                />
              )}
            </div>

            {/* Overlay Navigation (Desktop) */}
            {allMedia.length > 1 && (
              <>
                {/* Nut chuyen anh - Trai */}
                <div className="absolute inset-y-0 left-0 w-24 flex items-center justify-start pl-4 z-30 pointer-events-none">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMediaIndex(prev => (prev === 0 ? allMedia.length - 1 : prev - 1));
                    }}
                    className={`
                        w-12 h-12 flex items-center justify-center 
                        bg-black/20 hover:bg-black/50 backdrop-blur-md text-white 
                        rounded-full border border-white/20 shadow-xl outline-none
                        transition-all duration-base pointer-events-auto
                        active:scale-95
                      `}
                  >
                    <ChevronLeft size={32} strokeWidth={2.5} className="pointer-events-none" />
                  </button>
                </div>

                {/* Nut chuyen anh - Phai */}
                <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-end pr-4 z-30 pointer-events-none">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMediaIndex(prev => (prev === allMedia.length - 1 ? 0 : prev + 1));
                    }}
                    className={`
                        w-12 h-12 flex items-center justify-center 
                        bg-black/20 hover:bg-black/50 backdrop-blur-md text-white 
                        rounded-full border border-white/20 shadow-xl outline-none
                        transition-all duration-base pointer-events-auto
                        active:scale-95
                      `}
                  >
                    <ChevronRight size={32} strokeWidth={2.5} className="pointer-events-none" />
                  </button>
                </div>

                {/* Bo dem Media */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-full border border-white/10 text-white/90 text-[13px] font-medium tracking-wide shadow-lg pointer-events-none">
                  {activeMediaIndex + 1} / {allMedia.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Panel noi dung va tuong tac */}
      <div className={`flex flex-col bg-bg-primary transition-theme relative z-10 overflow-hidden ${hasMedia ? 'h-full w-full lg:w-[460px] lg:border-l border-border-light flex-1 lg:flex-none' : 'w-full h-auto'}`}>

        <div className="w-full p-4 md:p-5 border-b border-border-light flex items-center shrink-0 bg-bg-primary z-30">
          <div className="flex gap-3 items-center flex-1 min-w-0">
            <UserAvatar
              userId={author?.id}
              src={author?.avatar.url}
              name={author?.fullName}
              size="md"
              initialStatus={author?.status}
              onClick={handleProfileClick}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3
                  className="font-bold text-text-primary text-[15px] cursor-pointer hover:underline transition-all duration-base"
                  onClick={handleProfileClick}
                >
                  {author?.fullName || 'Unknown User'}
                </h3>
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
                <VisibilityBadge visibility={post.visibility} size={13} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {isOwner ? (
              <Dropdown
                trigger={<IconButton icon={<MoreHorizontal size={20} />} size="md" variant="ghost" />}
              >
                <DropdownItem icon={<Edit size={18} />} label="Chỉnh sửa bài viết" onClick={() => onEdit?.(post.id)} />
                <DropdownItem icon={<Trash2 size={18} />} label="Xóa bài viết" variant="danger" onClick={() => onDelete?.(post.id)} />
              </Dropdown>
            ) : (
              <Dropdown
                trigger={<IconButton icon={<MoreHorizontal size={20} />} size="md" variant="ghost" />}
              >
                <DropdownItem
                  icon={<Flag size={18} />}
                  label="Báo cáo bài viết"
                  variant="danger"
                  onClick={() => openReportModal(ReportType.POST, post.id, post.authorId)}
                />
              </Dropdown>
            )}
            <IconButton
              icon={<X size={20} />}
              onClick={onClose}
              variant="ghost"
            />
          </div>
        </div>

        <CommentSection
          postId={post.id}
          currentUser={currentUser}
          variant="cinema"
          autoFocus={true}
          className="flex-1 min-h-0"
          onProfileClick={onClose}
          postOwnerId={post.authorId}
          totalCommentCount={post.commentCount}
          header={
            <div className="flex flex-col">
              {/* Media Grid cho Mobile */}
              {hasMedia && (
                <div className="lg:hidden w-full">
                  <PostMediaGrid
                    media={post.media || []}
                    onItemClick={(index) => {
                      setActiveMediaIndex(index);
                      setIsMediaViewerOpen(true);
                    }}
                  />
                </div>
              )}

              {/* Noi dung van ban */}
              {(post.type === PostType.REGULAR || post.content) && post.type === PostType.REGULAR && (
                <div className="px-5 md:px-6 py-4 pb-3 w-full overflow-hidden">
                  <p className="text-text-primary whitespace-pre-line break-words break-all text-[15px] md:text-[16px] leading-[1.6] w-full">
                    <TruncatedText content={post.content} threshold={300} />
                  </p>
                </div>
              )}

              <ReactionActions
                reactionSummary={filteredSummary}
                reactionCount={filteredCount}
                myReaction={myReaction}
                commentCount={post.commentCount}
                onReact={(type) => onReact(post.id, type)}
                onViewReactions={() => setIsReactionsModalOpen(true)}
                statsClassName="px-5 md:px-6 py-4 flex justify-between items-center border-b border-border-light/60"
                actionClassName="flex px-2 py-1 border-b border-border-light relative"
                selectorClassName="z-[var(--z-popover)]"
                selectorPosition="bottom"
              />
            </div>
          }
        />
      </div>
      <ReactionDetailsModal
        isOpen={isReactionsModalOpen}
        onClose={() => setIsReactionsModalOpen(false)}
        sourceId={post.id}
        sourceType="post"
        currentUserId={currentUser.id}
        authorId={post.authorId}
        context="POST"
        friendsIds={friendIds}
      />
      <MediaViewer
        media={allMedia}
        initialIndex={activeMediaIndex}
        isOpen={isMediaViewerOpen}
        onClose={() => setIsMediaViewerOpen(false)}
      />
    </Modal>
  );
};
