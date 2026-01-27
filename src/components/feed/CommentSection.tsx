import React, { useState, useEffect } from 'react';
import { X, Send, Heart, Image as ImageIcon } from 'lucide-react';
import { Avatar, UserAvatar, Button, EmojiPicker, Loading, ConfirmDialog } from '../ui';
import { toast } from '../../store/toastStore';
import { Comment, User } from '../../types';
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
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingImage, setEditingImage] = useState<File | null>(null);
  const [editingImagePreview, setEditingImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const editFileInputRef = React.useRef<HTMLInputElement>(null);

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
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async (commentsToLoad: Comment[]) => {
    const userIds = [...new Set(commentsToLoad.map(c => c.userId))];
    const users: Record<string, User> = {};

    for (const userId of userIds) {
      if (!usersMap[userId]) {
        const user = await userService.getUserById(userId);
        if (user) users[userId] = user;
      }
    }

    setUsersMap(prev => ({ ...prev, ...users }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ảnh bình luận quá lớn. Giới hạn: 5MB.');
        return;
      }

      if (isEdit) {
        setEditingImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditingImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeImage = (isEdit = false) => {
    if (isEdit) {
      setEditingImage(null);
      setEditingImagePreview(null);
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    } else {
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newComment.trim() && !selectedImage) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let imageUrl = '';
      if (selectedImage) {
        imageUrl = await postService.uploadCommentImage(selectedImage, currentUser.id);
      }

      await postService.addComment(
        postId, 
        currentUser.id, 
        newComment, 
        replyingTo?.id,
        imageUrl
      );
      setNewComment('');
      removeImage();
      setReplyingTo(null);
    } catch (error) {
      console.error('Lỗi thêm comment:', error);
      toast.error('Không thể gửi bình luận. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string, currentComment: Comment) => {
    if ((!editingContent.trim() && !editingImagePreview) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let imageUrl = currentComment.image || '';
      
      // Nếu có ảnh mới được chọn
      if (editingImage) {
        imageUrl = await postService.uploadCommentImage(editingImage, currentUser.id);
      } else if (!editingImagePreview) {
        // Nếu ảnh cũ bị xóa
        imageUrl = '';
      }

      const commentRef = doc(db, 'comments', commentId);
      await updateDoc(commentRef, { 
        content: editingContent,
        image: imageUrl || null
      });
      
      setEditingCommentId(null);
      setEditingContent('');
      setEditingImage(null);
      setEditingImagePreview(null);
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
    setEditingImage(null);
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
                {editingImagePreview && (
                  <div className="relative inline-block mb-2 overflow-hidden rounded-lg border border-border-light">
                    <img src={editingImagePreview} alt="Preview" className="h-20 w-20 object-cover" />
                    <button 
                      onClick={() => removeImage(true)}
                      className="absolute -top-1 -right-1 bg-secondary text-inverse rounded-full p-0.5 hover:bg-hover transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        id={`edit-comment-${comment.id}`}
                        type="text"
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full bg-bg-secondary rounded-full px-4 py-2 pr-20 text-sm border-none outline-none focus:ring-1 focus:ring-primary-500"
                        disabled={isSubmitting}
                        autoFocus
                      />
                      <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        <EmojiPicker
                          onEmojiSelect={(emoji) => {
                            const input = document.getElementById(`edit-comment-${comment.id}`) as HTMLInputElement;
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
                      </div>
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                        disabled={isSubmitting}
                      >
                        <ImageIcon size={18} />
                      </button>
                    <input 
                      ref={editFileInputRef}
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageSelect(e, true)} 
                      className="hidden" 
                    />
                  </div>
                  <button
                    onClick={() => handleUpdateComment(comment.id, comment)}
                    disabled={(!editingContent.trim() && !editingImagePreview) || isSubmitting}
                    className="p-2 text-primary-500 hover:bg-primary-50 rounded-full disabled:opacity-50 transition-colors"
                  >
                    <Send size={18} />
                  </button>
                  <button
                    onClick={() => setEditingCommentId(null)}
                    className="text-xs text-text-secondary hover:underline px-1"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-bg-secondary rounded-2xl px-4 py-2 inline-block max-w-full w-full sm:w-auto">
                <h4 className="font-semibold text-sm text-text-primary">
                  {author?.name || 'Unknown User'}
                </h4>
                {comment.content && (
                  <p className="text-sm text-text-primary mt-1 break-words">
                    {comment.content}
                  </p>
                )}
                {comment.image && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border-light">
                    <img 
                      src={comment.image} 
                      alt="Comment attachment" 
                      className="max-w-full max-h-60 object-contain bg-bg-primary" 
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
                <button 
                  onClick={() => setReplyingTo(comment)}
                  className="font-bold hover:underline"
                >
                  Trả lời
                </button>
                {isOwner && (
                  <>
                    <button
                      onClick={() => startEditing(comment)}
                      className="hover:underline"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => setCommentToDelete(comment.id)}
                      className="hover:underline"
                    >
                      Xóa
                    </button>
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
            {rootComments.map(comment => renderComment(comment))}
          </div>
        )}
      </div>

      <div className="p-4 bg-bg-primary border-t border-border-light transition-theme">
        {replyingTo && (
          <div className="flex items-center justify-between mb-2 px-2 py-1 bg-bg-secondary rounded text-xs text-text-secondary">
            <span>Đang trả lời <strong>{usersMap[replyingTo.userId]?.name}</strong></span>
            <button onClick={() => setReplyingTo(null)}><X size={14} /></button>
          </div>
        )}

        {imagePreview && (
          <div className="relative inline-block mb-2 ml-10">
            <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded-lg border border-border-light" />
            <button 
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-secondary text-inverse rounded-full p-0.5 hover:bg-hover shadow-md transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <UserAvatar userId={currentUser.id} src={currentUser.avatar} name={currentUser.name} size="sm" initialStatus={currentUser.status} />
          <div className="flex-1 flex gap-2">
            <div className="flex-1 relative">
              <input
                id="comment-input-main"
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? "Viết câu trả lời..." : "Viết bình luận..."}
                className="w-full bg-bg-secondary rounded-full px-4 py-2 pr-20 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                disabled={isSubmitting}
              />
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <EmojiPicker
                  onEmojiSelect={(emoji) => {
                    const input = document.getElementById('comment-input-main') as HTMLInputElement;
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
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                disabled={isSubmitting}
              >
                <ImageIcon size={18} />
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleImageSelect} 
                className="hidden" 
              />
            </div>
            <button
              type="submit"
              disabled={(!newComment.trim() && !selectedImage) || isSubmitting}
              className="p-2 text-primary-500 hover:bg-primary-50 rounded-full disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <Loading size={20} color="text-white" />
              ) : (
                <Send size={20} />
              )}
            </button>
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
