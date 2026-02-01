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
  increment,
  writeBatch
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { Post, Comment, NotificationType } from '../types';
import { chunkArray } from '../utils/batchUtils';
import { PAGINATION, FIREBASE_LIMITS } from '../constants';
import { notificationService } from './notificationService';
import { compressImage, isImageFile, withRetry } from '../utils/imageUtils';
import { uploadWithProgress, ProgressCallback } from '../utils/uploadUtils';

export const postService = {
  getFeed: async (currentUserId: string, friendIds: string[], blockedUserIds: string[] = [], limitCount: number = PAGINATION.FEED_POSTS, lastDoc?: DocumentSnapshot): Promise<{ posts: Post[], lastDoc: DocumentSnapshot | null, hasMore: boolean }> => {
    try {
      if (!currentUserId) {
        console.warn("getFeed: currentUserId is missing");
        return { posts: [], lastDoc: null, hasMore: false };
      }

      // Lọc blocked users khỏi danh sách bạn bè
      const validFriendIds = friendIds.filter(id => !!id && !blockedUserIds.includes(id));
      
      // Query 1: Lấy TẤT CẢ bài viết của owner
      let ownerQuery = query(
        collection(db, 'posts'),
        where('userId', '==', currentUserId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      if (lastDoc) ownerQuery = query(ownerQuery, startAfter(lastDoc));
      
      const ownerSnapshot = await getDocs(ownerQuery);
      const ownerPosts = ownerSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        editedAt: doc.data().editedAt?.toDate(),
      })) as Post[];
      
      // Query 2: Lấy bài viết của bạn bè (CHỈ visibility='friends')
      let friendPosts: Post[] = [];
      let friendDocs: DocumentSnapshot[] = [];
      
      if (validFriendIds.length > 0) {
        const chunks = chunkArray(validFriendIds, FIREBASE_LIMITS.QUERY_IN_LIMIT);
        
        const friendResults = await Promise.all(
          chunks.map(async (chunk) => {
            let q = query(
              collection(db, 'posts'),
              where('userId', 'in', chunk),
              where('visibility', '==', 'friends'),
              orderBy('timestamp', 'desc'),
              limit(limitCount)
            );
            if (lastDoc) q = query(q, startAfter(lastDoc));
            
            const snapshot = await getDocs(q);
            return {
              docs: snapshot.docs,
              posts: snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
                timestamp: doc.data().timestamp?.toDate() || new Date(),
                editedAt: doc.data().editedAt?.toDate(),
              })) as Post[]
            };
          })
        );
        
        friendPosts = friendResults.flatMap(r => r.posts);
        friendDocs = friendResults.flatMap(r => r.docs);
      }

      // Merge, sort và giới hạn
      const allPosts = [...ownerPosts, ...friendPosts];
      allPosts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      const finalPosts = allPosts.slice(0, limitCount);
      const allDocs = [...ownerSnapshot.docs, ...friendDocs];
      
      const lastPost = finalPosts[finalPosts.length - 1];
      const lastVisible = lastPost ? allDocs.find(d => d.id === lastPost.id) || null : null;
      const hasMore = allPosts.length > limitCount;

      return { posts: finalPosts, lastDoc: lastVisible, hasMore };
    } catch (error) {
      console.error("Lỗi lấy bài viết", error);
      return { posts: [], lastDoc: null, hasMore: false };
    }
  },

  subscribeToFeed: (
    currentUserId: string, 
    friendIds: string[], 
    blockedUserIds: string[] = [],
    callback: (action: 'initial' | 'add' | 'update' | 'remove', posts: Post[]) => void, 
    limitCount: number = PAGINATION.FEED_POSTS
  ) => {
    if (!currentUserId) {
      console.warn("subscribeToFeed: thiếu currentUserId");
      callback('initial', []);
      return () => {};
    }

    // Lọc blocked users
    const validFriendIds = friendIds.filter(id => !!id && !blockedUserIds.includes(id));
    const unsubscribers: (() => void)[] = [];
    let isInitialLoad = true;
    let allCurrentPosts: Post[] = [];

    const convertDocToPost = (doc: DocumentSnapshot): Post => ({
      ...doc.data(),
      id: doc.id,
      timestamp: doc.data()?.timestamp?.toDate() || new Date(),
      editedAt: doc.data()?.editedAt?.toDate(),
    } as Post);

    // Query 1: Posts của owner
    const ownerQuery = query(
      collection(db, 'posts'),
      where('userId', '==', currentUserId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    unsubscribers.push(
      onSnapshot(ownerQuery, (snapshot) => {
        if (isInitialLoad) return;
        
        snapshot.docChanges().forEach(change => {
          const post = convertDocToPost(change.doc);
          if (change.type === 'added') {
            allCurrentPosts = [post, ...allCurrentPosts.filter(p => p.id !== post.id)];
            callback('add', [post]);
          } else if (change.type === 'modified') {
            allCurrentPosts = allCurrentPosts.map(p => p.id === post.id ? post : p);
            callback('update', [post]);
          } else if (change.type === 'removed') {
            allCurrentPosts = allCurrentPosts.filter(p => p.id !== post.id);
            callback('remove', [post]);
          }
        });
      }, (error) => console.error("Lỗi subscribe owner posts", error))
    );

    // Query 2: Posts của bạn bè (chỉ visibility='friends')
    if (validFriendIds.length > 0) {
      const chunks = chunkArray(validFriendIds, FIREBASE_LIMITS.QUERY_IN_LIMIT);
      
      chunks.forEach(chunk => {
        const friendQuery = query(
          collection(db, 'posts'),
          where('userId', 'in', chunk),
          where('visibility', '==', 'friends'),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
        
        unsubscribers.push(
          onSnapshot(friendQuery, (snapshot) => {
            if (isInitialLoad) return;
            
            snapshot.docChanges().forEach(change => {
              const post = convertDocToPost(change.doc);
              if (change.type === 'added') {
                allCurrentPosts = [post, ...allCurrentPosts.filter(p => p.id !== post.id)];
                callback('add', [post]);
              } else if (change.type === 'modified') {
                allCurrentPosts = allCurrentPosts.map(p => p.id === post.id ? post : p);
                callback('update', [post]);
              } else if (change.type === 'removed') {
                allCurrentPosts = allCurrentPosts.filter(p => p.id !== post.id);
                callback('remove', [post]);
              }
            });
          }, (error) => console.error("Lỗi subscribe friend posts", error))
        );
      });
    }

    // Initial load
    const loadInitial = async () => {
      const result = await postService.getFeed(currentUserId, friendIds, blockedUserIds, limitCount);
      allCurrentPosts = result.posts;
      isInitialLoad = false;
      callback('initial', result.posts);
    };
    
    loadInitial();

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  },

  getUserPosts: async (userId: string, currentUserId: string, friendIds: string[], limitCount: number = PAGINATION.USER_POSTS, lastDoc?: DocumentSnapshot): Promise<{ posts: Post[], lastDoc: DocumentSnapshot | null }> => {
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

      // Lọc theo quyền riêng tư
      const filteredPosts = posts.filter(post => {
        const isOwner = userId === currentUserId;
        const isFriend = friendIds?.includes(userId) || false;
        
        if (isOwner) return true;
        if (isFriend) return post.visibility === 'friends';
        
        return false;
      });

      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

      return { posts: filteredPosts, lastDoc: lastVisible };
    } catch (error) {
      console.error("Lỗi lấy bài viết của user", error);
      return { posts: [], lastDoc: null };
    }
  },

  subscribeToUserPosts: (userId: string, currentUserId: string, friendIds: string[], callback: (posts: Post[]) => void, limitCount: number = PAGINATION.USER_POSTS) => {
    const q = query(
      collection(db, 'posts'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        editedAt: doc.data().editedAt?.toDate(),
      })) as Post[];

      // Lọc theo quyền riêng tư
      const filteredPosts = posts.filter(post => {
        const isOwner = userId === currentUserId;
        const isFriend = friendIds?.includes(userId) || false;
        
        if (isOwner) return true;
        if (isFriend) return post.visibility === 'friends';
        
        return false;
      });

      callback(filteredPosts);
    }, (error) => {
      console.error("Lỗi subscribe bài viết của user", error);
    });
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
            console.error("Lỗi xóa media bài viết trên storage", err);
          }
        }
      }

      const commentsQuery = query(collection(db, 'comments'), where('postId', '==', postId));
      const commentsSnapshot = await getDocs(commentsQuery);
      const allComments = commentsSnapshot.docs;

      const commentMediaUrls: string[] = [];
      allComments.forEach(cDoc => {
        const data = cDoc.data();
        if (data.image) commentMediaUrls.push(data.image);
        if (data.video) commentMediaUrls.push(data.video);
      });

      for (const url of commentMediaUrls) {
        try {
          const mediaRef = ref(storage, url);
          await deleteObject(mediaRef);
        } catch (err) {
          console.error("Lỗi xóa media bình luận khi xóa post", err);
        }
      }

      // Xóa mọi thông báo liên quan bài và bình luận
      const commentIds = allComments.map(d => d.id);
      const notificationsToDelete: any[] = [];
      
      const postNotifQuery = query(collection(db, 'notifications'), where('data.postId', '==', postId));
      const postNotifSnap = await getDocs(postNotifQuery);
      notificationsToDelete.push(...postNotifSnap.docs);

      if (commentIds.length > 0) {
        const chunks = chunkArray(commentIds, 30);
        for (const chunk of chunks) {
          const commentNotifQuery = query(collection(db, 'notifications'), where('data.commentId', 'in', chunk));
          const commentNotifSnap = await getDocs(commentNotifQuery);
          notificationsToDelete.push(...commentNotifSnap.docs);
        }
      }

      // Tìm báo cáo chưa xử lý để tự động đóng
      const reportsQuery = query(
        collection(db, 'reports'), 
        where('targetId', '==', postId),
        where('status', '==', 'pending')
      );
      const reportsSnap = await getDocs(reportsQuery);
      const reportIds = reportsSnap.docs.map(d => d.id);

      // Gỡ thông báo báo cáo mới khỏi bảng tin Admin
      const adminReportNotifications: any[] = [];
      if (reportIds.length > 0) {
        const chunks = chunkArray(reportIds, 30);
        for (const chunk of chunks) {
          const q = query(collection(db, 'notifications'), where('data.reportId', 'in', chunk));
          const snap = await getDocs(q);
          adminReportNotifications.push(...snap.docs);
        }
      }

      const batch = writeBatch(db);
      
      reportsSnap.docs.forEach(rDoc => {
        batch.update(rDoc.ref, {
          status: 'resolved',
          resolvedAt: Timestamp.now(),
          resolution: 'Nội dung đã bị xóa bởi người dùng'
        });
      });
      
      notificationsToDelete.forEach(doc => batch.delete(doc.ref));
      adminReportNotifications.forEach(doc => batch.delete(doc.ref));
      allComments.forEach(doc => batch.delete(doc.ref));
      batch.delete(doc(db, 'posts', postId));

      await batch.commit();
    } catch (error) {
      console.error("Lỗi xóa bài viết triệt để:", error);
      throw error;
    }
  },

  likePost: async (postId: string, userId: string, isLiked: boolean): Promise<void> => {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
      });

      // Gửi thông báo nếu là like mới (không phải bỏ like)
      if (!isLiked) {
        const postSnap = await getDoc(postRef);
        const postData = postSnap.data();
        if (postData && postData.userId !== userId) {
          await notificationService.createNotification({
            receiverId: postData.userId,
            senderId: userId,
            type: NotificationType.LIKE_POST,
            data: { postId }
          });
        }
      }
    } catch (error) {
      console.error("Lỗi like bài viết", error);
      throw error;
    }
  },

  getPostById: async (postId: string, currentUserId: string, friendIds: string[]): Promise<Post | null> => {
    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) return null;
      
      const data = postSnap.data();
      const isOwner = data.userId === currentUserId;
      const isFriend = friendIds?.includes(data.userId) || false;

      // Chỉ cho phép xem nếu là chủ hoặc (là bạn bè và bài viết ở chế độ friends)
      if (!isOwner && !(isFriend && data.visibility === 'friends')) {
        return null;
      }

      return {
        ...data,
        id: postSnap.id,
        timestamp: data.timestamp?.toDate() || new Date(),
        editedAt: data.editedAt?.toDate(),
      } as Post;
    } catch (error) {
      console.error("Lỗi lấy chi tiết bài viết", error);
      return null;
    }
  },

  // Admin có thể xem mọi bài viết
  getPostByIdForAdmin: async (postId: string): Promise<Post | null> => {
    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) return null;
      
      const data = postSnap.data();
      return {
        ...data,
        id: postSnap.id,
        timestamp: data.timestamp?.toDate() || new Date(),
        editedAt: data.editedAt?.toDate(),
      } as Post;
    } catch (error) {
      console.error("Lỗi lấy chi tiết bài viết", error);
      return null;
    }
  },

  uploadPostMedia: async (
    files: File[], 
    userId: string,
    onProgress?: (progress: number, fileIndex: number, totalFiles: number) => void
  ): Promise<{ images: string[], videos: string[] }> => {
    try {
      const images: string[] = [];
      const videos: string[] = [];
      const totalFiles = files.length;

      for (let i = 0; i < totalFiles; i++) {
        let file = files[i];
        const isVideo = file.type.startsWith('video/');
        const typeFolder = isVideo ? 'videos' : 'images';
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const path = `posts/${userId}/${typeFolder}/${fileName}`;

        // Compress ảnh trước khi upload
        if (isImageFile(file)) {
          file = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
        }

        const url = await withRetry(() => 
          uploadWithProgress(path, file, (progress) => {
            const fileProgress = progress.progress / 100;
            const overallProgress = ((i + fileProgress) / totalFiles) * 100;
            onProgress?.(overallProgress, i, totalFiles);
          })
        );
        
        if (isVideo) {
          videos.push(url);
        } else {
          images.push(url);
        }
      }

      return { images, videos };
    } catch (error) {
      console.error("Lỗi upload media", error);
      throw error;
    }
  },

  uploadCommentImage: async (
    file: File, 
    userId: string,
    onProgress?: ProgressCallback
  ): Promise<string> => {
    try {
      // Compress ảnh
      const compressedFile = await compressImage(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1280 });
      
      const timestamp = Date.now();
      const fileName = `comment_img_${timestamp}_${file.name}`;
      const path = `comments/${userId}/images/${fileName}`;
      
      return await withRetry(() => uploadWithProgress(path, compressedFile, onProgress));
    } catch (error) {
      console.error("Lỗi upload ảnh bình luận", error);
      throw error;
    }
  },

  uploadCommentVideo: async (
    file: File, 
    userId: string,
    onProgress?: ProgressCallback
  ): Promise<string> => {
    try {
      const timestamp = Date.now();
      const fileName = `comment_vid_${timestamp}_${file.name}`;
      const path = `comments/${userId}/videos/${fileName}`;
      
      return await withRetry(() => uploadWithProgress(path, file, onProgress));
    } catch (error) {
      console.error("Lỗi upload video bình luận", error);
      throw error;
    }
  }
};
