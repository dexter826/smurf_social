import React, { useState, useEffect } from 'react';
import { X, Send, Heart, Loader2 } from 'lucide-react';
import { Avatar, Button } from '../ui';
import { Comment, User } from '../../types';
import { postService } from '../../services/postService';
import { userService } from '../../services/userService';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface CommentSectionProps {
  postId: string;
  currentUser: User;
  onClose: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  currentUser,
  onClose
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await postService.addComment(postId, currentUser.id, newComment);
      setNewComment('');
    } catch (error) {
      console.error('Lỗi thêm comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;

    try {
      await postService.deleteComment(commentId, postId);
    } catch (error) {
      console.error('Lỗi xóa comment:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Bình luận ({comments.length})
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary-500" size={32} />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-medium">Chưa có bình luận nào</p>
              <p className="text-sm mt-2">Hãy là người đầu tiên bình luận</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const author = usersMap[comment.userId];
                const isOwner = comment.userId === currentUser.id;

                return (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar
                      src={author?.avatar}
                      name={author?.name || 'User'}
                      size="sm"
                    />
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-2xl px-4 py-2 inline-block max-w-full">
                        <h4 className="font-semibold text-sm text-gray-900">
                          {author?.name || 'Unknown User'}
                        </h4>
                        <p className="text-sm text-gray-800 mt-1 break-words">
                          {comment.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 ml-4 text-xs text-gray-500">
                        <span>
                          {formatDistanceToNow(comment.timestamp, {
                            addSuffix: true,
                            locale: vi
                          })}
                        </span>
                        {isOwner && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="hover:underline"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Viết bình luận..."
                className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="p-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
