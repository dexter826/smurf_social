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
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Comment, NotificationType } from '../types';
import { PAGINATION } from '../constants';
import { notificationService } from './notificationService';

export const commentService = {
  // Lấy danh sách bình luận gốc của bài viết
  getRootComments: async (postId: string, limitCount: number = PAGINATION.COMMENTS, lastDoc?: DocumentSnapshot) => {
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

      const comments = docsToProcess.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as Comment[];

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

  // Lấy các phản hồi của một bình luận
  getReplies: async (commentId: string, limitCount: number = PAGINATION.REPLIES, lastDoc?: DocumentSnapshot) => {
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

      const replies = docsToProcess.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as Comment[];

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

  // Tạo bình luận mới và cập nhật số lượng
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

      // Gửi thông báo cho chủ bài viết hoặc người được phản hồi
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

  // Xóa bình luận và toàn bộ phản hồi con
  deleteComment: async (commentId: string, postId: string, parentId?: string | null) => {
    try {
      const repliesQuery = query(collection(db, 'comments'), where('parentId', '==', commentId));
      const repliesSnapshot = await getDocs(repliesQuery);
      const repliesToDelete = repliesSnapshot.docs;

      const deletePromises = repliesToDelete.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      await deleteDoc(doc(db, 'comments', commentId));

      const totalDeleted = 1 + repliesToDelete.length;
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(-totalDeleted)
      });

      if (parentId) {
        const parentRef = doc(db, 'comments', parentId);
        await updateDoc(parentRef, {
          replyCount: increment(-1)
        });
      }
    } catch (error) {
      console.error("Lỗi xóa comment:", error);
      throw error;
    }
  },

  // Chỉnh sửa nội dung hoặc đính kèm của bình luận
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

  // Cập nhật trạng thái yêu thích bình luận
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

  // Lấy chi tiết comment theo ID (cho admin)
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
  }
};
