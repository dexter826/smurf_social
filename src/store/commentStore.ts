import { create } from 'zustand';
import { Comment } from '../types';
import { DocumentSnapshot } from 'firebase/firestore';

interface CommentState {
  // Dữ liệu comment theo postId
  rootComments: Record<string, Comment[]>;
  replies: Record<string, Record<string, Comment[]>>; // postId -> parentId -> Comment[]
  
  // Trạng thái phân trang
  lastRootDoc: Record<string, DocumentSnapshot | null>;
  hasMoreRoot: Record<string, boolean>;
  
  lastReplyDoc: Record<string, Record<string, DocumentSnapshot | null>>;
  hasMoreReply: Record<string, Record<string, boolean>>;

  // Actions
  setRootComments: (postId: string, comments: Comment[], lastDoc: DocumentSnapshot | null, hasMore: boolean) => void;
  addRootComments: (postId: string, comments: Comment[], lastDoc: DocumentSnapshot | null, hasMore: boolean) => void;
  
  setReplies: (postId: string, parentId: string, replies: Comment[], lastDoc: DocumentSnapshot | null, hasMore: boolean) => void;
  addReplies: (postId: string, parentId: string, replies: Comment[], lastDoc: DocumentSnapshot | null, hasMore: boolean) => void;
  
  clearComments: (postId: string) => void;
  updateCommentInStore: (postId: string, commentId: string, content: string, parentId?: string | null, imageUrl?: string | null, videoUrl?: string | null) => void;
}

export const useCommentStore = create<CommentState>((set) => ({
  rootComments: {},
  replies: {},
  lastRootDoc: {},
  hasMoreRoot: {},
  lastReplyDoc: {},
  hasMoreReply: {},

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
    const updateObj = (c: any) => ({
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
