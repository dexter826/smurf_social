import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Image as ImageIcon, Video, ChevronDown, Play } from 'lucide-react';
import { UserAvatar, Button, TextArea, EmojiPicker, IconButton, ConfirmDialog } from '../ui';
import { validateFileSize } from '../../utils/fileUtils';
import { toast } from '../../store/toastStore';
import { Comment, User } from '../../types';
import { commentService } from '../../services/commentService';
import { postService } from '../../services/postService';
import { useCommentStore } from '../../store/commentStore';
import { useUserCache } from '../../store/userCacheStore';
import { CommentSkeleton } from './CommentSkeleton';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface CommentSectionProps {
  postId: string;
  currentUser: User;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  currentUser
}) => {
  const { 
    rootComments, replies, lastRootDoc, hasMoreRoot, lastReplyDoc, hasMoreReply,
    addRootComments, setReplies, addReplies, clearComments, updateCommentInStore, setRootComments
  } = useCommentStore();

  const { users, fetchUsers } = useUserCache();

  // Loading states
  const [isLoadingRoot, setIsLoadingRoot] = useState(false);
  const [isFetchingMoreRoot, setIsFetchingMoreRoot] = useState(false);
  const [isLoadingReplyMap, setIsLoadingReplyMap] = useState<Record<string, boolean>>({});
  
  // State quản lý Input Inline
  const [activeInputId, setActiveInputId] = useState<string | 'root'>('root');
  const [inputMode, setInputMode] = useState<'comment' | 'reply' | 'edit'>('comment');
  
  // Form states
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
  const currentLastRootDoc = lastRootDoc[postId];

  useEffect(() => {
    if (currentRootComments.length === 0) {
      loadInitialRootComments();
    }
    return () => clearComments(postId);
  }, [postId]);

  const loadInitialRootComments = async () => {
    setIsLoadingRoot(true);
    try {
      const { comments, lastDoc, hasMore } = await commentService.getRootComments(postId, 5);
      setRootComments(postId, comments, lastDoc, hasMore);
      await fetchUsers([...new Set(comments.map(c => c.userId))] as string[]);
    } catch (error) {
      toast.error("Không thể tải bình luận");
    } finally {
      setIsLoadingRoot(false);
    }
  };

  const loadMoreRootComments = async () => {
    if (isFetchingMoreRoot || !currentLastRootDoc) return;
    setIsFetchingMoreRoot(true);
    try {
      const { comments, lastDoc, hasMore } = await commentService.getRootComments(postId, 5, currentLastRootDoc);
      addRootComments(postId, comments, lastDoc, hasMore);
      await fetchUsers([...new Set(comments.map(c => c.userId))] as string[]);
    } catch (error) {
      toast.error("Không thể tải thêm bình luận");
    } finally {
      setIsFetchingMoreRoot(false);
    }
  };

  const loadReplies = async (parentId: string, isInitial = true) => {
    if (isLoadingReplyMap[parentId]) return;
    setIsLoadingReplyMap(prev => ({ ...prev, [parentId]: true }));
    try {
      const lastDoc = isInitial ? undefined : lastReplyDoc[postId]?.[parentId];
      const { replies: newReplies, lastDoc: newLastDoc, hasMore } = await commentService.getReplies(parentId, 3, lastDoc);
      if (isInitial) setReplies(postId, parentId, newReplies, newLastDoc, hasMore);
      else addReplies(postId, parentId, newReplies, newLastDoc, hasMore);
      await fetchUsers([...new Set(newReplies.map(r => r.userId))] as string[]);
      if (newReplies.some(r => r.replyToUserId)) {
        await fetchUsers([...new Set(newReplies.map(r => r.replyToUserId!).filter(id => !!id))] as string[]);
      }
    } catch (error) {
      toast.error("Không thể tải câu trả lời");
    } finally {
      setIsLoadingReplyMap(prev => ({ ...prev, [parentId]: false }));
    }
  };

  const handleReplyClick = (comment: Comment) => {
    setReplyingTo(comment);
    setEditingComment(null);
    setActiveInputId(comment.id);
    setInputMode('reply');
    setNewComment(''); // Reset input theo yêu cầu
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

        await commentService.updateComment(editingComment.id, newComment, finalImageUrl, finalVideoUrl);
        updateCommentInStore(postId, editingComment.id, newComment, editingComment.parentId, finalImageUrl, finalVideoUrl);
        resetInput();
        toast.success("Đã cập nhật bình luận");
      } else {
        let imageUrl = '';
        let videoUrl = '';
        if (selectedImage) imageUrl = await postService.uploadCommentImage(selectedImage, currentUser.id);
        if (selectedVideo) videoUrl = await postService.uploadCommentVideo(selectedVideo, currentUser.id);

        const parentId = replyingTo ? (replyingTo.parentId || replyingTo.id) : null;
        await commentService.addComment(
          postId,
          currentUser.id,
          newComment,
          parentId,
          replyingTo?.userId,
          imageUrl,
          videoUrl
        );

        resetInput();
        if (!parentId) await loadInitialRootComments();
        else await loadReplies(parentId, true);
        toast.success("Đã gửi bình luận");
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

  const renderInputForm = (isInline = false) => {
    const isReplyingNow = isInline && inputMode === 'reply';
    const isEditingNow = isInline && inputMode === 'edit';
    const isRootInput = !isInline && activeInputId === 'root';

    if (isInline && activeInputId !== activeInputId) return null; // Logic check placeholder

    return (
      <div className={`
        transition-all duration-300 animate-in slide-in-from-top-2
        ${!isInline ? 'p-4 bg-bg-primary border-t border-border-light sticky bottom-0 z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]' : 'mt-3 pl-2'}
      `}>
        {(isReplyingNow || (isRootInput && replyingTo)) && (
          <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-primary/5 rounded-xl text-[11px] text-primary border border-primary/10 backdrop-blur-sm">
            <span className="font-medium flex items-center gap-1.5">
               <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
               Đang trả lời <strong>{users[replyingTo?.userId || '']?.name}</strong>
            </span>
            <IconButton onClick={resetInput} icon={<X size={12} />} size="xs" transparent />
          </div>
        )}

        {(isEditingNow) && (
          <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-bg-secondary rounded-xl text-[11px] text-text-secondary border border-border-light">
            <span className="font-medium flex items-center gap-1.5">
               <div className="w-1 h-1 rounded-full bg-text-tertiary" />
               Đang chỉnh sửa bình luận
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
              placeholder={isReplyingNow ? "Viết câu trả lời..." : isEditingNow ? "Sửa bình luận..." : "Viết bình luận..."}
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
            <div className="bg-bg-secondary rounded-2xl px-4 py-2 inline-block max-w-full shadow-sm hover:shadow-md transition-shadow group">
              <h4 className="font-bold text-[13px] text-text-primary">{author?.name || 'Người dùng'}</h4>
              {renderCommentContent(comment)}
              {(comment.image || comment.video) && (
                <div className="mt-2 rounded-xl overflow-hidden border border-border-light bg-bg-primary">
                  {comment.image && <img src={comment.image} className="max-h-60 w-full object-contain" alt="attach" />}
                  {comment.video && <video src={comment.video} controls className="max-h-60 w-full" />}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 mt-1 ml-2 text-[11px] text-text-tertiary font-bold uppercase tracking-tight">
              <span>{formatSimplifiedTime(comment.timestamp)}</span>
              <button onClick={() => handleReplyClick(comment)} className="hover:text-primary transition-colors cursor-pointer">Trả lời</button>
              {comment.userId === currentUser.id && (
                <>
                  <button onClick={() => handleEditClick(comment)} className="hover:text-primary transition-colors cursor-pointer">Sửa</button>
                  <button onClick={() => setCommentToDelete(comment)} className="text-error/70 hover:text-error transition-colors cursor-pointer">Xóa</button>
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
                        {isLoadingR ? 'Đang tải...' : 'Xem thêm trả lời'}
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
    <div className="border-t border-border-light bg-bg-secondary/20 transition-all duration-300">
      <div className="pb-4">
        {isLoadingRoot && currentRootComments.length === 0 ? (
          <div className="px-4 py-4"><CommentSkeleton count={3} /></div>
        ) : currentRootComments.length === 0 ? (
          <div className="text-center py-10 text-text-secondary text-sm italic">Bình luận đầu tiên nào!</div>
        ) : (
          <div className="flex flex-col">
            {currentRootComments.map(comment => renderCommentItem(comment))}
            {currentHasMoreRoot && (
              <div className="px-6 py-4">
                <Button variant="ghost" size="sm" onClick={loadMoreRootComments} isLoading={isFetchingMoreRoot} className="text-primary w-full justify-start font-bold text-sm h-10 border-border-light hover:bg-bg-primary">
                  Xem thêm bình luận cũ...
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {activeInputId === 'root' && renderInputForm()}

      <ConfirmDialog
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={async () => {
          if (!commentToDelete) return;
          await commentService.deleteComment(commentToDelete.id, postId, commentToDelete.parentId);
          if (!commentToDelete.parentId) await loadInitialRootComments();
          else await loadReplies(commentToDelete.parentId, true);
          setCommentToDelete(null);
          toast.success("Đã xóa");
        }}
        title="Xóa bình luận"
        message={commentToDelete?.parentId ? "Xóa câu trả lời này?" : "Xóa sẽ mất hết các câu trả lời liên quan?"}
        confirmLabel="Xóa ngay"
        variant="danger"
      />
    </div>
  );
};
