import { 
  collection, 
  addDoc, 
  getDoc,
  getDocs,
  query, 
  orderBy, 
  where,
  updateDoc, 
  deleteDoc,
  deleteField,
  doc,
  setDoc,
  Timestamp,
  limit,
  startAfter,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Comment, ReactionType, UserStatus } from '../types';
import { PAGINATION } from '../constants';
import { batchGetUsers } from '../utils/batchUtils';
import { convertTimestamp } from '../utils/dateUtils';

function convertDocToComment(docSnap: DocumentSnapshot | QueryDocumentSnapshot<DocumentData>): Comment {
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    createdAt: convertTimestamp(data?.createdAt, new Date())!,
  } as Comment;
}

export const commentService = {
  generateCommentId: () => {
    return doc(collection(db, 'comments')).id;
  },

  getRootComments: async (postId: string, blockedUserIds: string[] = [], limitCount: number = PAGINATION.COMMENTS, lastDoc?: DocumentSnapshot) => {
    try {
      let q = query(
        collection(db, 'comments'),
        where('postId', '==', postId),
        where('parentId', '==', null),
        orderBy('createdAt', 'desc'),
        limit(limitCount + 1)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const hasMore = snapshot.docs.length > limitCount;
      const docsToProcess = hasMore ? snapshot.docs.slice(0, limitCount) : snapshot.docs;

      const authorIds = [...new Set(snapshot.docs.map(d => d.data().userId))];
      const usersMap = await batchGetUsers(authorIds);

      const comments = docsToProcess
        .map(convertDocToComment)
        .filter(c => !blockedUserIds.includes(c.userId) && usersMap[c.userId]?.status !== UserStatus.BANNED);

      return {
        comments,
        lastDoc: docsToProcess[docsToProcess.length - 1] || null,
        hasMore
      };
    } catch (error) {
      console.error("Lỗi lấy root comments:", error);
      throw error;
    }
  },

  // Lấy phản hồi mục
  getReplies: async (postId: string, commentId: string, blockedUserIds: string[] = [], limitCount: number = PAGINATION.REPLIES, lastDoc?: DocumentSnapshot) => {
    try {
      let q = query(
        collection(db, 'comments'),
        where('postId', '==', postId),
        where('parentId', '==', commentId),
        orderBy('createdAt', 'asc'),
        limit(limitCount + 1)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const hasMore = snapshot.docs.length > limitCount;
      const docsToProcess = hasMore ? snapshot.docs.slice(0, limitCount) : snapshot.docs;

      const authorIds = [...new Set(snapshot.docs.map(d => d.data().userId))];
      const usersMap = await batchGetUsers(authorIds);

      const replies = docsToProcess
        .map(convertDocToComment)
        .filter(c => !blockedUserIds.includes(c.userId) && usersMap[c.userId]?.status !== UserStatus.BANNED);

      return {
        replies,
        lastDoc: docsToProcess[docsToProcess.length - 1] || null,
        hasMore
      };
    } catch (error) {
      console.error("Lỗi lấy replies:", error);
      throw error;
    }
  },

  // Tạo bình luận mới
  createComment: async (
    postId: string, 
    userId: string, 
    content: string, 
    parentId: string | null = null,
    replyToUserId?: string,
    imageUrl?: string,
    preGeneratedId?: string
  ): Promise<string> => {
    try {
      const commentData = {
        postId,
        userId,
        content,
        parentId,
        replyToUserId: replyToUserId || null,
        image: imageUrl || null,
        createdAt: Timestamp.now(),
        reactions: {},
        replyCount: 0
      };

      let docRefId = preGeneratedId;
      if (preGeneratedId) {
        await setDoc(doc(db, 'comments', preGeneratedId), commentData);
      } else {
        const docRef = await addDoc(collection(db, 'comments'), commentData);
        docRefId = docRef.id;
      }


      return docRefId!;
    } catch (error) {
      console.error("Lỗi thêm comment:", error);
      throw error;
    }
  },

  // Cloud Function onCommentDeleted xử lý cascade cleanup
  deleteComment: async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (error) {
      console.error("Lỗi xóa comment:", error);
      throw error;
    }
  },

  // Chỉnh sửa nội dung bình luận hiện có.
  updateComment: async (commentId: string, content: string, imageUrl?: string | null) => {
    try {
      const commentRef = doc(db, 'comments', commentId);
      const updateData: Partial<Comment> = { content };
      if (imageUrl !== undefined) updateData.image = imageUrl;
      await updateDoc(commentRef, updateData as DocumentData);
    } catch (error) {
      console.error("Lỗi cập nhật comment:", error);
      throw error;
    }
  },

  reactToComment: async (commentId: string, userId: string, reaction: string | ReactionType) => {
    try {
      const commentRef = doc(db, 'comments', commentId);
      const commentSnap = await getDoc(commentRef);
      if (!commentSnap.exists()) return;

      const data = commentSnap.data();
      const reactions: Record<string, string> = data.reactions || {};
      const currentReaction = reactions[userId];

      if (reaction === 'REMOVE' || currentReaction === reaction) {
        await updateDoc(commentRef, {
          [`reactions.${userId}`]: deleteField()
        });
      } else {
        await updateDoc(commentRef, {
          [`reactions.${userId}`]: reaction
        });
      }
    } catch (error) {
      console.error("Lỗi react comment:", error);
      throw error;
    }
  },

  // Lấy bình luận theo ID
  getCommentById: async (commentId: string): Promise<Comment | null> => {
    try {
      const commentRef = doc(db, 'comments', commentId);
      const commentSnap = await getDoc(commentRef);
      
      if (!commentSnap.exists()) return null;
      
      const data = commentSnap.data();
      return {
        ...data,
        id: commentSnap.id,
        createdAt: convertTimestamp(data.createdAt, new Date())!,
      } as Comment;
    } catch (error) {
      console.error("Lỗi lấy comment:", error);
      return null;
    }
  },

  // Theo dõi bình luận realtime
  subscribeToComments: (
    postId: string,
    blockedUserIds: string[] = [],
    callback: (action: 'initial' | 'add' | 'update' | 'remove', data: Comment[] | { comments: Comment[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }) => void,
    limitCount: number = PAGINATION.COMMENTS
  ) => {

    const rootQuery = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      where('parentId', '==', null),
      orderBy('createdAt', 'desc'),
      limit(limitCount + 1)
    );

    let isInitialLoad = true;

    return onSnapshot(rootQuery, { includeMetadataChanges: true }, async (snapshot) => {
      if (snapshot.metadata.hasPendingWrites && isInitialLoad) return;
      
      const authorIds = [...new Set(snapshot.docs.map(d => d.data().userId))];
      const usersMap = await batchGetUsers(authorIds);

      if (isInitialLoad) {
        const hasMore = snapshot.docs.length > limitCount;
        const docsToProcess = hasMore ? snapshot.docs.slice(0, limitCount) : snapshot.docs;

        const comments = docsToProcess
          .map(convertDocToComment)
          .filter(c => !blockedUserIds.includes(c.userId) && usersMap[c.userId]?.status !== UserStatus.BANNED);
        
        callback('initial', { 
          comments, 
          lastDoc: docsToProcess[docsToProcess.length - 1] || null, 
          hasMore 
        });
        isInitialLoad = false;
        return;
      }

      const changes = snapshot.docChanges();
      const changeUserIds = [...new Set(changes.map(c => c.doc.data().userId))];
      const changeUsersMap = await batchGetUsers(changeUserIds);

      for (const change of changes) {
        const comment = convertDocToComment(change.doc);
        if (blockedUserIds.includes(comment.userId) || changeUsersMap[comment.userId]?.status === UserStatus.BANNED) continue;

        if (change.type === 'added') {
          callback('add', [comment]);
        } else if (change.type === 'modified') {
          callback('update', [comment]);
        } else if (change.type === 'removed') {
          callback('remove', [comment]);
        }
      }
    }, (error) => console.error("Lỗi subscribe comments:", error));
  },

  // Theo dõi phản hồi realtime
  subscribeToReplies: (
    postId: string,
    parentId: string,
    blockedUserIds: string[] = [],
    callback: (action: 'initial' | 'add' | 'update' | 'remove', data: Comment[] | { replies: Comment[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }) => void,
    limitCount: number = PAGINATION.REPLIES
  ) => {
    // Sử dụng helper convertDocToComment đã định nghĩa ở đầu file

    const q = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      where('parentId', '==', parentId),
      orderBy('createdAt', 'asc'),
      limit(limitCount + 1)
    );

    let isInitialLoad = true;

    return onSnapshot(q, { includeMetadataChanges: true }, async (snapshot) => {
      if (snapshot.metadata.hasPendingWrites && isInitialLoad) return;
      
      const authorIds = [...new Set(snapshot.docs.map(d => d.data().userId))];
      const usersMap = await batchGetUsers(authorIds);

      if (isInitialLoad) {
        const hasMore = snapshot.docs.length > limitCount;
        const docsToProcess = hasMore ? snapshot.docs.slice(0, limitCount) : snapshot.docs;

        const replies = docsToProcess
          .map(convertDocToComment)
          .filter(c => !blockedUserIds.includes(c.userId) && usersMap[c.userId]?.status !== UserStatus.BANNED);
        
        callback('initial', {
          replies,
          lastDoc: docsToProcess[docsToProcess.length - 1] || null,
          hasMore
        });
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach(change => {
        const reply = convertDocToComment(change.doc);
        if (blockedUserIds.includes(reply.userId)) return;

        if (change.type === 'added') {
          callback('add', [reply]);
        } else if (change.type === 'modified') {
          callback('update', [reply]);
        } else if (change.type === 'removed') {
          callback('remove', [reply]);
        }
      });
    }, (error) => console.error("Lỗi subscribe replies:", error));
  }
};
