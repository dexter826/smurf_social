import React, { useState, useEffect } from 'react';
import { X, Send, Heart, Image as ImageIcon, Video, Play } from 'lucide-react';
import { Avatar, UserAvatar, Button, TextArea, EmojiPicker, Loading, ConfirmDialog, IconButton } from '../ui';
import { validateFileSize } from '../../utils/fileUtils';
import { batchGetUsers } from '../../utils/batchUtils';
import { toast } from '../../store/toastStore';
import { Post, Comment, User, Message } from '../../types';
import { postService } from '../../services/postService';
import { userService } from '../../services/userService';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [newComment, setNewComment] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingImage, setEditingImage] = useState<File | null>(null);
  const [editingImagePreview, setEditingImagePreview] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<File | null>(null);
  const [editingVideoPreview, setEditingVideoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const editFileInputRef = React.useRef<HTMLInputElement>(null);
  const editVideoInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadComments();

    const unsubscribe = postService.subscribeToComments(postId, (updatedComments) => {
      setComments(updatedComments);
      loadUsers(updatedComments);
    });

    return () => unsubscribe();
  }, [postId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const fetchedComments = await postService.getComments(postId);
      setComments(fetchedComments);
      await loadUsers(fetchedComments);
    } catch (error) {
      console.error("Lỗi load comments", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async (commentsToLoad: Comment[]) => {
    const userIds = [...new Set(commentsToLoad.map(c => c.userId))];
    const missingUserIds = userIds.filter(id => !usersMap[id]);
    
    if (missingUserIds.length === 0) return;

    try {
      const newUsersMap = await batchGetUsers(missingUserIds);
      setUsersMap(prev => ({ ...prev, ...newUsersMap }));
    } catch (error) {
      console.error("Lỗi load users cho comments:", error);
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video', isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileTypeEnum = type === 'image' ? 'IMAGE' : 'VIDEO';
      if (!validateFileSize(file, fileTypeEnum)) {
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
          if (type === 'image') {
            setEditingImage(file);
            setEditingImagePreview(reader.result as string);
            setEditingVideo(null);
            setEditingVideoPreview(null);
          } else {
            setEditingVideo(file);
            setEditingVideoPreview(reader.result as string);
            setEditingImage(null);
            setEditingImagePreview(null);
          }
        } else {
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
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = (isEdit = false) => {
    if (isEdit) {
      setEditingImage(null);
      setEditingImagePreview(null);
      setEditingVideo(null);
      setEditingVideoPreview(null);
      if (editFileInputRef.current) editFileInputRef.current.value = '';
      if (editVideoInputRef.current) editVideoInputRef.current.value = '';
    } else {
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedVideo(null);
      setVideoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newComment.trim() && !selectedImage && !selectedVideo) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let imageUrl = '';
      let videoUrl = '';
      if (selectedImage) {
        imageUrl = await postService.uploadCommentImage(selectedImage, currentUser.id);
      } else if (selectedVideo) {
        videoUrl = await postService.uploadCommentVideo(selectedVideo, currentUser.id);
      }

      await postService.addComment(
        postId, 
        currentUser.id, 
        newComment, 
        replyingTo?.id,
        imageUrl,
        videoUrl
      );
      setNewComment('');
      removeMedia();
      setReplyingTo(null);
    } catch (error) {
      console.error('Lỗi thêm comment:', error);
      toast.error('Không thể gửi bình luận. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string, currentComment: Comment) => {
    if ((!editingContent.trim() && !editingImagePreview && !editingVideoPreview) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let imageUrl = currentComment.image || '';
      let videoUrl = currentComment.video || '';
      
      if (editingImage) {
        imageUrl = await postService.uploadCommentImage(editingImage, currentUser.id);
        videoUrl = '';
      } else if (editingVideo) {
        videoUrl = await postService.uploadCommentVideo(editingVideo, currentUser.id);
        imageUrl = '';
      } else {
        if (!editingImagePreview) imageUrl = '';
        if (!editingVideoPreview) videoUrl = '';
      }

      const commentRef = doc(db, 'comments', commentId);
      await updateDoc(commentRef, { 
        content: editingContent,
        image: imageUrl || null,
        video: videoUrl || null
      });
      
      setEditingCommentId(null);
      setEditingContent('');
      removeMedia(true);
    } catch (error) {
      console.error('Lỗi cập nhật comment:', error);
      toast.error('Không thể cập nhật bình luận.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      await postService.deleteComment(commentToDelete, postId);
      setCommentToDelete(null);
      toast.success('Đã xóa bình luận');
    } catch (error) {
      console.error('Lỗi xóa comment:', error);
      toast.error('Không thể xóa bình luận.');
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
    setEditingImagePreview(comment.image || null);
    setEditingVideoPreview(comment.video || null);
    setEditingImage(null);
    setEditingVideo(null);
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const author = usersMap[comment.userId];
    const isOwner = comment.userId === currentUser.id;
    const isEditing = editingCommentId === comment.id;
    const replies = comments.filter(c => c.parentId === comment.id);

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-10 mt-2' : 'mt-4'}`}>
        <div className="flex gap-3">
          <UserAvatar
            userId={comment.userId}
            src={author?.avatar}
            name={author?.name || 'User'}
            size={depth > 0 ? 'xs' : 'sm'}
            initialStatus={author?.status}
          />
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="w-full">
                {(editingImagePreview || editingVideoPreview) && (
                  <div className="relative inline-block mb-2 overflow-hidden rounded-lg border border-border-light shadow-sm bg-bg-primary">
                    {editingImagePreview ? (
                      <img src={editingImagePreview} alt="Preview" className="h-20 w-20 object-cover" />
                    ) : (
                      <div className="h-20 w-32 relative group">
                        <video src={editingVideoPreview!} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                           <Play size={20} className="text-white fill-white" />
                        </div>
                      </div>
                    )}
                    <IconButton 
                      onClick={() => removeMedia(true)}
                      className="absolute -top-1 -right-1 bg-black/50 text-white hover:bg-black/70 z-10 w-5 h-5 rounded-full"
                      icon={<X size={12} />}
                      size="sm"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                    <TextArea
                      id={`edit-comment-${comment.id}`}
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      containerClassName="flex-1"
                      className="rounded-xl"
                      autoResize
                      maxHeight={200}
                      disabled={isSubmitting}
                      autoFocus
                      rightElement={
                        <div className="flex items-center mr-1">
                          <EmojiPicker
                            size={20}
                            onEmojiSelect={(emoji) => {
                              const input = document.getElementById(`edit-comment-${comment.id}`) as HTMLTextAreaElement;
                              const start = input?.selectionStart || 0;
                              const end = input?.selectionEnd || 0;
                              const newText = editingContent.substring(0, start) + emoji + editingContent.substring(end);
                              setEditingContent(newText);
                              setTimeout(() => {
                                input?.focus();
                                input?.setSelectionRange(start + emoji.length, start + emoji.length);
                              }, 0);
                            }}
                            disabled={isSubmitting}
                          />
                          <IconButton
                            type="button"
                            onClick={() => editFileInputRef.current?.click()}
                            title="Thêm ảnh"
                            disabled={isSubmitting}
                            icon={<ImageIcon size={16} />}
                            size="sm"
                          />
                          <IconButton
                            type="button"
                            onClick={() => editVideoInputRef.current?.click()}
                            title="Thêm video"
                            disabled={isSubmitting}
                            icon={<Video size={16} />}
                            size="sm"
                          />
                        </div>
                      }
                    />
                    <input 
                      ref={editFileInputRef}
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleMediaSelect(e, 'image', true)} 
                      className="hidden" 
                    />
                    <input 
                      ref={editVideoInputRef}
                      type="file" 
                      accept="video/*" 
                      onChange={(e) => handleMediaSelect(e, 'video', true)} 
                      className="hidden" 
                    />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUpdateComment(comment.id, comment)}
                    disabled={(!editingContent.trim() && !editingImagePreview && !editingVideoPreview) || isSubmitting}
                    className="text-primary-500 hover:bg-primary-50 rounded-full"
                    icon={<Send size={18} />}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCommentId(null)}
                    className="text-xs text-text-secondary hover:underline px-1"
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-bg-secondary rounded-2xl px-4 py-2 inline-block max-w-full w-full sm:w-auto shadow-sm">
                <h4 className="font-semibold text-sm text-text-primary">
                  {author?.name || 'Unknown User'}
                </h4>
                {comment.content && (
                  <p className="text-sm text-text-primary mt-1 break-words">
                    {comment.content}
                  </p>
                )}
                {comment.image && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border-light shadow-sm bg-bg-primary max-w-sm">
                    <img 
                      src={comment.image} 
                      alt="Comment attachment" 
                      className="max-w-full max-h-80 object-contain mx-auto" 
                    />
                  </div>
                )}
                {comment.video && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border-light shadow-sm bg-bg-primary max-w-sm relative group">
                    <video 
                      src={comment.video} 
                      controls
                      className="max-w-full max-h-80 mx-auto" 
                    />
                  </div>
                )}
              </div>
            )}
            
            {!isEditing && (
              <div className="flex items-center gap-3 mt-1 ml-2 text-xs text-text-tertiary">
                <span className="font-medium">
                  {formatDistanceToNow(comment.timestamp, {
                    locale: {
                      ...vi,
                      formatDistance: (token, count) => {
                        const formatRelativeLocale: { [key: string]: string } = {
                          lessThanXSeconds: 'vừa xong',
                          xSeconds: 'vừa xong',
                          halfAMinute: 'vừa xong',
                          lessThanXMinutes: '{{count}} phút',
                          xMinutes: '{{count}} phút',
                          aboutXHours: '{{count}} giờ',
                          xHours: '{{count}} giờ',
                          xDays: '{{count}} ngày',
                          aboutXMonths: '{{count}} tháng',
                          xMonths: '{{count}} tháng',
                          aboutXYears: '{{count}} năm',
                          xYears: '{{count}} năm',
                        };
                        return formatRelativeLocale[token].replace('{{count}}', count.toString());
                      }
                    }
                  })}
                </span>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(comment)}
                  className="font-bold hover:text-primary p-0 h-auto"
                >
                  Trả lời
                </Button>
                {isOwner && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(comment)}
                      className="hover:text-primary p-0 h-auto font-normal"
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCommentToDelete(comment.id)}
                      className="text-error hover:text-error p-0 h-auto font-normal"
                    >
                      Xóa
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {replies.map(reply => renderComment(reply, depth + 1))}
      </div>
    );
  };

  const rootComments = comments.filter(c => !c.parentId);

  return (
    <div className="border-t border-border-light bg-bg-secondary/30">
      <div className="px-4 py-3">
        {isLoading ? (
          <Loading variant="inline" size="sm" className="py-4" />
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-text-secondary text-sm">
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </div>
        ) : (
          <div className="space-y-1">
            {rootComments.slice(0, visibleCount).map(comment => renderComment(comment))}
            
            {rootComments.length > visibleCount && (
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCount(prev => prev + 5)}
                className="text-primary mt-2 ml-2"
              >
                Xem thêm {rootComments.length - visibleCount} bình luận...
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="p-4 bg-bg-primary border-t border-border-light transition-theme">
        {replyingTo && (
          <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-bg-secondary rounded-lg text-xs text-text-secondary animate-in slide-in-from-bottom-1 duration-200 shadow-sm border border-border-light">
            <span>Đang trả lời <strong>{usersMap[replyingTo.userId]?.name}</strong></span>
            <IconButton 
              onClick={() => setReplyingTo(null)}
              className="hover:bg-bg-tertiary rounded-full"
              icon={<X size={14} />}
              size="sm"
            />
          </div>
        )}

        {(imagePreview || videoPreview) && (
          <div className="relative inline-block mb-3 ml-12 animate-in zoom-in-95 duration-200">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="h-24 w-24 object-cover rounded-xl border-2 border-primary-100 shadow-md translate-y-0" />
            ) : (
              <div className="relative group rounded-xl overflow-hidden border-2 border-primary-100 shadow-md h-24 w-40">
                <video src={videoPreview!} className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-all">
                   <Play size={24} className="text-white fill-white drop-shadow-lg" />
                </div>
              </div>
            )}
            <IconButton 
              onClick={() => removeMedia()}
              className="absolute -top-2 -right-2 bg-black/60 text-white hover:bg-black/80 shadow-lg z-10 w-6 h-6 rounded-full"
              icon={<X size={14} />}
              size="sm"
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-3">
          <UserAvatar userId={currentUser.id} src={currentUser.avatar} name={currentUser.name} size="sm" initialStatus={currentUser.status} />
          <div className="flex-1 flex items-center gap-2">
            <TextArea
              id="comment-input-main"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Viết câu trả lời..." : "Viết bình luận..."}
              containerClassName="flex-1"
              className="rounded-3xl"
              autoResize
              maxHeight={200}
              disabled={isSubmitting}
              rightElement={
                <div className="flex items-center mr-1">
                  <EmojiPicker
                    size={20}
                    onEmojiSelect={(emoji) => {
                      const input = document.getElementById('comment-input-main') as HTMLTextAreaElement;
                      const start = input?.selectionStart || 0;
                      const end = input?.selectionEnd || 0;
                      const newText = newComment.substring(0, start) + emoji + newComment.substring(end);
                      setNewComment(newText);
                      setTimeout(() => {
                        input?.focus();
                        input?.setSelectionRange(start + emoji.length, start + emoji.length);
                      }, 0);
                    }}
                    disabled={isSubmitting}
                  />
                  <IconButton
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Thêm ảnh"
                    disabled={isSubmitting}
                    icon={<ImageIcon size={16} />}
                    size="sm"
                  />
                  <IconButton
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    title="Thêm video"
                    disabled={isSubmitting}
                    icon={<Video size={16} />}
                    size="sm"
                  />
                </div>
              }
            />
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={(e) => handleMediaSelect(e, 'image')} 
              className="hidden" 
            />
            <input 
              ref={videoInputRef}
              type="file" 
              accept="video/*" 
              onChange={(e) => handleMediaSelect(e, 'video')} 
              className="hidden" 
            />
            <Button
              type="submit"
              disabled={(!newComment.trim() && !selectedImage && !selectedVideo)}
              isLoading={isSubmitting}
              variant="primary"
              className="w-10 h-10 flex-shrink-0 bg-primary-500 hover:bg-primary-600 shadow-sm active:scale-95 rounded-full"
              icon={<Send size={18} />}
            />
          </div>
        </form>
      </div>

      <ConfirmDialog
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDeleteComment}
        title="Xóa bình luận"
        message="Bạn có chắc chắn muốn xóa bình luận này?"
        confirmLabel="Xóa ngay"
        variant="danger"
      />
    </div>
  );
};
