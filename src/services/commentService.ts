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
  arrayUnion, 
  arrayRemove,
  Timestamp,
  limit,
  startAfter,
  DocumentSnapshot,
  increment,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Comment, NotificationType } from '../types';
import { PAGINATION } from '../constants';
import { notificationService } from './notificationService';

export const commentService = {
  // Lấy bình luận gốc
  getRootComments: async (postId: string, blockedUserIds: string[] = [], limitCount: number = PAGINATION.COMMENTS, lastDoc?: DocumentSnapshot) => {
    try {
      let q = query(
        collection(db, 'comments'),
        where('postId', '==', postId),
        where('parentId', '==', null),
        orderBy('timestamp', 'desc'),
        limit(limitCount + 1)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const hasMore = snapshot.docs.length > limitCount;
      const docsToProcess = hasMore ? snapshot.docs.slice(0, limitCount) : snapshot.docs;

      const comments = docsToProcess
        .map(doc => ({
          ...doc.data(),
          id: doc.id,
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }) as Comment)
        .filter(c => !blockedUserIds.includes(c.userId));

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
  getReplies: async (commentId: string, blockedUserIds: string[] = [], limitCount: number = PAGINATION.REPLIES, lastDoc?: DocumentSnapshot) => {
    try {
      let q = query(
        collection(db, 'comments'),
        where('parentId', '==', commentId),
        orderBy('timestamp', 'asc'),
        limit(limitCount + 1)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const hasMore = snapshot.docs.length > limitCount;
      const docsToProcess = hasMore ? snapshot.docs.slice(0, limitCount) : snapshot.docs;

      const replies = docsToProcess
        .map(doc => ({
          ...doc.data(),
          id: doc.id,
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }) as Comment)
        .filter(c => !blockedUserIds.includes(c.userId));

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
    videoUrl?: string
  ): Promise<string> => {
    try {
      const commentData = {
        postId,
        userId,
        content,
        parentId,
        replyToUserId: replyToUserId || null,
        image: imageUrl || null,
        video: videoUrl || null,
        timestamp: Timestamp.now(),
        likes: [],
        replyCount: 0
      };

      const docRef = await addDoc(collection(db, 'comments'), commentData);

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
            data: { postId, commentId: docRef.id, contentSnippet: content.substring(0, 50) }
          });
        }
      } else if (postData && postData.userId !== userId) {
        // Thông báo bình luận bài viết
        await notificationService.createNotification({
          receiverId: postData.userId,
          senderId: userId,
          type: NotificationType.COMMENT_POST,
          data: { postId, commentId: docRef.id, contentSnippet: content.substring(0, 50) }
        });
      }

      return docRef.id;
    } catch (error) {
      console.error("Lỗi thêm comment:", error);
      throw error;
    }
  },

  // Xóa bình luận và phản hồi con
  deleteComment: async (commentId: string, postId: string, parentId?: string | null) => {
    try {
      const batch = writeBatch(db);

      const repliesQuery = query(collection(db, 'comments'), where('parentId', '==', commentId));
      const repliesSnapshot = await getDocs(repliesQuery);
      const repliesToDelete = repliesSnapshot.docs;

      repliesToDelete.forEach(replyDoc => {
        batch.delete(replyDoc.ref);
      });

      batch.delete(doc(db, 'comments', commentId));

      const totalDeleted = 1 + repliesToDelete.length;
      const postRef = doc(db, 'posts', postId);
      batch.update(postRef, {
        commentCount: increment(-totalDeleted)
      });

      if (parentId) {
        const parentRef = doc(db, 'comments', parentId);
        batch.update(parentRef, {
          replyCount: increment(-1)
        });
      }

      await batch.commit();
    } catch (error) {
      console.error("Lỗi xóa comment:", error);
      throw error;
    }
  },

  // Cập nhật nội dung bình luận
  updateComment: async (commentId: string, content: string, imageUrl?: string | null, videoUrl?: string | null) => {
    try {
      const commentRef = doc(db, 'comments', commentId);
      const updateData: any = { content };
      if (imageUrl !== undefined) updateData.image = imageUrl;
      if (videoUrl !== undefined) updateData.video = videoUrl;
      await updateDoc(commentRef, updateData);
    } catch (error) {
      console.error("Lỗi cập nhật comment:", error);
      throw error;
    }
  },

  // Thích bình luận
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
        timestamp: data.timestamp?.toDate() || new Date(),
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
    callback: (action: 'initial' | 'add' | 'update' | 'remove', comments: Comment[]) => void,
    limitCount: number = PAGINATION.COMMENTS
  ) => {
    const convertDocToComment = (docSnap: DocumentSnapshot): Comment => ({
      ...docSnap.data(),
      id: docSnap.id,
      timestamp: docSnap.data()?.timestamp?.toDate() || new Date(),
    } as Comment);

    const rootQuery = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      where('parentId', '==', null),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    let isInitialLoad = true;

    return onSnapshot(rootQuery, (snapshot) => {
      if (isInitialLoad) {
        const comments = snapshot.docs
          .map(convertDocToComment)
          .filter(c => !blockedUserIds.includes(c.userId));
        callback('initial', comments);
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach(change => {
        const comment = convertDocToComment(change.doc);
        if (blockedUserIds.includes(comment.userId)) return;

        if (change.type === 'added') {
          callback('add', [comment]);
        } else if (change.type === 'modified') {
          callback('update', [comment]);
        } else if (change.type === 'removed') {
          callback('remove', [comment]);
        }
      });
    }, (error) => console.error("Lỗi subscribe comments:", error));
  },

  // Theo dõi phản hồi realtime
  subscribeToReplies: (
    parentId: string,
    blockedUserIds: string[] = [],
    callback: (action: 'initial' | 'add' | 'update' | 'remove', replies: Comment[]) => void,
    limitCount: number = PAGINATION.REPLIES
  ) => {
    const convertDocToComment = (docSnap: DocumentSnapshot): Comment => ({
      ...docSnap.data(),
      id: docSnap.id,
      timestamp: docSnap.data()?.timestamp?.toDate() || new Date(),
    } as Comment);

    const q = query(
      collection(db, 'comments'),
      where('parentId', '==', parentId),
      orderBy('timestamp', 'asc'),
      limit(limitCount)
    );

    let isInitialLoad = true;

    return onSnapshot(q, (snapshot) => {
      if (isInitialLoad) {
        const replies = snapshot.docs
          .map(convertDocToComment)
          .filter(c => !blockedUserIds.includes(c.userId));
        callback('initial', replies);
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
