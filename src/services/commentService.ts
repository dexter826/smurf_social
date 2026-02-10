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
  doc, 
  setDoc,
  arrayUnion, 
  arrayRemove,
  Timestamp,
  limit,
  startAfter,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
  increment,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Comment, NotificationType, ReportStatus, UserStatus } from '../types';
import { PAGINATION } from '../constants';
import { notificationService } from './notificationService';
import { batchGetUsers } from '../utils/batchUtils';

function convertDocToComment(docSnap: DocumentSnapshot | QueryDocumentSnapshot<DocumentData>): Comment {
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    createdAt: data?.createdAt?.toDate() || new Date(),
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
  addComment: async (
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
        likes: [],
        replyCount: 0
      };

      let docRefId = preGeneratedId;
      if (preGeneratedId) {
        await setDoc(doc(db, 'comments', preGeneratedId), commentData);
      } else {
        const docRef = await addDoc(collection(db, 'comments'), commentData);
        docRefId = docRef.id;
      }

      if (parentId) {
        const parentRef = doc(db, 'comments', parentId);
        await updateDoc(parentRef, {
          replyCount: increment(1)
        });
      }

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(1)
      });

      // Thông báo cho chủ bài viết hoặc người phản hồi
      const postSnap = await getDoc(postRef);
      const postData = postSnap.data();
      
      if (parentId && replyToUserId) {
        // Thông báo phản hồi bình luận
        if (replyToUserId !== userId) {
          await notificationService.createNotification({
            receiverId: replyToUserId,
            senderId: userId,
            type: NotificationType.REPLY_COMMENT,
            data: { postId, commentId: docRefId!, contentSnippet: content.substring(0, 50) }
          });
        }
      } else if (postData && postData.userId !== userId) {
        // Thông báo bình luận bài viết
        await notificationService.createNotification({
          receiverId: postData.userId,
          senderId: userId,
          type: NotificationType.COMMENT_POST,
          data: { postId, commentId: docRefId!, contentSnippet: content.substring(0, 50) }
        });
      }

      return docRefId!;
    } catch (error) {
      console.error("Lỗi thêm comment:", error);
      throw error;
    }
  },

  // Xóa bình luận, phản hồi con và dữ liệu liên quan
  deleteComment: async (commentId: string, postId: string, parentId?: string | null) => {
    try {
      const commentRef = doc(db, 'comments', commentId);
      const commentSnap = await getDoc(commentRef);
      if (!commentSnap.exists()) return;
      
      const commentData = commentSnap.data() as Comment;
      
      let repliesToDelete: QueryDocumentSnapshot<DocumentData>[] = [];
      try {
        const repliesQuery = query(collection(db, 'comments'), where('parentId', '==', commentId));
        const repliesSnapshot = await getDocs(repliesQuery);
        repliesToDelete = repliesSnapshot.docs;
      } catch (err: unknown) {
        const firestoreError = err as { code?: string };
        if (firestoreError.code !== 'permission-denied') {
          console.warn("Lỗi khi lấy phản hồi để xóa:", err);
        }
      }


      const batch = writeBatch(db);

      // Archive reports thay vì xóa - đánh dấu ORPHANED
      try {
        const reportsQuery = query(
          collection(db, 'reports'), 
          where('targetType', '==', 'comment'),
          where('targetId', '==', commentId)
        );
        const reportsSnapshot = await getDocs(reportsQuery);
        reportsSnapshot.forEach(r => {
          batch.update(r.ref, {
            status: ReportStatus.ORPHANED,
            resolution: 'Nội dung đã bị chủ sở hữu xóa'
          });
        });
      } catch (err) {
        // Bỏ qua lỗi permission
      }

      repliesToDelete.forEach(replyDoc => {
        batch.delete(replyDoc.ref);
      });
      batch.delete(commentRef);

      const totalDeleted = 1 + repliesToDelete.length;
      const postRef = doc(db, 'posts', postId);
      batch.update(postRef, {
        commentCount: increment(-totalDeleted)
      });

      if (parentId) {
        const parentCommentRef = doc(db, 'comments', parentId);
        batch.update(parentCommentRef, {
          replyCount: increment(-1)
        });
      }

      await batch.commit();
    } catch (error) {
      console.error("Lỗi xóa comment triệt để:", error);
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

  // Cập nhật trạng thái Thích cho bình luận.
  likeComment: async (commentId: string, userId: string, isLiked: boolean) => {
    try {
      const commentRef = doc(db, 'comments', commentId);
      await updateDoc(commentRef, {
        likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
      });

      // Gửi thông báo nếu là like mới
      if (!isLiked) {
        const commentSnap = await getDoc(commentRef);
        const commentData = commentSnap.data();
        if (commentData && commentData.userId !== userId) {
          await notificationService.createNotification({
            receiverId: commentData.userId,
            senderId: userId,
            type: NotificationType.LIKE_COMMENT,
            data: { postId: commentData.postId, commentId }
          });
        }
      }
    } catch (error) {
      console.error("Lỗi like comment:", error);
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
        createdAt: data.createdAt?.toDate() || new Date(),
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
