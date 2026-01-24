import { collection, addDoc, getDocs, query, orderBy, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Post } from '../types';

export const postService = {
  getFeed: async (): Promise<Post[]> => {
    try {
      const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as Post[];
    } catch (error) {
      console.error("Lỗi lấy bài viết", error);
      return [];
    }
  },

  createPost: async (postData: Omit<Post, 'id'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, 'posts'), {
        ...postData,
        timestamp: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error("Lỗi tạo bài viết", error);
      throw error;
    }
  },

  likePost: async (postId: string, userId: string, isLiked: boolean): Promise<void> => {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
      });
    } catch (error) {
      console.error("Lỗi like bài viết", error);
    }
  }
};