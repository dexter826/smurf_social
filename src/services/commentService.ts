import { 
  collection, 
  addDoc, 
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
import { Comment } from '../types';

export const commentService = {
  getRootComments: async (postId: string, limitCount: number = 5, lastDoc?: DocumentSnapshot) => {
    try {
      let q = query(
        collection(db, 'comments'),
        where('postId', '==', postId),
        where('parentId', '==', null),
        orderBy('timestamp', 'asc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const comments = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as Comment[];

      return {
        comments,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === limitCount
      };
    } catch (error) {
      console.error("Lỗi lấy root comments:", error);
      throw error;
    }
  },

  getReplies: async (commentId: string, limitCount: number = 3, lastDoc?: DocumentSnapshot) => {
    try {
      let q = query(
        collection(db, 'comments'),
        where('parentId', '==', commentId),
        orderBy('timestamp', 'asc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const replies = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as Comment[];

      return {
        replies,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === limitCount
      };
    } catch (error) {
      console.error("Lỗi lấy replies:", error);
      throw error;
    }
  },

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

      return docRef.id;
    } catch (error) {
      console.error("Lỗi thêm comment:", error);
      throw error;
    }
  },

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


  likeComment: async (commentId: string, userId: string, isLiked: boolean) => {
    try {
      const commentRef = doc(db, 'comments', commentId);
      await updateDoc(commentRef, {
        likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
      });
    } catch (error) {
      console.error("Lỗi like comment:", error);
      throw error;
    }
  }
};
