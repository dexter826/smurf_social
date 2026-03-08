import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Ellipsis, Flag, PenTool, Pencil, Trash2 } from 'lucide-react';
import { UserAvatar, LazyImage, Skeleton, ReactionSelector, ReactionDisplay, ReactionDetailsModal, Dropdown, DropdownItem } from '../../ui';
import { CommentInput } from './CommentInput';
import { Comment, User, ReactionType, ReportType } from '../../../types';
import { formatRelativeTime, formatDateTime } from '../../../utils/dateUtils';
import { TruncatedText } from '../shared';
import { useCommentStore } from '../../../store/commentStore';

interface CommentItemProps {
  comment: Comment;
  postId: string;
  currentUser: User;
  users: Record<string, User>;
  replies: Record<string, Comment[]>;
  hasMoreReply: Record<string, boolean>;
  isLoadingReplyMap: Record<string, boolean>;
  variant?: 'default' | 'cinema';
  postOwnerId?: string;
  activeInputId: string | 'root';
  inputMode: 'comment' | 'reply' | 'edit';
  isReply?: boolean;
  rootAuthorId?: string;
  handleReplyClick: (comment: Comment) => void;
  handleEditClick: (comment: Comment) => void;
  handleCommentSubmit: (content: string, image?: string) => Promise<void>;
  handleDeleteClick: (comment: Comment) => void;
  handleUploadMedia: (file: File) => Promise<string | undefined>;
  loadReplies: (parentId: string) => Promise<void>;
  resetInput: () => void;
  onProfileClick?: () => void;
  openReportModal: (type: ReportType, id: string, userId: string) => void;
  onViewReactions?: (reactions: Record<string, string>) => void;
}

const CommentItemInner: React.FC<CommentItemProps> = ({
  comment,
  postId,
  currentUser,
  users,
  replies,
  hasMoreReply,
  isLoadingReplyMap,
  variant,
  postOwnerId,
  activeInputId,
  inputMode,
  isReply = false,
  rootAuthorId,
  handleReplyClick,
  handleEditClick,
  handleCommentSubmit,
  handleDeleteClick,
  handleUploadMedia,
  loadReplies,
  resetInput,
  onProfileClick,
  openReportModal,
  onViewReactions
}) => {
  const navigate = useNavigate();
  const { reactToComment } = useCommentStore();

  const [showReactions, setShowReactions] = useState(false);
  const [showReactionDetails, setShowReactionDetails] = useState(false);

  const author = users[comment.userId];
  const commentReplies = replies[comment.id] || [];
  const hasMoreR = hasMoreReply[comment.id];
  const isLoadingR = isLoadingReplyMap[comment.id];
  const isEditing = activeInputId === comment.id && inputMode === 'edit';
  const isReplying = activeInputId === comment.id && inputMode === 'reply';

  const onProfileNavigate = useCallback(() => {
    if (comment.userId) {
      onProfileClick?.();
      navigate(`/profile/${comment.userId}`);
    }
  }, [comment.userId, onProfileClick, navigate]);

  const myReaction = comment.myReaction;
  const reactionCount = comment.reactionCount ?? 0;

  const handleReact = useCallback((reaction: string | ReactionType) => {
    reactToComment(postId, comment.id, currentUser.id, reaction, comment.parentId);
    setShowReactions(false);
  }, [postId, comment.id, comment.parentId, currentUser.id, reactToComment]);

  return (
    <div className={`${isReply ? 'ml-2 mt-2' : 'mt-4 px-4'} animate-in fade-in slide-in-from-top-1`}>
      <div className="flex gap-3">
        <UserAvatar userId={comment.userId} src={author?.avatar} name={author?.name} size={isReply ? 'xs' : 'sm'} onClick={onProfileNavigate} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5 group/comment">
            <div className="relative inline-block max-w-full">
              <div className={`
                rounded-2xl px-4 py-2 inline-block max-w-full shadow-sm transition-all
                ${variant === 'cinema' ? 'bg-bg-secondary py-2.5' : 'bg-bg-secondary'}
              `}>
                <div className="flex items-center gap-1.5 mb-1.5 flex-nowrap overflow-hidden">
                  <h4
                    className="font-bold text-[13px] text-text-primary whitespace-nowrap truncate cursor-pointer hover:underline leading-none min-w-0"
                    onClick={onProfileNavigate}
                  >
                    {author?.name 
                      ? author.name 
                      : <Skeleton width={80} height={12} className="opacity-60" />}
                  </h4>
                  {comment.userId === postOwnerId && (
                    <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-md font-bold flex-shrink-0 leading-none mt-[1px] flex items-center gap-0.5">
                      <PenTool size={10} className="stroke-[2.5px]" />
                      Tác giả
                    </span>
                  )}
                  {isReply && comment.replyToUserId && users[comment.replyToUserId] && (comment.replyToUserId !== rootAuthorId || comment.replyToUserId === comment.userId) && (
                    <>
                      <ChevronRight size={12} className="text-text-tertiary flex-shrink-0 mx-0.5" />
                      <h4
                        className="font-bold text-[13px] text-text-primary whitespace-nowrap truncate cursor-pointer hover:underline"
                        onClick={() => {
                          onProfileClick?.();
                          navigate(`/profile/${comment.replyToUserId}`);
                        }}
                      >
                        {users[comment.replyToUserId].name}
                      </h4>
                    </>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-2 min-w-[200px] md:min-w-[300px]">
                    <CommentInput
                      user={currentUser}
                      initialValue={comment.content}
                      initialImage={comment.image}
                      onSubmit={handleCommentSubmit}
                      onCancel={resetInput}
                      onUploadMedia={handleUploadMedia}
                      autoFocus
                    />
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-text-primary mt-1 break-words break-all leading-relaxed">
                      <TruncatedText
                        content={comment.content}
                        threshold={200}
                        expandClassName="text-primary font-bold cursor-pointer hover:underline ml-1.5 transition-all text-[11px] tracking-wider"
                      />
                    </div>
                    {comment.image && (
                      <div className="mt-3 rounded-xl overflow-hidden bg-bg-primary/50">
                        <LazyImage src={comment.image} className="max-h-60 w-full object-contain" alt="attach" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {!isEditing && (
              <div className="flex items-center opacity-0 group-hover/comment:opacity-100 transition-opacity duration-base pt-1.5">
                <Dropdown
                  trigger={
                    <button
                      className="p-1 rounded-full hover:bg-bg-hover transition-all duration-base cursor-pointer text-text-tertiary hover:text-text-primary"
                      title="Tùy chọn"
                    >
                      <Ellipsis size={16} />
                    </button>
                  }
                  align="right"
                  menuClassName="z-[var(--z-popover)]"
                >
                  {comment.userId === currentUser.id ? (
                    <>
                      <DropdownItem icon={<Pencil size={14} />} label="Chỉnh sửa" onClick={() => handleEditClick(comment)} />
                      <DropdownItem icon={<Trash2 size={14} />} label="Xóa" variant="danger" onClick={() => handleDeleteClick(comment)} />
                    </>
                  ) : (
                    <DropdownItem icon={<Flag size={14} />} label="Báo cáo" onClick={() => openReportModal(ReportType.COMMENT, comment.id, comment.userId)} />
                  )}
                </Dropdown>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="flex items-center gap-4 mt-1 ml-2 text-[11px] text-text-tertiary font-bold h-5 leading-none">
              <span title={formatDateTime(comment.createdAt)}>{formatRelativeTime(comment.createdAt)}</span>
              <div className="relative group/reaction-btn"
                onMouseLeave={() => setShowReactions(false)}>
                {showReactions && (
                  <ReactionSelector
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5"
                    size="sm"
                    autoClose={false}
                    onSelect={handleReact}
                    onClose={() => setShowReactions(false)}
                  />
                )}
                <button
                  onMouseEnter={() => setShowReactions(true)}
                  onClick={() => handleReact(myReaction ? 'REMOVE' : 'LIKE')}
                  className={`hover:underline active:underline transition-all duration-base cursor-pointer ${myReaction ? 'text-primary' : ''}`}
                >
                  Thích
                </button>
              </div>
              <button onClick={() => handleReplyClick(comment)} className="hover:underline active:underline transition-all duration-base cursor-pointer">Trả lời</button>
              {reactionCount > 0 && (
                <ReactionDisplay
                  reactionSummary={comment.reactionSummary}
                  reactionCount={reactionCount}
                  variant="minimal"
                  onClick={() => setShowReactionDetails(true)}
                />
              )}
            </div>
          )}

          {isReplying && (
            <div className="mt-3 pl-2">
              <CommentInput
                user={currentUser}
                placeholder={`Trả lời ${author?.name}...`}
                onSubmit={handleCommentSubmit}
                onCancel={resetInput}
                onUploadMedia={handleUploadMedia}
                autoFocus
              />
            </div>
          )}

          {!isReply && ((comment.replyCount || 0) > 0 || commentReplies.length > 0) && (
            <div className="mt-2 pl-2 border-l-2 border-border-light ml-2">
              {commentReplies.length === 0 ? (
                (comment.replyCount || 0) > 0 && (
                  <button onClick={() => loadReplies(comment.id)} className="flex items-center gap-1.5 text-text-secondary hover:text-primary text-[12px] font-bold py-1 px-2">
                    <ChevronDown size={14} className="stroke-[3px]" /> Xem {comment.replyCount} trả lời
                  </button>
                )
              ) : (
                <>
                  <div className="space-y-1">
                    {commentReplies.map(reply => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        postId={postId}
                        currentUser={currentUser}
                        users={users}
                        replies={replies}
                        hasMoreReply={hasMoreReply}
                        isLoadingReplyMap={isLoadingReplyMap}
                        variant={variant}
                        postOwnerId={postOwnerId}
                        activeInputId={activeInputId}
                        inputMode={inputMode}
                        isReply
                        rootAuthorId={comment.userId}
                        handleReplyClick={handleReplyClick}
                        handleEditClick={handleEditClick}
                        handleCommentSubmit={handleCommentSubmit}
                        handleDeleteClick={handleDeleteClick}
                        handleUploadMedia={handleUploadMedia}
                        loadReplies={loadReplies}
                        resetInput={resetInput}
                        onProfileClick={onProfileClick}
                        openReportModal={openReportModal}
                        onViewReactions={onViewReactions}
                      />
                    ))}
                  </div>
                  {hasMoreR && (
                    <button
                      onClick={() => loadReplies(comment.id)}
                      className="text-primary hover:underline text-[10px] font-bold ml-10 mt-2 tracking-wider transition-all"
                      disabled={isLoadingR}
                    >
                      {isLoadingR ? 'Đang tải...' : `Xem thêm ${Math.max(0, (comment.replyCount || 0) - commentReplies.length)} trả lời`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showReactionDetails && reactionCount > 0 && (
        <ReactionDetailsModal
          isOpen={showReactionDetails}
          onClose={() => setShowReactionDetails(false)}
          sourceId={comment.id}
          sourceType="comment"
          currentUserId={currentUser.id}
          context="POST"
          friendsIds={currentUser.friendIds || []}
        />
      )}
    </div>
  );
};

export const CommentItem = React.memo(CommentItemInner);
