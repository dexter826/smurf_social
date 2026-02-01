import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Flag, X } from 'lucide-react';
import { UserAvatar, Button, ConfirmDialog } from '../ui';
import { toast } from '../../store/toastStore';
import { Comment, User, ReportType } from '../../types';
import { postService } from '../../services/postService';
import { useCommentStore } from '../../store/commentStore';
import { useUserCache } from '../../store/userCacheStore';
import { useReportStore } from '../../store/reportStore';
import { CommentSkeleton } from './CommentSkeleton';
import { formatRelativeTime, formatDateTime } from '../../utils/dateUtils';
import { CommentInput } from './CommentInput';


interface CommentSectionProps {
  postId: string;
  currentUser: User;
  header?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'cinema';
  autoFocus?: boolean;
  onProfileClick?: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  currentUser,
  header,
  className = '',
  variant = 'default',
  autoFocus = false,
  onProfileClick
}) => {
  const {
    rootComments,
    replies,
    hasMoreRoot,
    hasMoreReply,
    isLoading,
    fetchRootComments,
    fetchReplies,
    addComment,
    updateComment,
    deleteComment,
    clearComments
  } = useCommentStore();

  const { users, fetchUsers } = useUserCache();
  const { openReportModal } = useReportStore();

  const [isLoadingReplyMap, setIsLoadingReplyMap] = useState<Record<string, boolean>>({});

  const [activeInputId, setActiveInputId] = useState<string | 'root'>('root');
  const [inputMode, setInputMode] = useState<'comment' | 'reply' | 'edit'>('comment');

  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);

  const navigate = useNavigate();

  const currentRootComments = rootComments[postId] || [];
  const currentHasMoreRoot = hasMoreRoot[postId] ?? false;

  useEffect(() => {
    loadInitialRootComments();
    return () => {
      resetInput();
    };
  }, [postId]);

  // Tải thông tin người dùng cho bình luận hiện tại
  useEffect(() => {
    if (currentRootComments.length > 0) {
      const userIds = [...new Set(currentRootComments.map(c => c.userId))];
      fetchUsers(userIds);
    }
  }, [currentRootComments, fetchUsers]);

  const loadInitialRootComments = async () => {
    await fetchRootComments(postId);
  };

  const loadMoreRootComments = async () => {
    await fetchRootComments(postId, true);
  };

  const loadReplies = async (parentId: string, isInitial = true) => {
    if (isLoadingReplyMap[parentId]) return;
    setIsLoadingReplyMap(prev => ({ ...prev, [parentId]: true }));
    try {
      await fetchReplies(postId, parentId, !isInitial);
      // Fetch user data cho replies
      const parentReplies = replies[postId]?.[parentId] || [];
      const userIds = [...new Set(parentReplies.map(r => r.userId))];
      if (userIds.length > 0) {
        await fetchUsers(userIds);
      }
      // Fetch replyToUser nếu có
      const replyToUserIds = parentReplies.map(r => r.replyToUserId).filter(id => !!id) as string[];
      if (replyToUserIds.length > 0) {
        await fetchUsers([...new Set(replyToUserIds)]);
      }
    } finally {
      setIsLoadingReplyMap(prev => ({ ...prev, [parentId]: false }));
    }
  };

  const handleReplyClick = (comment: Comment) => {
    setReplyingTo(comment);
    setEditingComment(null);
    setActiveInputId(comment.id);
    setInputMode('reply');
  };

  const handleEditClick = (comment: Comment) => {
    setEditingComment(comment);
    setReplyingTo(null);
    setActiveInputId(comment.id);
    setInputMode('edit');
  };

  const resetInput = () => {
    setReplyingTo(null);
    setEditingComment(null);
    setActiveInputId('root');
    setInputMode('comment');
  };

  const handleCommentSubmit = async (content: string, image?: string, video?: string) => {
    try {
      if (inputMode === 'edit' && editingComment) {
        await updateComment(postId, editingComment.id, content, editingComment.parentId, image, video);
        toast.success('Đã cập nhật bình luận');
      } else {
        const parentId = replyingTo ? (replyingTo.parentId || replyingTo.id) : null;
        await addComment(
          postId,
          currentUser.id,
          content,
          parentId,
          replyingTo?.userId,
          image,
          video
        );
        toast.success('Đã gửi bình luận');
      }
      resetInput();
    } catch (error) {
      toast.error(inputMode === 'edit' ? "Lỗi cập nhật" : "Lỗi khi gửi");
      throw error;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!commentToDelete) return;
    try {
      await deleteComment(postId, commentToDelete.id, commentToDelete.parentId);
      setCommentToDelete(null);
      toast.success('Đã xóa bình luận');
    } catch (error) {
      toast.error("Lỗi xóa bình luận");
    }
  };

  const formatSimplifiedTime = (date: Date) => {
    return formatRelativeTime(date);
  };

  const renderCommentContent = (comment: Comment) => {
    return (
      <div className="text-sm text-text-primary mt-1 break-words leading-relaxed flex flex-wrap items-center gap-1">
        <span>{comment.content}</span>
      </div>
    );
  };

  const handleUploadMedia = async (file: File) => {
    if (file.type.startsWith('image/')) {
      return await postService.uploadCommentImage(file, currentUser.id);
    } else {
      return await postService.uploadCommentVideo(file, currentUser.id);
    }
  };

  const renderCommentItem = (comment: Comment, isReply = false) => {
    const author = users[comment.userId];
    const commentReplies = replies[postId]?.[comment.id] || [];
    const hasMoreR = hasMoreReply[postId]?.[comment.id];
    const isLoadingR = isLoadingReplyMap[comment.id];
    const isEditing = activeInputId === comment.id && inputMode === 'edit';
    const isReplying = activeInputId === comment.id && inputMode === 'reply';

    const handleProfileClick = () => {
      if (comment.userId) {
        onProfileClick?.();
        navigate(`/profile/${comment.userId}`);
      }
    };

    return (
      <div key={comment.id} className={`${isReply ? 'ml-2 mt-2' : 'mt-4 px-4'} animate-in fade-in slide-in-from-top-1`}>
        <div className="flex gap-3">
          <UserAvatar userId={comment.userId} src={author?.avatar} name={author?.name} size={isReply ? 'xs' : 'sm'} onClick={handleProfileClick} />
          <div className="flex-1 min-w-0">
            <div className={`
              rounded-2xl px-4 py-2 inline-block max-w-full shadow-sm transition-all group
              ${variant === 'cinema' ? 'bg-bg-secondary py-2.5' : 'bg-bg-secondary'}
            `}>
              <div className="flex items-center gap-1 mb-0.5 flex-nowrap overflow-hidden">
                <h4
                  className="font-bold text-[13px] text-text-primary whitespace-nowrap cursor-pointer hover:underline"
                  onClick={handleProfileClick}
                >
                  {author?.name || 'Người dùng'}
                </h4>
                {isReply && comment.replyToUserId && users[comment.replyToUserId] && (
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
                     initialVideo={comment.video}
                     onSubmit={handleCommentSubmit}
                     onCancel={resetInput}
                     onUploadMedia={handleUploadMedia}
                     autoFocus
                   />
                 </div>
              ) : (
                <>
                  {renderCommentContent(comment)}
                  {(comment.image || comment.video) && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-border-light/50 bg-bg-primary/50">
                      {comment.image && <img src={comment.image} className="max-h-60 w-full object-contain" alt="attach" />}
                      {comment.video && <video src={comment.video} controls className="max-h-60 w-full" />}
                    </div>
                  )}
                </>
              )}
            </div>

            {!isEditing && (
              <div className="flex items-center gap-4 mt-1 ml-2 text-[11px] text-text-tertiary font-bold">
                <span title={formatDateTime(comment.timestamp)}>{formatRelativeTime(comment.timestamp)}</span>
                <button onClick={() => handleReplyClick(comment)} className="hover:text-primary transition-colors cursor-pointer">Trả lời</button>
                {comment.userId === currentUser.id ? (
                  <>
                    <button onClick={() => handleEditClick(comment)} className="hover:text-primary transition-colors cursor-pointer">Chỉnh sửa</button>
                    <button onClick={() => setCommentToDelete(comment)} className="text-error/70 hover:text-error transition-colors cursor-pointer">Xóa</button>
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
                    <div className="space-y-1">{commentReplies.map(reply => renderCommentItem(reply, true))}</div>
                    {hasMoreR && (
                      <button onClick={() => loadReplies(comment.id, false)} className="text-text-secondary hover:text-primary text-[11px] font-bold ml-10 mt-2" disabled={isLoadingR}>
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

  return (
    <div className={`flex flex-col min-h-0 transition-all duration-300 ${className} ${!header ? 'border-t border-border-light bg-bg-secondary/20' : 'h-full bg-bg-primary'}`}>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {header && <div className="bg-bg-primary">{header}</div>}

        <div className="pb-4">
          {isLoading && currentRootComments.length === 0 ? (
            <div className="px-4 py-4"><CommentSkeleton count={3} /></div>
          ) : currentRootComments.length === 0 ? (
            <div className="text-center py-10 text-text-secondary text-sm italic">Hãy là người đầu tiên bình luận!</div>
          ) : (
            <div className="flex flex-col">
              {currentRootComments.map(comment => renderCommentItem(comment))}
              {currentHasMoreRoot && (
                <div className="px-6 py-4">
                  <Button variant="ghost" size="sm" onClick={loadMoreRootComments} isLoading={isLoading} className="text-primary w-full justify-start font-bold text-sm h-10 border-border-light hover:bg-bg-primary">
                    Xem thêm bình luận cũ...
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`
        pb-[calc(16px+env(safe-area-inset-bottom))] sticky bottom-0 bg-bg-primary z-20
        ${variant === 'cinema' ? 'p-4 md:p-5 pb-6 md:pb-6 bg-bg-primary/95 backdrop-blur-md border-t border-border-light shadow-[0_-8px_30px_rgba(0,0,0,0.08)]' : 'p-4 md:p-5 bg-bg-primary border-t border-border-light'}
      `}>
        {replyingTo && (
          <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-primary/5 rounded-xl text-[11px] text-primary border border-primary/10 backdrop-blur-sm">
            <span className="font-medium flex items-center gap-1.5">
               <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
               Đang trả lời <strong>{users[replyingTo.userId || '']?.name}</strong>
            </span>
            <button onClick={resetInput} className="p-0.5 hover:bg-primary/10 rounded-full transition-colors">
              <X size={12} />
            </button>
          </div>
        )}
        <CommentInput
          user={currentUser}
          onSubmit={handleCommentSubmit}
          onUploadMedia={handleUploadMedia}
          autoFocus={autoFocus}
          placeholder={replyingTo ? 'Nhập câu trả lời...' : 'Nhập bình luận...'}
        />
      </div>

      <ConfirmDialog
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Xóa bình luận"
        message={commentToDelete?.parentId ? "Xóa câu trả lời này?" : "Xóa sẽ mất hết các câu trả lời liên quan?"}
        confirmLabel="Xóa"
        variant="danger"
      />
    </div>
  );
};
