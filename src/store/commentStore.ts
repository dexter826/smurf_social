import { create } from 'zustand';
import { Comment } from '../types';
import { DocumentSnapshot } from 'firebase/firestore';
import { commentService } from '../services/commentService';

interface CommentState {
  rootComments: Record<string, Comment[]>;
  replies: Record<string, Record<string, Comment[]>>;
  
  lastRootDoc: Record<string, DocumentSnapshot | null>;
  hasMoreRoot: Record<string, boolean>;
  
  lastReplyDoc: Record<string, Record<string, DocumentSnapshot | null>>;
  hasMoreReply: Record<string, Record<string, boolean>>;
  
  isLoading: boolean;

  // Service Actions
  fetchRootComments: (postId: string, loadMore?: boolean) => Promise<void>;
  fetchReplies: (postId: string, parentId: string, loadMore?: boolean) => Promise<void>;
  addComment: (postId: string, userId: string, content: string, parentId?: string | null, replyToUserId?: string, imageUrl?: string, videoUrl?: string) => Promise<string>;
  updateComment: (postId: string, commentId: string, content: string, parentId?: string | null, imageUrl?: string | null, videoUrl?: string | null) => Promise<void>;
  deleteComment: (postId: string, commentId: string, parentId?: string | null) => Promise<void>;
  likeComment: (postId: string, commentId: string, userId: string, parentId?: string | null) => Promise<void>;

  // State Setters
  setRootComments: (postId: string, comments: Comment[], lastDoc: DocumentSnapshot | null, hasMore: boolean) => void;
  addRootComments: (postId: string, comments: Comment[], lastDoc: DocumentSnapshot | null, hasMore: boolean) => void;
  setReplies: (postId: string, parentId: string, replies: Comment[], lastDoc: DocumentSnapshot | null, hasMore: boolean) => void;
  addReplies: (postId: string, parentId: string, replies: Comment[], lastDoc: DocumentSnapshot | null, hasMore: boolean) => void;
  clearComments: (postId: string) => void;
  updateCommentInStore: (postId: string, commentId: string, content: string, parentId?: string | null, imageUrl?: string | null, videoUrl?: string | null) => void;
}

export const useCommentStore = create<CommentState>((set, get) => ({
  rootComments: {},
  replies: {},
  lastRootDoc: {},
  hasMoreRoot: {},
  lastReplyDoc: {},
  hasMoreReply: {},
  isLoading: false,

  // ========== SERVICE ACTIONS ==========

  fetchRootComments: async (postId: string, loadMore = false) => {
    const { lastRootDoc, rootComments, isLoading } = get();
    if (isLoading) return;

    set({ isLoading: true });
    try {
      const lastDoc = loadMore ? lastRootDoc[postId] : undefined;
      const result = await commentService.getRootComments(postId, 5, lastDoc || undefined);
      
      if (loadMore) {
        get().addRootComments(postId, result.comments, result.lastDoc, result.hasMore);
      } else {
        get().setRootComments(postId, result.comments, result.lastDoc, result.hasMore);
      }
    } catch (error) {
      console.error('Lỗi fetch root comments:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchReplies: async (postId: string, parentId: string, loadMore = false) => {
    const { lastReplyDoc, isLoading } = get();
    if (isLoading) return;

    set({ isLoading: true });
    try {
      const lastDoc = loadMore ? lastReplyDoc[postId]?.[parentId] : undefined;
      const result = await commentService.getReplies(parentId, 3, lastDoc || undefined);
      
      if (loadMore) {
        get().addReplies(postId, parentId, result.replies, result.lastDoc, result.hasMore);
      } else {
        get().setReplies(postId, parentId, result.replies, result.lastDoc, result.hasMore);
      }
    } catch (error) {
      console.error('Lỗi fetch replies:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addComment: async (postId, userId, content, parentId, replyToUserId, imageUrl, videoUrl) => {
    try {
      const commentId = await commentService.addComment(postId, userId, content, parentId || null, replyToUserId, imageUrl, videoUrl);
      
      // Refresh comments sau khi thêm
      if (parentId) {
        await get().fetchReplies(postId, parentId);
      } else {
        await get().fetchRootComments(postId);
      }
      
      return commentId;
    } catch (error) {
      console.error('Lỗi thêm comment:', error);
      throw error;
    }
  },

  updateComment: async (postId, commentId, content, parentId, imageUrl, videoUrl) => {
    try {
      await commentService.updateComment(commentId, content, imageUrl, videoUrl);
      get().updateCommentInStore(postId, commentId, content, parentId, imageUrl, videoUrl);
    } catch (error) {
      console.error('Lỗi cập nhật comment:', error);
      throw error;
    }
  },

  deleteComment: async (postId, commentId, parentId) => {
    try {
      await commentService.deleteComment(commentId, postId, parentId);
      
      // Refresh comments sau khi xóa
      if (parentId) {
        await get().fetchReplies(postId, parentId);
      } else {
        await get().fetchRootComments(postId);
      }
    } catch (error) {
      console.error('Lỗi xóa comment:', error);
      throw error;
    }
  },

  likeComment: async (postId, commentId, userId, parentId) => {
    const { rootComments, replies } = get();
    
    // Tìm comment hiện tại để check isLiked
    let isLiked = false;
    if (parentId) {
      const comment = replies[postId]?.[parentId]?.find(c => c.id === commentId);
      isLiked = comment?.likes?.includes(userId) || false;
    } else {
      const comment = rootComments[postId]?.find(c => c.id === commentId);
      isLiked = comment?.likes?.includes(userId) || false;
    }

    // Optimistic update
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
      console.error('Lỗi like comment:', error);
      // Rollback nếu lỗi
      if (parentId) {
        await get().fetchReplies(postId, parentId);
      } else {
        await get().fetchRootComments(postId);
      }
    }
  },

  // ========== STATE SETTERS ==========

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

  updateCommentInStore: (postId, commentId, content, parentId, imageUrl, videoUrl) => set((state) => {
    const updateObj = (c: Comment) => ({
      ...c,
      content,
      ...(imageUrl !== undefined && { image: imageUrl }),
      ...(videoUrl !== undefined && { video: videoUrl })
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
