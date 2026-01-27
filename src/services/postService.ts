import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  query, 
  orderBy, 
  where,
  updateDoc, 
  deleteDoc,
  doc, 
  arrayUnion, 
  arrayRemove,
  Timestamp,
  onSnapshot,
  limit,
  startAfter,
  DocumentSnapshot,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { Post, Comment } from '../types';

export const postService = {
  getFeed: async (currentUserId: string, friendIds: string[], limitCount: number = 10, lastDoc?: DocumentSnapshot): Promise<{ posts: Post[], lastDoc: DocumentSnapshot | null }> => {
    try {
      if (!currentUserId) {
        console.warn("getFeed: currentUserId is missing");
        return { posts: [], lastDoc: null };
      }

      const allowedUserIds = [currentUserId, ...friendIds.filter(id => !!id)].slice(0, 30);
      
      let q = query(
        collection(db, 'posts'),
        where('userId', 'in', allowedUserIds),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      const allPosts = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        editedAt: doc.data().editedAt?.toDate(),
      })) as Post[];

      // Filter posts theo visibility
      const posts = allPosts.filter(post => {
        const isOwner = post.userId === currentUserId;
        const isFriend = friendIds.includes(post.userId);
        
        if (isOwner) return true;
        if (isFriend) return post.visibility === 'friends';
        
        return false;
      });

      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

      return { posts, lastDoc: lastVisible };
    } catch (error) {
      console.error("Lỗi lấy bài viết", error);
      return { posts: [], lastDoc: null };
    }
  },

  subscribeToFeed: (currentUserId: string, friendIds: string[], callback: (posts: Post[]) => void, limitCount: number = 20) => {
    if (!currentUserId) {
      console.warn("subscribeToFeed: currentUserId is missing");
      callback([]);
      return () => {};
    }

    const allowedUserIds = [currentUserId, ...friendIds.filter(id => !!id)].slice(0, 30);

    const q = query(
      collection(db, 'posts'),
      where('userId', 'in', allowedUserIds),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const allPosts = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        editedAt: doc.data().editedAt?.toDate(),
      })) as Post[];
      
      // Filter posts theo visibility
      const posts = allPosts.filter(post => {
        const isOwner = post.userId === currentUserId;
        const isFriend = friendIds.includes(post.userId);
        
        if (isOwner) return true;
        if (isFriend) return post.visibility === 'friends';
        
        return false;
      });
      
      callback(posts);
    }, (error) => {
      console.error("Lỗi subscribe posts", error);
    });
  },

  getUserPosts: async (userId: string, limitCount: number = 10, lastDoc?: DocumentSnapshot): Promise<{ posts: Post[], lastDoc: DocumentSnapshot | null }> => {
    try {
      let q = query(
        collection(db, 'posts'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        editedAt: doc.data().editedAt?.toDate(),
      })) as Post[];

      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

      return { posts, lastDoc: lastVisible };
    } catch (error) {
      console.error("Lỗi lấy bài viết của user", error);
      return { posts: [], lastDoc: null };
    }
  },

  createPost: async (postData: Omit<Post, 'id' | 'timestamp' | 'commentCount'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, 'posts'), {
        ...postData,
        commentCount: 0,
        timestamp: Timestamp.now(),
        edited: false
      });
      return docRef.id;
    } catch (error) {
      console.error("Lỗi tạo bài viết", error);
      throw error;
    }
  },

  updatePost: async (postId: string, content: string, images: string[], videos: string[], visibility: 'friends' | 'private'): Promise<void> => {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        content,
        images,
        videos: videos || [],
        visibility,
        edited: true,
        editedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Lỗi cập nhật bài viết", error);
      throw error;
    }
  },

  deletePost: async (postId: string, images?: string[], videos?: string[]): Promise<void> => {
    try {
      const allMedia = [...(images || []), ...(videos || [])];
      if (allMedia.length > 0) {
        for (const url of allMedia) {
          try {
            const mediaRef = ref(storage, url);
            await deleteObject(mediaRef);
          } catch (err) {
            console.error("Lỗi xóa media trên storage", err);
          }
        }
      }

      await deleteDoc(doc(db, 'posts', postId));

      const commentsQuery = query(collection(db, 'comments'), where('postId', '==', postId));
      const commentsSnapshot = await getDocs(commentsQuery);
      const deletePromises = commentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Lỗi xóa bài viết", error);
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
      throw error;
    }
  },

  uploadPostMedia: async (files: File[], userId: string): Promise<{ images: string[], videos: string[] }> => {
    try {
      const images: string[] = [];
      const videos: string[] = [];

      const uploadPromises = files.map(async (file) => {
        const isVideo = file.type.startsWith('video/');
        const typeFolder = isVideo ? 'videos' : 'images';
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const storageRef = ref(storage, `posts/${userId}/${typeFolder}/${fileName}`);
        
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        if (isVideo) {
          videos.push(url);
        } else {
          images.push(url);
        }
      });

      await Promise.all(uploadPromises);
      return { images, videos };
    } catch (error) {
      console.error("Lỗi upload media", error);
      throw error;
    }
  },

  getComments: async (postId: string): Promise<Comment[]> => {
    try {
      const q = query(
        collection(db, 'comments'),
        where('postId', '==', postId),
        orderBy('timestamp', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as Comment[];
    } catch (error) {
      console.error("Lỗi lấy comments", error);
      return [];
    }
  },

  subscribeToComments: (postId: string, callback: (comments: Comment[]) => void) => {
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as Comment[];
      callback(comments);
    }, (error) => {
      console.error("Lỗi subscribe comments", error);
    });
  },

  addComment: async (postId: string, userId: string, content: string, parentId?: string, imageUrl?: string, videoUrl?: string): Promise<void> => {
    try {
      await addDoc(collection(db, 'comments'), {
        postId,
        userId,
        content,
        parentId: parentId || null,
        image: imageUrl || null,
        video: videoUrl || null,
        timestamp: Timestamp.now(),
        likes: []
      });

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(1)
      });
    } catch (error) {
      console.error("Lỗi thêm comment", error);
      throw error;
    }
  },

  uploadCommentImage: async (file: File, userId: string): Promise<string> => {
    try {
      const timestamp = Date.now();
      const fileName = `comment_img_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `comments/${userId}/images/${fileName}`);
      
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Lỗi upload ảnh bình luận", error);
      throw error;
    }
  },

  uploadCommentVideo: async (file: File, userId: string): Promise<string> => {
    try {
      const timestamp = Date.now();
      const fileName = `comment_vid_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `comments/${userId}/videos/${fileName}`);
      
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Lỗi upload video bình luận", error);
      throw error;
    }
  },

  updateComment: async (commentId: string, content: string): Promise<void> => {
    try {
      const commentRef = doc(db, 'comments', commentId);
      await updateDoc(commentRef, { content });
    } catch (error) {
      console.error("Lỗi cập nhật comment", error);
      throw error;
    }
  },

  deleteComment: async (commentId: string, postId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'comments', commentId));

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(-1)
      });
    } catch (error) {
      console.error("Lỗi xóa comment", error);
      throw error;
    }
  },

  likeComment: async (commentId: string, userId: string, isLiked: boolean): Promise<void> => {
    try {
      const commentRef = doc(db, 'comments', commentId);
      await updateDoc(commentRef, {
        likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
      });
    } catch (error) {
      console.error("Lỗi like comment", error);
      throw error;
    }
  }
};