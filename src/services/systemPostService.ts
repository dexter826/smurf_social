import { doc, setDoc, collection, Timestamp, query, where, orderBy, limit, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Post, PostStatus, Visibility, PostType, MediaObject } from '../../shared/types';

/** Dịch vụ tạo bài viết hệ thống */
export const systemPostService = {
  /** Tạo bài viết cập nhật hồ sơ */
  createProfileUpdatePost: async (params: {
    userId: string;
    type: PostType.AVATAR_UPDATE | PostType.COVER_UPDATE;
    media: MediaObject[];
    visibility: Visibility;
  }): Promise<string> => {
    try {
      const postRef = doc(collection(db, 'posts'));
      
      const dataToSave: Partial<Post> = {
        authorId: params.userId,
        type: params.type,
        content: '', 
        status: PostStatus.ACTIVE,
        visibility: params.visibility,
        media: params.media,
        commentCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(postRef, dataToSave);
      return postRef.id;
    } catch (error) {
      console.error("[systemPostService] Lỗi tạo bài viết hệ thống:", error);
      throw error;
    }
  },

  /** Xóa bài viết cập nhật hồ sơ khi gỡ ảnh. */
  deleteLatestProfileUpdatePost: async (userId: string, type: PostType.AVATAR_UPDATE | PostType.COVER_UPDATE): Promise<void> => {
    try {
      const q = query(
        collection(db, 'posts'),
        where('authorId', '==', userId),
        where('type', '==', type),
        where('status', '==', PostStatus.ACTIVE),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = doc(db, 'posts', snap.docs[0].id);
        await updateDoc(docRef, {
          status: PostStatus.DELETED,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error("[systemPostService] Lỗi xóa bài viết hệ thống:", error);
      throw error;
    }
  }
};
