import { create } from 'zustand';
import { Comment } from '../types';
import { DocumentSnapshot } from 'firebase/firestore';
import { commentService } from '../services/commentService';
import { PAGINATION } from '../constants';

type SortOrder = 'asc' | 'desc';

const mergeOptimisticComments = (
  existing: Comment[],
  incoming: Comment[],
  sortOrder: SortOrder
): { merged: Comment[]; hasChanges: boolean } => {
  const optimisticMatches = new Set<string>();
  
  const updated = existing.map(e => {
    if (e.id.startsWith('temp-')) {
      const match = incoming.find(c => 
        c.userId === e.userId && 
        c.content === e.content &&
        Math.abs(c.createdAt.getTime() - e.createdAt.getTime()) < 30000
      );
      if (match) {
        optimisticMatches.add(match.id);
        return match;
      }
    }
    return e;
  });

  const newItems = incoming.filter(c => 
    !optimisticMatches.has(c.id) && 
    !existing.some(e => e.id === c.id)
  );

  if (newItems.length === 0 && optimisticMatches.size === 0) {
    return { merged: existing, hasChanges: false };
  }

  const merged = [...updated, ...newItems].sort((a, b) => 
    sortOrder === 'desc' 
      ? b.createdAt.getTime() - a.createdAt.getTime()
      : a.createdAt.getTime() - b.createdAt.getTime()
  );
  
  return { merged, hasChanges: true };
};

interface CommentState {
  rootComments: Record<string, Comment[]>;
  replies: Record<string, Record<string, Comment[]>>;
  
  lastRootDoc: Record<string, DocumentSnapshot | null>;
  hasMoreRoot: Record<string, boolean>;
  
  lastReplyDoc: Record<string, Record<string, DocumentSnapshot | null>>;
  hasMoreReply: Record<string, Record<string, boolean>>;
  
  loadingPosts: Record<string, boolean>;

  fetchRootComments: (postId: string, blockedUserIds?: string[], loadMore?: boolean) => Promise<void>;
  fetchReplies: (postId: string, parentId: string, blockedUserIds?: string[], loadMore?: boolean) => Promise<void>;
  subscribeToComments: (postId: string, blockedUserIds?: string[]) => () => void;
  subscribeToReplies: (postId: string, parentId: string, blockedUserIds?: string[]) => () => void;
  addComment: (postId: string, userId: string, content: string, parentId?: string | null, replyToUserId?: string, imageUrl?: string) => Promise<string>;
  updateComment: (postId: string, commentId: string, content: string, parentId?: string | null, imageUrl?: string | null) => Promise<void>;
  deleteComment: (postId: string, commentId: string, parentId?: string | null) => Promise<void>;
  likeComment: (postId: string, commentId: string, userId: string, parentId?: string | null) => Promise<void>;

  setRootComments: (postId: string, comments: Comment[], lastDoc: DocumentSnapshot | null, hasMore: boolean) => void;
  addRootComments: (postId: string, comments: Comment[], lastDoc: DocumentSnapshot | null, hasMore: boolean) => void;
  setReplies: (postId: string, parentId: string, replies: Comment[], lastDoc: DocumentSnapshot | null, hasMore: boolean) => void;
  addReplies: (postId: string, parentId: string, replies: Comment[], lastDoc: DocumentSnapshot | null, hasMore: boolean) => void;
  clearComments: (postId: string) => void;
  updateCommentInStore: (postId: string, commentId: string, content: string, parentId?: string | null, imageUrl?: string | null) => void;
  isLoadingPost: (postId: string) => boolean;
  reset: () => void;
}

export const useCommentStore = create<CommentState>((set, get) => ({
  rootComments: {},
  replies: {},
  lastRootDoc: {},
  hasMoreRoot: {},
  lastReplyDoc: {},
  hasMoreReply: {},
  loadingPosts: {},

  isLoadingPost: (postId: string) => get().loadingPosts[postId] || false,

  reset: () => {
    set({
      rootComments: {},
      replies: {},
      lastRootDoc: {},
      hasMoreRoot: {},
      lastReplyDoc: {},
      hasMoreReply: {},
      loadingPosts: {},
    });
  },

  fetchRootComments: async (postId: string, blockedUserIds: string[] = [], loadMore = false) => {
    const { lastRootDoc, loadingPosts } = get();
    if (loadingPosts[postId]) return;

    set(state => ({ loadingPosts: { ...state.loadingPosts, [postId]: true } }));
    try {
      const lastDoc = loadMore ? lastRootDoc[postId] : undefined;
      const result = await commentService.getRootComments(postId, blockedUserIds, PAGINATION.COMMENTS, lastDoc || undefined);
      
      if (loadMore) {
        get().addRootComments(postId, result.comments, result.lastDoc, result.hasMore);
      } else {
        get().setRootComments(postId, result.comments, result.lastDoc, result.hasMore);
      }
    } catch (error) {
      console.error('Lỗi tải bình luận gốc:', error);
    } finally {
      set(state => ({ loadingPosts: { ...state.loadingPosts, [postId]: false } }));
    }
  },

  fetchReplies: async (postId: string, parentId: string, blockedUserIds: string[] = [], loadMore = false) => {
    const { lastReplyDoc, loadingPosts } = get();
    if (loadingPosts[postId]) return;

    set(state => ({ loadingPosts: { ...state.loadingPosts, [postId]: true } }));
    try {
      const lastDoc = loadMore ? lastReplyDoc[postId]?.[parentId] : undefined;
      const result = await commentService.getReplies(parentId, blockedUserIds, PAGINATION.REPLIES, lastDoc || undefined);
      
      if (loadMore) {
        get().addReplies(postId, parentId, result.replies, result.lastDoc, result.hasMore);
      } else {
        get().setReplies(postId, parentId, result.replies, result.lastDoc, result.hasMore);
      }
    } catch (error) {
      console.error('Lỗi tải phản hồi:', error);
    } finally {
      set(state => ({ loadingPosts: { ...state.loadingPosts, [postId]: false } }));
    }
  },

  subscribeToComments: (postId: string, blockedUserIds: string[] = []) => {
    return commentService.subscribeToComments(
      postId,
      blockedUserIds,
      (action, comments) => {
        set(state => {
          if (action === 'initial') {
            return { rootComments: { ...state.rootComments, [postId]: comments } };
          }
          
          if (action === 'add') {
            const existing = state.rootComments[postId] || [];
            const { merged, hasChanges } = mergeOptimisticComments(existing, comments, 'desc');
            if (!hasChanges) return {};
            return { rootComments: { ...state.rootComments, [postId]: merged } };
          }
          
          if (action === 'update') {
            return {
              rootComments: {
                ...state.rootComments,
                [postId]: (state.rootComments[postId] || []).map(c => {
                  const updated = comments.find(uc => uc.id === c.id);
                  return updated || c;
                })
              }
            };
          }
          
          if (action === 'remove') {
            const removedIds = new Set(comments.map(c => c.id));
            return {
              rootComments: {
                ...state.rootComments,
                [postId]: (state.rootComments[postId] || []).filter(c => !removedIds.has(c.id))
              }
            };
          }
          
          return {};
        });
      }
    );
  },

  subscribeToReplies: (postId: string, parentId: string, blockedUserIds: string[] = []) => {
    return commentService.subscribeToReplies(
      parentId,
      blockedUserIds,
      (action, replies) => {
        set(state => {
          const postReplies = state.replies[postId] || {};
          const currentReplies = postReplies[parentId] || [];

          if (action === 'initial') {
            return {
              replies: {
                ...state.replies,
                [postId]: { ...postReplies, [parentId]: replies }
              }
            };
          }

          if (action === 'add') {
            const { merged, hasChanges } = mergeOptimisticComments(currentReplies, replies, 'asc');
            if (!hasChanges) return {};
            return {
              replies: {
                ...state.replies,
                [postId]: { ...postReplies, [parentId]: merged }
              }
            };
          }

          if (action === 'update') {
            return {
              replies: {
                ...state.replies,
                [postId]: {
                  ...postReplies,
                  [parentId]: currentReplies.map(r => {
                    const updated = replies.find(ur => ur.id === r.id);
                    return updated || r;
                  })
                }
              }
            };
          }

          if (action === 'remove') {
            const removedIds = new Set(replies.map(r => r.id));
            return {
              replies: {
                ...state.replies,
                [postId]: {
                  ...postReplies,
                  [parentId]: currentReplies.filter(r => !removedIds.has(r.id))
                }
              }
            };
          }

          return {};
        });
      }
    );
  },

  addComment: async (postId, userId, content, parentId, replyToUserId, imageUrl) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
      id: tempId,
      postId,
      userId,
      content,
      parentId: parentId || null,
      replyToUserId: replyToUserId || null,
      image: imageUrl || null,
      createdAt: new Date(),
      likes: [],
      replyCount: 0
    };

    // Lưu trạng thái để rollback
    const previousState = { 
      rootComments: { ...get().rootComments },
      replies: { ...get().replies }
    };

    // Thêm ngay vào Store
    if (parentId) {
      set(state => {
        const postReplies = state.replies[postId] || {};
        const parentReplies = postReplies[parentId] || [];
        return {
          replies: {
            ...state.replies,
            [postId]: { ...postReplies, [parentId]: [...parentReplies, optimisticComment] }
          },
          rootComments: {
            ...state.rootComments,
            [postId]: (state.rootComments[postId] || []).map(c => 
              c.id === parentId ? { ...c, replyCount: (c.replyCount || 0) + 1 } : c
            )
          }
        };
      });
    } else {
      set(state => ({
        rootComments: { ...state.rootComments, [postId]: [optimisticComment, ...(state.rootComments[postId] || [])] }
      }));
    }

    try {
      const realId = await commentService.addComment(postId, userId, content, parentId || null, replyToUserId, imageUrl);
      
      // Ghi đè ID thật
      set(state => {
        if (parentId) {
          const postReplies = state.replies[postId] || {};
          const parentReplies = postReplies[parentId] || [];
          
          const exists = parentReplies.some(c => c.id === realId);
          return {
            replies: {
              ...state.replies,
              [postId]: { 
                ...postReplies, 
                [parentId]: exists 
                  ? parentReplies.filter(c => c.id !== tempId)
                  : parentReplies.map(c => c.id === tempId ? { ...c, id: realId } : c)
              }
            }
          };
        } else {
          const currentRoots = state.rootComments[postId] || [];
          const exists = currentRoots.some(c => c.id === realId);
          return {
            rootComments: {
              ...state.rootComments,
              [postId]: exists
                ? currentRoots.filter(c => c.id !== tempId)
                : currentRoots.map(c => c.id === tempId ? { ...c, id: realId } : c)
            }
          };
        }
      });
      
      return realId;
    } catch (error) {
      // Phục hồi khi lỗi
      set(previousState);
      console.error('Lỗi thêm bình luận:', error);
      throw error;
    }
  },

  updateComment: async (postId, commentId, content, parentId, imageUrl) => {
    try {
      await commentService.updateComment(commentId, content, imageUrl);
      get().updateCommentInStore(postId, commentId, content, parentId, imageUrl);
    } catch (error) {
      console.error('Lỗi cập nhật bình luận:', error);
      throw error;
    }
  },

  deleteComment: async (postId, commentId, parentId) => {
    const previousState = { 
      rootComments: { ...get().rootComments },
      replies: { ...get().replies }
    };

    // Xóa ngay lập tức (Optimistic)
    set(state => {
      if (parentId) {
        const postReplies = state.replies[postId] || {};
        const parentReplies = postReplies[parentId] || [];
        return {
          replies: {
            ...state.replies,
            [postId]: { ...postReplies, [parentId]: parentReplies.filter(c => c.id !== commentId) }
          },
          rootComments: {
            ...state.rootComments,
            [postId]: (state.rootComments[postId] || []).map(c => 
              c.id === parentId ? { ...c, replyCount: Math.max(0, (c.replyCount || 0) - 1) } : c
            )
          }
        };
      } else {
        return {
          rootComments: {
            ...state.rootComments,
            [postId]: (state.rootComments[postId] || []).filter(c => c.id !== commentId)
          }
        };
      }
    });

    try {
      await commentService.deleteComment(commentId, postId, parentId);
    } catch (error) {
      set(previousState);
      console.error('Lỗi xóa bình luận:', error);
      throw error;
    }
  },

  likeComment: async (postId, commentId, userId, parentId) => {
    const { rootComments, replies } = get();
    
    // Kiểm tra trạng thái like hiện tại
    let isLiked = false;
    if (parentId) {
      const comment = replies[postId]?.[parentId]?.find(c => c.id === commentId);
      isLiked = comment?.likes?.includes(userId) || false;
    } else {
      const comment = rootComments[postId]?.find(c => c.id === commentId);
      isLiked = comment?.likes?.includes(userId) || false;
    }

    // Cập nhật giao diện ngay lập tức
    set((state) => {
      if (parentId) {
        const postReplies = state.replies[postId] || {};
        const parentReplies = postReplies[parentId] || [];
        const updatedReplies = parentReplies.map(c => {
          if (c.id === commentId) {
            const currentLikes = c.likes || [];
            return {
              ...c,
              likes: isLiked 
                ? currentLikes.filter(id => id !== userId) 
                : [...currentLikes, userId]
            };
          }
          return c;
        });
        return {
          replies: {
            ...state.replies,
            [postId]: { ...postReplies, [parentId]: updatedReplies }
          }
        };
      } else {
        const updatedRoot = (state.rootComments[postId] || []).map(c => {
          if (c.id === commentId) {
            const currentLikes = c.likes || [];
            return {
              ...c,
              likes: isLiked 
                ? currentLikes.filter(id => id !== userId) 
                : [...currentLikes, userId]
            };
          }
          return c;
        });
        return { rootComments: { ...state.rootComments, [postId]: updatedRoot } };
      }
    });

    try {
      await commentService.likeComment(commentId, userId, isLiked);
    } catch (error) {
      console.error('Lỗi thích bình luận:', error);
      // Khôi phục dữ liệu nếu lỗi
      if (parentId) {
        await get().fetchReplies(postId, parentId);
      } else {
        await get().fetchRootComments(postId);
      }
    }
  },

  setRootComments: (postId, comments, lastDoc, hasMore) => set((state) => ({
    rootComments: { ...state.rootComments, [postId]: comments },
    lastRootDoc: { ...state.lastRootDoc, [postId]: lastDoc },
    hasMoreRoot: { ...state.hasMoreRoot, [postId]: hasMore }
  })),

  addRootComments: (postId, comments, lastDoc, hasMore) => set((state) => ({
    rootComments: { ...state.rootComments, [postId]: [...(state.rootComments[postId] || []), ...comments] },
    lastRootDoc: { ...state.lastRootDoc, [postId]: lastDoc },
    hasMoreRoot: { ...state.hasMoreRoot, [postId]: hasMore }
  })),

  setReplies: (postId, parentId, replies, lastDoc, hasMore) => set((state) => ({
    replies: {
      ...state.replies,
      [postId]: { ...(state.replies[postId] || {}), [parentId]: replies }
    },
    lastReplyDoc: {
      ...state.lastReplyDoc,
      [postId]: { ...(state.lastReplyDoc[postId] || {}), [parentId]: lastDoc }
    },
    hasMoreReply: {
      ...state.hasMoreReply,
      [postId]: { ...(state.hasMoreReply[postId] || {}), [parentId]: hasMore }
    }
  })),

  addReplies: (postId, parentId, replies, lastDoc, hasMore) => set((state) => ({
    replies: {
      ...state.replies,
      [postId]: { 
        ...(state.replies[postId] || {}), 
        [parentId]: [...(state.replies[postId]?.[parentId] || []), ...replies] 
      }
    },
    lastReplyDoc: {
      ...state.lastReplyDoc,
      [postId]: { ...(state.lastReplyDoc[postId] || {}), [parentId]: lastDoc }
    },
    hasMoreReply: {
      ...state.hasMoreReply,
      [postId]: { ...(state.hasMoreReply[postId] || {}), [parentId]: hasMore }
    }
  })),

  clearComments: (postId) => set((state) => {
    const { [postId]: _root, ...newRootComments } = state.rootComments;
    const { [postId]: _replies, ...newReplies } = state.replies;
    const { [postId]: _lastRoot, ...newLastRootDoc } = state.lastRootDoc;
    const { [postId]: _hasMoreRoot, ...newHasMoreRoot } = state.hasMoreRoot;
    const { [postId]: _lastReply, ...newLastReplyDoc } = state.lastReplyDoc;
    const { [postId]: _hasMoreReply, ...newHasMoreReply } = state.hasMoreReply;
    return {
      rootComments: newRootComments,
      replies: newReplies,
      lastRootDoc: newLastRootDoc,
      hasMoreRoot: newHasMoreRoot,
      lastReplyDoc: newLastReplyDoc,
      hasMoreReply: newHasMoreReply
    };
  }),

  updateCommentInStore: (postId, commentId, content, parentId, imageUrl) => set((state) => {
    const updateObj = (c: Comment) => ({
      ...c,
      content,
      ...(imageUrl !== undefined && { image: imageUrl })
    });

    if (!parentId) {
      const updatedRoot = (state.rootComments[postId] || []).map(c => 
        c.id === commentId ? updateObj(c) : c
      );
      return { rootComments: { ...state.rootComments, [postId]: updatedRoot } };
    } else {
      const postReplies = state.replies[postId] || {};
      const updatedReplies = (postReplies[parentId] || []).map(r => 
        r.id === commentId ? updateObj(r) : r
      );
      return { 
        replies: { 
          ...state.replies, 
          [postId]: { ...postReplies, [parentId]: updatedReplies } 
        } 
      };
    }
  })
}));
