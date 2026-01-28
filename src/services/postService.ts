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
import { chunkArray } from '../utils/batchUtils';
import { PAGINATION, FIREBASE_LIMITS } from '../constants';

export const postService = {
  getFeed: async (currentUserId: string, friendIds: string[], limitCount: number = PAGINATION.FEED_POSTS, lastDoc?: DocumentSnapshot): Promise<{ posts: Post[], lastDoc: DocumentSnapshot | null }> => {
    try {
      if (!currentUserId) {
        console.warn("getFeed: currentUserId is missing");
        return { posts: [], lastDoc: null };
      }

      const allowedUserIds = [currentUserId, ...friendIds.filter(id => !!id)];
      
      // Firestore 'in' giới hạn items, chia thành chunks
      const chunks = chunkArray(allowedUserIds, FIREBASE_LIMITS.QUERY_IN_LIMIT);
      
      // Lấy posts từ tất cả chunks
      const allResults = await Promise.all(
        chunks.map(async (chunk) => {
          let q = query(
            collection(db, 'posts'),
            where('userId', 'in', chunk),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
          );

          if (lastDoc) {
            q = query(q, startAfter(lastDoc));
          }

          const querySnapshot = await getDocs(q);
          return {
            docs: querySnapshot.docs,
            posts: querySnapshot.docs.map(doc => ({
              ...doc.data(),
              id: doc.id,
              timestamp: doc.data().timestamp?.toDate() || new Date(),
              editedAt: doc.data().editedAt?.toDate(),
            })) as Post[]
          };
        })
      );

      // Gộp tất cả posts và sắp xếp theo timestamp
      const allPosts = allResults.flatMap(r => r.posts);
      allPosts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Lấy limitCount posts mới nhất
      const posts = allPosts.slice(0, limitCount);

      // Filter posts theo visibility
      const filteredPosts = posts.filter(post => {
        const isOwner = post.userId === currentUserId;
        const isFriend = friendIds.includes(post.userId);
        
        if (isOwner) return true;
        if (isFriend) return post.visibility === 'friends';
        
        return false;
      });

      // Lấy lastDoc từ kết quả cuối cùng
      const allDocs = allResults.flatMap(r => r.docs);
      const lastVisible = allDocs.length > 0 ? allDocs[allDocs.length - 1] : null;

      return { posts: filteredPosts, lastDoc: lastVisible };
    } catch (error) {
      console.error("Lỗi lấy bài viết", error);
      return { posts: [], lastDoc: null };
    }
  },

  subscribeToFeed: (currentUserId: string, friendIds: string[], callback: (posts: Post[]) => void, limitCount: number = PAGINATION.FEED_POSTS) => {
    if (!currentUserId) {
      console.warn("subscribeToFeed: currentUserId is missing");
      callback([]);
      return () => {};
    }

    const allowedUserIds = [currentUserId, ...friendIds.filter(id => !!id)];
    const chunks = chunkArray(allowedUserIds, 10);

    // Subscribe tới tất cả chunks
    const unsubscribers = chunks.map(chunk => {
      const q = query(
        collection(db, 'posts'),
        where('userId', 'in', chunk),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      return onSnapshot(q, () => {
        // Khi có thay đổi, gọi callback để trigger reload
        // Điều này sẽ trigger tất cả subscribers, nhưng đơn giản hơn
        refreshFeed();
      }, (error) => {
        console.error("Lỗi subscribe posts", error);
      });
    });

    // Function để refresh toàn bộ feed
    const refreshFeed = async () => {
      try {
        const allResults = await Promise.all(
          chunks.map(async (chunk) => {
            const q = query(
              collection(db, 'posts'),
              where('userId', 'in', chunk),
              orderBy('timestamp', 'desc'),
              limit(limitCount)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
              ...doc.data(),
              id: doc.id,
              timestamp: doc.data().timestamp?.toDate() || new Date(),
              editedAt: doc.data().editedAt?.toDate(),
            })) as Post[];
          })
        );

        const allPosts = allResults.flat();
        allPosts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        // Filter posts theo visibility
        const posts = allPosts.filter(post => {
          const isOwner = post.userId === currentUserId;
          const isFriend = friendIds.includes(post.userId);
          
          if (isOwner) return true;
          if (isFriend) return post.visibility === 'friends';
          
          return false;
        }).slice(0, limitCount);
        
        callback(posts);
      } catch (error) {
        console.error("Lỗi refresh feed", error);
      }
    };

    // Initial load
    refreshFeed();

    // Return unsubscribe function
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  },

  getUserPosts: async (userId: string, limitCount: number = PAGINATION.USER_POSTS, lastDoc?: DocumentSnapshot): Promise<{ posts: Post[], lastDoc: DocumentSnapshot | null }> => {
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
  }
};
