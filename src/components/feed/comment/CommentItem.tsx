import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Flag, PenTool } from 'lucide-react';
import { UserAvatar, LazyImage } from '../../ui';
import { CommentInput } from './CommentInput';
import { Comment, User, ReportType } from '../../../types';
import { formatRelativeTime, formatDateTime } from '../../../utils/dateUtils';
import { TruncatedText } from '../shared';

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
  openReportModal
}) => {
  const navigate = useNavigate();
  
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

  return (
    <div className={`${isReply ? 'ml-2 mt-2' : 'mt-4 px-4'} animate-in fade-in slide-in-from-top-1`}>
      <div className="flex gap-3">
        <UserAvatar userId={comment.userId} src={author?.avatar} name={author?.name} size={isReply ? 'xs' : 'sm'} onClick={onProfileNavigate} />
        <div className="flex-1 min-w-0">
          <div className={`
            rounded-2xl px-4 py-2 inline-block max-w-full shadow-sm transition-all group
            ${variant === 'cinema' ? 'bg-bg-secondary py-2.5' : 'bg-bg-secondary'}
          `}>
            <div className="flex items-center gap-1.5 mb-1.5 flex-nowrap overflow-hidden">
              <h4
                className="font-bold text-[13px] text-text-primary whitespace-nowrap truncate cursor-pointer hover:underline leading-none min-w-0"
                onClick={onProfileNavigate}
              >
                {author?.name || 'Người dùng'}
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

          {!isEditing && (
            <div className="flex items-center gap-4 mt-1 ml-2 text-[11px] text-text-tertiary font-bold">
              <span title={formatDateTime(comment.createdAt)}>{formatRelativeTime(comment.createdAt)}</span>
              <button onClick={() => handleReplyClick(comment)} className="hover:text-primary active:text-primary transition-colors cursor-pointer">Trả lời</button>
              {comment.userId === currentUser.id ? (
                <>
                  <button onClick={() => handleEditClick(comment)} className="hover:text-primary active:text-primary transition-colors cursor-pointer">Chỉnh sửa</button>
                  <button onClick={() => handleDeleteClick(comment)} className="text-error/70 hover:text-error transition-colors cursor-pointer">Xóa</button>
                </>
              ) : (
                <button
                  onClick={() => openReportModal(ReportType.COMMENT, comment.id, comment.userId)}
                  className="text-text-tertiary hover:text-error transition-colors cursor-pointer flex items-center gap-0.5"
                >
                  <Flag size={10} /> Báo cáo
                </button>
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
    </div>
  );
};

export const CommentItem = React.memo(CommentItemInner);
