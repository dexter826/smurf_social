import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Flag, X } from 'lucide-react';
import { UserAvatar, Button, ConfirmDialog, UploadProgress } from '../ui';
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
  postOwnerId?: string;
  totalCommentCount?: number;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  currentUser,
  header,
  className = '',
  variant = 'default',
  autoFocus = false,
  onProfileClick,
  postOwnerId,
  totalCommentCount = 0
}) => {
  const {
    rootComments,
    replies,
    hasMoreRoot,
    hasMoreReply,
    isLoadingPost,
    fetchRootComments,
    fetchReplies,
    subscribeToComments,
    subscribeToReplies,
    addComment,
    updateComment,
    deleteComment,
    clearComments
  } = useCommentStore();

  const { users, fetchUsers } = useUserCache();
  const { openReportModal } = useReportStore();

  const [isLoadingReplyMap, setIsLoadingReplyMap] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [activeInputId, setActiveInputId] = useState<string | 'root'>('root');
  const [inputMode, setInputMode] = useState<'comment' | 'reply' | 'edit'>('comment');

  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);

  const replySubscriptionsRef = useRef<Record<string, () => void>>({});
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Cuộn tới ô nhập liệu khi active
  useEffect(() => {
    if (activeInputId && activeInputId !== 'root' && commentRefs.current[activeInputId]) {
      setTimeout(() => {
        commentRefs.current[activeInputId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }, 100);
    }
  }, [activeInputId]);

  const navigate = useNavigate();

  const currentRootComments = rootComments[postId] || [];
  const currentHasMoreRoot = hasMoreRoot[postId] ?? false;
  const isLoading = isLoadingPost(postId);
  const blockedUserIds = currentUser.blockedUserIds || [];

  // Reset input khi đổi bài viết
  useEffect(() => {
    resetInput();
    return () => {
      // Dọn dẹp subscriptions khi unmount hoặc đổi post
      Object.values(replySubscriptionsRef.current).forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
      replySubscriptionsRef.current = {};
    };
  }, [postId]);

  // Theo dõi bình luận gốc
  useEffect(() => {
    const unsubscribe = subscribeToComments(postId, blockedUserIds);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [postId, blockedUserIds.join(','), subscribeToComments]);

  // Tải thông tin người dùng
  useEffect(() => {
    if (currentRootComments.length > 0) {
      const userIds = [...new Set(currentRootComments.map(c => c.userId))];
      fetchUsers(userIds);
    }
  }, [currentRootComments, fetchUsers]);

  const loadMoreRootComments = async () => {
    await fetchRootComments(postId, blockedUserIds, true);
  };

  const loadReplies = async (parentId: string) => {
    if (isLoadingReplyMap[parentId] || replySubscriptionsRef.current[parentId]) return;
    
    setIsLoadingReplyMap(prev => ({ ...prev, [parentId]: true }));
    try {
      // Dùng subscription
      const unsubscribe = subscribeToReplies(postId, parentId, blockedUserIds);
      replySubscriptionsRef.current[parentId] = unsubscribe;

      // Fetch user data sẽ được trigger bởi useEffect theo dõi replies store
    } finally {
      setIsLoadingReplyMap(prev => ({ ...prev, [parentId]: false }));
    }
  };

  // Tải thông tin người dùng cho phản hồi
  useEffect(() => {
    const postReplies = replies[postId] || {};
    // Chúng ta lặp qua replies để fetch user info cho bất kỳ reply mới nào
    Object.keys(postReplies).forEach(async (parentId) => {
      const parentReplies = postReplies[parentId] || [];
      if (parentReplies.length > 0) {
        const userIds = [...new Set([
          ...parentReplies.map(r => r.userId),
          ...parentReplies.map(r => r.replyToUserId).filter(id => !!id) as string[]
        ])];
        if (userIds.length > 0) {
          await fetchUsers(userIds);
        }
      }
    });
  }, [replies, postId, fetchUsers]);

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
    setUploadProgress(0);
    try {
      const onProgress = (p: { progress: number }) => setUploadProgress(p.progress);
      
      if (file.type.startsWith('image/')) {
        return await postService.uploadCommentImage(file, currentUser.id, onProgress);
      } else {
        return await postService.uploadCommentVideo(file, currentUser.id, onProgress);
      }
    } finally {
      setUploadProgress(null);
    }
  };

  const renderCommentItem = (comment: Comment, isReply = false, rootAuthorId?: string) => {
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
      <div 
        key={comment.id} 
        ref={el => commentRefs.current[comment.id] = el}
        className={`${isReply ? 'ml-2 mt-2' : 'mt-4 px-4'} animate-in fade-in slide-in-from-top-1`}
      >
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
                {comment.userId === postOwnerId && (
                  <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-md font-bold ml-1 flex-shrink-0">
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
                  (() => {
                    const filteredReplies = commentReplies.filter(r => 
                      r.userId === currentUser.id || 
                      r.userId === postOwnerId || 
                      currentUser.friendIds?.includes(r.userId)
                    );
                    return (
                      <>
                        <div className="space-y-1">
                          {filteredReplies.map(reply => renderCommentItem(reply, true, comment.userId))}
                        </div>
                        {hasMoreR && (
                          <button 
                            onClick={() => loadReplies(comment.id)} 
                            className="text-primary hover:underline text-[10px] font-bold ml-10 mt-2 uppercase tracking-wider transition-all" 
                            disabled={isLoadingR}
                          >
                            {isLoadingR ? 'Đang tải...' : `Xem thêm ${Math.max(0, (comment.replyCount || 0) - commentReplies.length)} trả lời`}
                          </button>
                        )}
                      </>
                    );
                  })()
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
          {(() => {
            const filteredRootComments = currentRootComments.filter(c => 
              c.userId === currentUser.id || 
              c.userId === postOwnerId || 
              currentUser.friendIds?.includes(c.userId)
            );

            if (isLoading && filteredRootComments.length === 0) {
              return <div className="px-4 py-4"><CommentSkeleton /></div>;
            }

            if (filteredRootComments.length === 0) {
              return (
                <div className="text-center py-10 px-6">
                  <p className="text-text-secondary text-sm italic">
                    {totalCommentCount > 0 
                      ? `Có ${totalCommentCount} bình luận. Bạn chỉ xem được bình luận của bạn bè.`
                      : 'Hãy là người đầu tiên bình luận!'}
                  </p>
                </div>
              );
            }

            return (
              <div className="flex flex-col">
                {filteredRootComments.map(comment => renderCommentItem(comment, false, comment.userId))}
                {currentHasMoreRoot && (
                  <div className="px-6 py-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={loadMoreRootComments} 
                      isLoading={isLoading} 
                      className="text-primary w-full justify-start font-bold text-xs h-10 border-border-light hover:bg-bg-primary uppercase tracking-widest"
                    >
                      Xem thêm bình luận cũ...
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
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
        
        {uploadProgress !== null && (
          <div className="mb-2">
            <UploadProgress 
              progress={uploadProgress} 
              fileName="Đang tải lên media..."
            />
          </div>
        )}
        
        {activeInputId === 'root' && (
          <CommentInput
            user={currentUser}
            onSubmit={handleCommentSubmit}
            onUploadMedia={handleUploadMedia}
            autoFocus={autoFocus}
            placeholder="Nhập bình luận..."
          />
        )}
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
