import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Image as ImageIcon, Video, ChevronDown } from 'lucide-react';
import { UserAvatar, Button, TextArea, EmojiPicker, IconButton, ConfirmDialog } from '../ui';
import { validateFileSize } from '../../utils/fileUtils';
import { toast } from '../../store/toastStore';
import { Comment, User } from '../../types';
import { postService } from '../../services/postService';
import { useCommentStore } from '../../store/commentStore';
import { useUserCache } from '../../store/userCacheStore';
import { CommentSkeleton } from './CommentSkeleton';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { UI_MESSAGES } from '../../constants/uiMessages';

interface CommentSectionProps {
  postId: string;
  currentUser: User;
  header?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'cinema';
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  currentUser,
  header,
  className = '',
  variant = 'default'
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
    likeComment,
    clearComments
  } = useCommentStore();

  const { users, fetchUsers } = useUserCache();

  // Loading state
  const [isLoadingReplyMap, setIsLoadingReplyMap] = useState<Record<string, boolean>>({});
  
  // State input
  const [activeInputId, setActiveInputId] = useState<string | 'root'>('root');
  const [inputMode, setInputMode] = useState<'comment' | 'reply' | 'edit'>('comment');
  
  // State form
  const [newComment, setNewComment] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const currentRootComments = rootComments[postId] || [];
  const currentHasMoreRoot = hasMoreRoot[postId] ?? false;

  useEffect(() => {
    loadInitialRootComments();
    // Do not clear comments on unmount to prevent data loss in Feed PostItem
    // return () => clearComments(postId);
  }, [postId]);

  // Lấy thông tin user khi có comment mới
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
    setNewComment('');
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const handleEditClick = (comment: Comment) => {
    setEditingComment(comment);
    setReplyingTo(null);
    setActiveInputId(comment.id);
    setInputMode('edit');
    setNewComment(comment.content);
    setImagePreview(comment.image || null);
    setVideoPreview(comment.video || null);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const resetInput = () => {
    setNewComment('');
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedVideo(null);
    setVideoPreview(null);
    setReplyingTo(null);
    setEditingComment(null);
    setActiveInputId('root');
    setInputMode('comment');
  };

  const isReply = false; // Luôn là false ở cấp độ root của component

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!newComment.trim() && !selectedImage && !selectedVideo) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (inputMode === 'edit' && editingComment) {
        let finalImageUrl = imagePreview === editingComment.image ? undefined : imagePreview;
        let finalVideoUrl = videoPreview === editingComment.video ? undefined : videoPreview;

        if (selectedImage) finalImageUrl = await postService.uploadCommentImage(selectedImage, currentUser.id);
        if (selectedVideo) finalVideoUrl = await postService.uploadCommentVideo(selectedVideo, currentUser.id);

        await updateComment(postId, editingComment.id, newComment, editingComment.parentId, finalImageUrl, finalVideoUrl);
        resetInput();
        toast.success(UI_MESSAGES.FEED.UPDATE_SUCCESS);
      } else {
        let imageUrl = '';
        let videoUrl = '';
        if (selectedImage) imageUrl = await postService.uploadCommentImage(selectedImage, currentUser.id);
        if (selectedVideo) videoUrl = await postService.uploadCommentVideo(selectedVideo, currentUser.id);

        const parentId = replyingTo ? (replyingTo.parentId || replyingTo.id) : null;
        await addComment(
          postId,
          currentUser.id,
          newComment,
          parentId,
          replyingTo?.userId,
          imageUrl,
          videoUrl
        );

        resetInput();
        toast.success(UI_MESSAGES.FEED.ADD_SUCCESS);
      }
    } catch (error) {
      toast.error(inputMode === 'edit' ? "Lỗi cập nhật" : "Lỗi khi gửi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!commentToDelete) return;
    try {
      await deleteComment(postId, commentToDelete.id, commentToDelete.parentId);
      setCommentToDelete(null);
      toast.success(UI_MESSAGES.FEED.DELETE_SUCCESS);
    } catch (error) {
      toast.error("Lỗi xóa bình luận");
    }
  };

  const formatSimplifiedTime = (date: Date) => {
    return formatDistanceToNow(date, { locale: vi })
      .replace('khoảng ', '').replace('dưới ', '').replace('trước', '').trim();
  };

  const renderCommentContent = (comment: Comment) => {
    const replyToName = comment.replyToUserId ? users[comment.replyToUserId]?.name : null;
    return (
      <div className="text-sm text-text-primary mt-1 break-words leading-relaxed flex flex-wrap items-center gap-1">
        {replyToName && <i className="text-primary font-semibold not-italic decoration-primary/30">@{replyToName}</i>}
        <span>{comment.content}</span>
      </div>
    );
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      if (!validateFileSize(file, type === 'image' ? 'IMAGE' : 'VIDEO')) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'image') {
          setSelectedImage(file);
          setImagePreview(reader.result as string);
          setSelectedVideo(null);
          setVideoPreview(null);
        } else {
          setSelectedVideo(file);
          setVideoPreview(reader.result as string);
          setSelectedImage(null);
          setImagePreview(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const renderInputForm = (isInline = false) => {
    const isReplyingNow = isInline && inputMode === 'reply';
    const isEditingNow = isInline && inputMode === 'edit';
    const isRootInput = !isInline && activeInputId === 'root';

    if (isInline && activeInputId !== activeInputId) return null;

    return (
      <div className={`
        transition-all duration-300 animate-in slide-in-from-top-2
        ${variant === 'cinema' && !isInline ? 'p-4 bg-bg-primary/95 backdrop-blur-md border-t border-border-light sticky bottom-0 z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]' : 
          !isInline ? 'p-4 bg-bg-primary border-t border-border-light' : 'mt-3 pl-2'}
      `}>
        {(isReplyingNow || (isRootInput && replyingTo)) && (
          <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-primary/5 rounded-xl text-[11px] text-primary border border-primary/10 backdrop-blur-sm">
            <span className="font-medium flex items-center gap-1.5">
               <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
               {UI_MESSAGES.FEED.REPLYING} <strong>{users[replyingTo?.userId || '']?.name}</strong>
            </span>
            <IconButton onClick={resetInput} icon={<X size={12} />} size="xs" transparent />
          </div>
        )}

        {(isEditingNow) && (
          <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-bg-secondary rounded-xl text-[11px] text-text-secondary border border-border-light">
            <span className="font-medium flex items-center gap-1.5">
               <div className="w-1 h-1 rounded-full bg-text-tertiary" />
               {UI_MESSAGES.FEED.EDITING}
            </span>
            <IconButton onClick={resetInput} icon={<X size={12} />} size="xs" transparent />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2.5 items-center">
          <UserAvatar userId={currentUser.id} src={currentUser.avatar} name={currentUser.name} size={isInline ? 'xs' : 'sm'} className="border border-border-light shadow-sm" />
          <div className="flex-1 relative flex items-center">
            <TextArea
              ref={commentInputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isReplyingNow ? UI_MESSAGES.FEED.PLACEHOLDER_REPLY : isEditingNow ? UI_MESSAGES.FEED.PLACEHOLDER_EDIT : UI_MESSAGES.FEED.PLACEHOLDER_COMMENT}
              className="rounded-2xl bg-bg-secondary/50 border border-border-light focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 min-h-[44px] transition-all text-[14px] leading-relaxed py-2.5"
              containerClassName="!gap-0"
              autoResize
              maxHeight={160}
              rightElement={
                <div className="flex items-center gap-0.5 pr-1 mb-0.5">
                  <div className="flex items-center justify-center w-8 h-8 opacity-70 hover:opacity-100 hover:text-primary transition-all">
                    <EmojiPicker onEmojiSelect={(e) => setNewComment(prev => prev + e)} size={20} />
                  </div>
                  <IconButton type="button" onClick={() => fileInputRef.current?.click()} icon={<ImageIcon size={18} />} size="sm" transparent className="opacity-70 hover:opacity-100" />
                  <IconButton type="button" onClick={() => videoInputRef.current?.click()} icon={<Video size={18} />} size="sm" transparent className="opacity-70 hover:opacity-100" />
                </div>
              }
            />
          </div>
          <IconButton
            type="submit"
            disabled={(!newComment.trim() && !selectedImage && !selectedVideo)}
            loading={isSubmitting}
            icon={<Send size={20} />}
            className="rounded-2xl bg-primary text-white shadow-md shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all w-11 h-11 flex items-center justify-center p-0 flex-shrink-0"
          />
        </form>

        {(imagePreview || videoPreview) && (
          <div className="mt-3 relative animate-in zoom-in-95 duration-300">
            <div className="relative inline-block overflow-hidden rounded-xl border-2 border-primary/20 bg-bg-secondary">
              {imagePreview && <img src={imagePreview} alt="" className="h-24 object-cover min-w-[100px]" />}
              {videoPreview && <video src={videoPreview} className="h-24 w-40 object-cover" />}
              <IconButton 
                onClick={() => { setSelectedImage(null); setImagePreview(null); setSelectedVideo(null); setVideoPreview(null); }}
                className="absolute top-1 right-1 bg-black/50 text-white hover:bg-black p-1"
                icon={<X size={12} />}
                size="xs"
              />
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleMediaSelect(e, 'image')} className="hidden" />
        <input ref={videoInputRef} type="file" accept="video/*" onChange={(e) => handleMediaSelect(e, 'video')} className="hidden" />
      </div>
    );
  };

  const renderCommentItem = (comment: Comment, isReply = false) => {
    const author = users[comment.userId];
    const commentReplies = replies[postId]?.[comment.id] || [];
    const hasMoreR = hasMoreReply[postId]?.[comment.id];
    const isLoadingR = isLoadingReplyMap[comment.id];
    const isEditing = activeInputId === comment.id && inputMode === 'edit';
    const isReplying = activeInputId === comment.id && inputMode === 'reply';

    return (
      <div key={comment.id} className={`${isReply ? 'ml-10 mt-3' : 'mt-4 px-4'} animate-in fade-in slide-in-from-top-1`}>
        <div className="flex gap-3">
          <UserAvatar userId={comment.userId} src={author?.avatar} name={author?.name} size={isReply ? 'xs' : 'sm'} />
          <div className="flex-1 min-w-0">
            <div className={`
              rounded-2xl px-4 py-2 inline-block max-w-full shadow-sm transition-all group
              ${variant === 'cinema' ? 'bg-bg-secondary py-2.5' : 'bg-bg-secondary'}
            `}>
              <h4 className="font-bold text-[13px] text-text-primary mb-0.5">{author?.name || 'Người dùng'}</h4>
              {renderCommentContent(comment)}
              {(comment.image || comment.video) && (
                <div className="mt-3 rounded-xl overflow-hidden border border-border-light/50 bg-bg-primary/50">
                  {comment.image && <img src={comment.image} className="max-h-60 w-full object-contain" alt="attach" />}
                  {comment.video && <video src={comment.video} controls className="max-h-60 w-full" />}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 mt-1 ml-2 text-[11px] text-text-tertiary font-bold uppercase tracking-tight">
              <span>{formatSimplifiedTime(comment.timestamp)}</span>
              <button onClick={() => handleReplyClick(comment)} className="hover:text-primary transition-colors cursor-pointer">{UI_MESSAGES.COMMON.REPLY}</button>
              {comment.userId === currentUser.id && (
                <>
                  <button onClick={() => handleEditClick(comment)} className="hover:text-primary transition-colors cursor-pointer">{UI_MESSAGES.COMMON.EDIT}</button>
                  <button onClick={() => setCommentToDelete(comment)} className="text-error/70 hover:text-error transition-colors cursor-pointer">{UI_MESSAGES.COMMON.DELETE}</button>
                </>
              )}
            </div>

            {(isReplying || isEditing) && renderInputForm(true)}

            {!isReply && (comment.replyCount || 0) > 0 && (
              <div className="mt-2 pl-2 border-l-2 border-border-light ml-2">
                {commentReplies.length === 0 ? (
                  <button onClick={() => loadReplies(comment.id)} className="flex items-center gap-1.5 text-text-secondary hover:text-primary text-[12px] font-bold py-1 px-2">
                    <ChevronDown size={14} className="stroke-[3px]" /> Xem {comment.replyCount} trả lời
                  </button>
                ) : (
                  <>
                    <div className="space-y-1">{commentReplies.map(reply => renderCommentItem(reply, true))}</div>
                    {hasMoreR && (
                      <button onClick={() => loadReplies(comment.id, false)} className="text-text-secondary hover:text-primary text-[11px] font-bold ml-10 mt-2" disabled={isLoadingR}>
                        {isLoadingR ? UI_MESSAGES.COMMON.LOADING : UI_MESSAGES.FEED.VIEW_MORE_REPLIES}
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
    <div className={`flex flex-col transition-all duration-300 ${className} ${!header ? 'border-t border-border-light bg-bg-secondary/20' : 'h-full bg-bg-primary'}`}>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {header && <div className="bg-bg-primary">{header}</div>}
        
        <div className="pb-4">
          {isLoading && currentRootComments.length === 0 ? (
            <div className="px-4 py-4"><CommentSkeleton count={3} /></div>
          ) : currentRootComments.length === 0 ? (
            <div className="text-center py-10 text-text-secondary text-sm italic">{UI_MESSAGES.FEED.NO_COMMENTS}</div>
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

      {activeInputId === 'root' && renderInputForm()}

      <ConfirmDialog
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title={UI_MESSAGES.FEED.DELETE_TITLE}
        message={commentToDelete?.parentId ? "Xóa câu trả lời này?" : "Xóa sẽ mất hết các câu trả lời liên quan?"}
        confirmLabel={UI_MESSAGES.COMMON.DELETE}
        variant="danger"
      />
    </div>
  );
};
