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
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Post, Comment, NotificationType, ReportStatus, UserStatus, Visibility } from '../types';
import { chunkArray, batchGetUsers } from '../utils/batchUtils';
import { userService } from './userService';
import { PAGINATION, FIREBASE_LIMITS, REACTIONS } from '../constants';
import { notificationService } from './notificationService';
import { compressImage, isImageFile, withRetry } from '../utils/imageUtils';
import { uploadWithProgress, ProgressCallback } from '../utils/uploadUtils';

// Định dạng dữ liệu Firestore thành Post object.
function convertDocToPost(doc: DocumentSnapshot): Post {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    createdAt: data?.createdAt?.toDate() || new Date(),
    editedAt: data?.editedAt?.toDate(),
  } as Post;
}

// Tính toán quyền xem dựa trên quan hệ người dùng.
function getVisibilityFilter(isOwner: boolean, isFriend: boolean): Visibility[] {
  if (isOwner) {
    return [Visibility.PUBLIC, Visibility.FRIENDS, Visibility.PRIVATE];
  } else if (isFriend) {
    return [Visibility.PUBLIC, Visibility.FRIENDS];
  }
  return [Visibility.PUBLIC];
}

export const postService = {
  getFeed: async (currentUserId: string, friendIds: string[], blockedUserIds: string[] = [], limitCount: number = PAGINATION.FEED_POSTS, lastDoc?: DocumentSnapshot): Promise<{ posts: Post[], lastDoc: DocumentSnapshot | null, hasMore: boolean }> => {
    try {
      if (!currentUserId) {
        console.warn("getFeed: currentUserId is missing");
        return { posts: [], lastDoc: null, hasMore: false };
      }

      // Loại bỏ người bị chặn
      const validFriendIds = friendIds.filter(id => !!id && !blockedUserIds.includes(id));
      
      let ownerQuery = query(
        collection(db, 'posts'),
        where('userId', '==', currentUserId),
        orderBy('createdAt', 'desc'),
        limit(limitCount + 1) 
      );
      if (lastDoc) ownerQuery = query(ownerQuery, startAfter(lastDoc));
      
      const ownerSnapshot = await getDocs(ownerQuery);
      const ownerPosts = ownerSnapshot.docs.map(convertDocToPost);
      
      let friendPosts: Post[] = [];
      let friendDocs: DocumentSnapshot[] = [];
      
      if (validFriendIds.length > 0) {
        const chunks = chunkArray(validFriendIds, FIREBASE_LIMITS.QUERY_IN_LIMIT);
        
        const friendResults = await Promise.all(
          chunks.map(async (chunk) => {
            let q = query(
              collection(db, 'posts'),
              where('userId', 'in', chunk),
              where('visibility', 'in', [Visibility.FRIENDS, Visibility.PUBLIC]),
              orderBy('createdAt', 'desc'),
              limit(limitCount + 1)
            );
            if (lastDoc) q = query(q, startAfter(lastDoc));
            
            const snapshot = await getDocs(q);
            return {
              docs: snapshot.docs,
              posts: snapshot.docs.map(convertDocToPost)
            };
          })
        );
        
        friendPosts = friendResults.flatMap(r => r.posts);
        friendDocs = friendResults.flatMap(r => r.docs);
      }

      const allPosts = [...ownerPosts, ...friendPosts];
      allPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const authorIds = [...new Set(allPosts.map(p => p.userId))];
      const usersMap = await batchGetUsers(authorIds);
      
      const filteredPosts = allPosts.filter(p => usersMap[p.userId]?.status !== UserStatus.BANNED);
      
      const hasMore = filteredPosts.length > limitCount;
      const finalPosts = filteredPosts.slice(0, limitCount);
      
      const allDocs = [...ownerSnapshot.docs, ...friendDocs];
      const lastPost = finalPosts[finalPosts.length - 1];
      const lastVisible = lastPost ? allDocs.find(d => d.id === lastPost.id) || null : null;

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

    // Sử dụng helper convertDocToPost đã định nghĩa ở đầu file

    // Query 1: Posts của owner
    const ownerQuery = query(
      collection(db, 'posts'),
      where('userId', '==', currentUserId),
      orderBy('createdAt', 'desc'),
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
          where('visibility', 'in', [Visibility.FRIENDS, Visibility.PUBLIC]),
          orderBy('createdAt', 'desc'),
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
      const isOwner = userId === currentUserId;
      const isFriend = friendIds?.includes(userId) || false;
      const visibilityFilter = getVisibilityFilter(isOwner, isFriend);

      let q = query(
        collection(db, 'posts'),
        where('userId', '==', userId),
        where('visibility', 'in', visibilityFilter),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const user = await userService.getUserById(userId);
      if (user?.status === UserStatus.BANNED) {
        return { posts: [], lastDoc: null };
      }

      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(convertDocToPost);

      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

      return { posts, lastDoc: lastVisible };
    } catch (error) {
      console.error("Lỗi lấy bài viết của user", error);
      return { posts: [], lastDoc: null };
    }
  },

  subscribeToUserPosts: (userId: string, currentUserId: string, friendIds: string[], callback: (posts: Post[]) => void, limitCount: number = PAGINATION.USER_POSTS) => {
    const isOwner = userId === currentUserId;
    const isFriend = friendIds?.includes(userId) || false;
    const visibilityFilter = getVisibilityFilter(isOwner, isFriend);

    const q = query(
      collection(db, 'posts'),
      where('userId', '==', userId),
      where('visibility', 'in', visibilityFilter),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    let unsubscribe: (() => void) | null = null;

    const setup = async () => {
      const user = await userService.getUserById(userId);
      if (user?.status === UserStatus.BANNED) {
        callback([]);
        return;
      }

      unsubscribe = onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(convertDocToPost);

        callback(posts);
      }, (error) => {
        console.error("Lỗi subscribe bài viết của user", error);
      });
    };

    setup();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  },

  createPost: async (postData: Omit<Post, 'id' | 'createdAt' | 'commentCount'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, 'posts'), {
        ...postData,
        commentCount: 0,
        createdAt: Timestamp.now(),
        isEdited: false
      });
      return docRef.id;
    } catch (error) {
      console.error("Lỗi tạo bài viết", error);
      throw error;
    }
  },

  updatePost: async (postId: string, content: string, images: string[], videos: string[], visibility: Visibility, videoThumbnails?: Record<string, string>): Promise<void> => {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        content,
        images,
        videos: videos || [],
        videoThumbnails: videoThumbnails || {},
        visibility,
        isEdited: true,
        editedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Lỗi cập nhật bài viết", error);
      throw error;
    }
  },

  deletePost: async (postId: string, _images?: string[], _videos?: string[]): Promise<void> => {
    try {

      const commentsQuery = query(collection(db, 'comments'), where('postId', '==', postId));
      const commentsSnapshot = await getDocs(commentsQuery);
      const allComments = commentsSnapshot.docs;

      const batch = writeBatch(db);

      // Archive reports thay vì xóa - đánh dấu ORPHANED
      try {
        const reportsQuery = query(
          collection(db, 'reports'), 
          where('targetType', '==', 'post'),
          where('targetId', '==', postId)
        );
        const reportsSnapshot = await getDocs(reportsQuery);
        reportsSnapshot.forEach(reportDoc => {
          batch.update(reportDoc.ref, {
            status: ReportStatus.ORPHANED,
            resolution: 'Nội dung đã bị chủ sở hữu xóa'
          });
        });

        // Archive reports của comments thuộc bài viết này
        const commentIds = allComments.map(c => c.id);
        if (commentIds.length > 0) {
          const commentReportsQuery = query(
            collection(db, 'reports'),
            where('targetType', '==', 'comment'),
            where('targetId', 'in', commentIds.slice(0, 30))
          );
          const commentReportsSnapshot = await getDocs(commentReportsQuery);
          commentReportsSnapshot.forEach(reportDoc => {
            batch.update(reportDoc.ref, {
              status: ReportStatus.ORPHANED,
              resolution: 'Nội dung đã bị xóa do bài viết gốc bị xóa'
            });
          });
        }
      } catch (err) {
        // Bỏ qua lỗi permission
      }

      // Xóa notifications liên quan đến bài viết
      await notificationService.deleteNotificationsByPostId(postId);
      
      allComments.forEach(doc => batch.delete(doc.ref));
      batch.delete(doc(db, 'posts', postId));

      await batch.commit();
    } catch (error) {
      console.error("Lỗi xóa bài viết triệt để:", error);
      throw error;
    }
  },

  reactToPost: async (postId: string, userId: string, reaction: string): Promise<void> => {
    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);

      if (postSnap.exists()) {
        const data = postSnap.data();
        const reactions: Record<string, string> = data.reactions || {};
        const currentReaction = reactions[userId];
        
        // Cập nhật trạng thái cảm xúc
        if (reaction === 'REMOVE' || currentReaction === reaction) {
          await updateDoc(postRef, {
            [`reactions.${userId}`]: deleteField()
          });
        } else {
          await updateDoc(postRef, {
            [`reactions.${userId}`]: reaction
          });
        }

        // Gửi thông báo nếu có cảm xúc mới (và không phải là thao tác xóa)
        if (reaction !== 'REMOVE' && !currentReaction && reactions[userId] && data.userId !== userId) {
          await notificationService.createNotification({
            receiverId: data.userId,
            senderId: userId,
            type: NotificationType.LIKE_POST,
            data: { postId }
          });
        }
      }
    } catch (error) {
      console.error("Lỗi react bài viết", error);
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

      // Kiểm tra quyền xem
      if (data.visibility === Visibility.PRIVATE && !isOwner) {
        return null;
      }
      if (data.visibility === Visibility.FRIENDS && !isOwner && !isFriend) {
        return null;
      }

      return {
        ...data,
        id: postSnap.id,
        createdAt: data.createdAt?.toDate() || new Date(),
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
        createdAt: data.createdAt?.toDate() || new Date(),
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
  ): Promise<{ images: string[], videos: string[], videoThumbnails?: Record<string, string> }> => {
    try {
      const images: string[] = [];
      const videos: string[] = [];
      const videoThumbnails: Record<string, string> = {};
      const totalFiles = files.length;

      for (let i = 0; i < totalFiles; i++) {
        let file = files[i];
        const isVideo = file.type.startsWith('video/');
        const typeFolder = isVideo ? 'videos' : 'images';
        const createdAt = Date.now();
        const fileName = `${createdAt}_${file.name}`;
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
          // Cloudinary tự động tạo thumbnail khi đổi đuôi sang .jpg
          const thumbnailUrl = url.replace(/\.[^/.]+$/, ".jpg");
          videoThumbnails[url] = thumbnailUrl;
        } else {
          images.push(url);
        }
      }

      return { images, videos, videoThumbnails };
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
      
      const createdAt = Date.now();
      const fileName = `comment_img_${createdAt}_${file.name}`;
      const path = `comments/${userId}/images/${fileName}`;
      
      return await withRetry(() => uploadWithProgress(path, compressedFile, onProgress));
    } catch (error) {
      console.error("Lỗi upload ảnh bình luận", error);
      throw error;
    }
  }
};
