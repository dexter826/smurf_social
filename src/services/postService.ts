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
  setDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  serverTimestamp,
  onSnapshot,
  limit,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Post, UserStatus, Visibility, ReactionType, PostType, PostStatus } from '../types';
import { chunkArray, batchGetUsers } from '../utils/batchUtils';
import { userService } from './userService';
import { PAGINATION, FIREBASE_LIMITS, IMAGE_COMPRESSION } from '../constants';
import { compressImage, isImageFile } from '../utils/imageUtils';
import { withRetry } from '../utils/retryUtils';
import { uploadWithProgress, ProgressCallback, deleteStorageFiles } from '../utils/uploadUtils';
import { convertTimestamp } from '../utils/dateUtils';

// Định dạng dữ liệu Firestore thành Post object.
function convertDocToPost(doc: DocumentSnapshot): Post {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    createdAt: convertTimestamp(data?.createdAt, new Date())!,
    editedAt: convertTimestamp(data?.editedAt),
    deletedAt: convertTimestamp(data?.deletedAt),
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
        where('status', '==', PostStatus.ACTIVE),
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
              where('status', '==', PostStatus.ACTIVE),
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
      return () => { };
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
      where('status', '==', PostStatus.ACTIVE),
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
          where('status', '==', PostStatus.ACTIVE),
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
        where('status', '==', PostStatus.ACTIVE),
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
      where('status', '==', PostStatus.ACTIVE),
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

  createPost: async (postData: Omit<Post, 'id' | 'createdAt' | 'commentCount' | 'status'>, customId?: string): Promise<string> => {
    try {
      const postRef = customId ? doc(db, 'posts', customId) : doc(collection(db, 'posts'));
      await setDoc(postRef, {
        ...postData,
        type: postData.type || PostType.NORMAL,
        status: PostStatus.ACTIVE,
        commentCount: 0,
        createdAt: Timestamp.now(),
        isEdited: false
      });
      return postRef.id;
    } catch (error) {
      console.error("Lỗi tạo bài viết", error);
      throw error;
    }
  },

  generatePostId: () => doc(collection(db, 'posts')).id,

  updatePost: async (postId: string, content: string, images: string[], videos: string[], visibility: Visibility, videoThumbnails?: Record<string, string>): Promise<void> => {
    try {
      const postRef = doc(db, 'posts', postId);

      // Xóa media bị loại bỏ khi edit
      const oldSnap = await getDoc(postRef);
      if (oldSnap.exists()) {
        const old = oldSnap.data();
        const removedImages = (old.images || []).filter((u: string) => !images.includes(u));
        const removedVideos = (old.videos || []).filter((u: string) => !videos.includes(u));
        const removedThumbs = removedVideos.map((v: string) => old.videoThumbnails?.[v]).filter(Boolean);
        await deleteStorageFiles([...removedImages, ...removedVideos, ...removedThumbs]);
      }

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

  // Soft delete - đánh dấu xóa thay vì xóa hẳn
  deletePost: async (postId: string, userId: string): Promise<void> => {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        status: PostStatus.DELETED,
        deletedAt: serverTimestamp(),
        deletedBy: userId
      });

      // Cleanup related notifications
      const notifQuery = query(
        collection(db, 'notifications'),
        where('data.postId', '==', postId)
      );

      const snapshot = await getDocs(notifQuery);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Lỗi xóa bài viết", error);
      throw error;
    }
  },

  reactToPost: async (postId: string, userId: string, reaction: string | ReactionType): Promise<void> => {
    try {
      const reactionRef = doc(db, 'posts', postId, 'reactions', userId);
      const snap = await getDoc(reactionRef);
      const current = snap.exists() ? snap.data().type : null;

      if (reaction === 'REMOVE' || current === reaction) {
        await deleteDoc(reactionRef);
      } else {
        await setDoc(reactionRef, { type: reaction });
      }
      // CF onPostReactionWrite xử lý counter + notification
    } catch (error) {
      console.error("Lỗi react bài viết", error);
      throw error;
    }
  },

  // Lấy reaction của user hiện tại trên một post.
  getMyReactionForPost: async (postId: string, userId: string): Promise<string | null> => {
    try {
      const snap = await getDoc(doc(db, 'posts', postId, 'reactions', userId));
      return snap.exists() ? snap.data().type : null;
    } catch {
      return null;
    }
  },

  // Batch load myReaction cho danh sách posts.
  batchLoadMyReactions: async (postIds: string[], userId: string): Promise<Record<string, string>> => {
    const results: Record<string, string> = {};
    await Promise.all(
      postIds.map(async (postId) => {
        const snap = await getDoc(doc(db, 'posts', postId, 'reactions', userId));
        if (snap.exists()) results[postId] = snap.data().type;
      })
    );
    return results;
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
        createdAt: convertTimestamp(data.createdAt, new Date())!,
        editedAt: convertTimestamp(data.editedAt),
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
        createdAt: convertTimestamp(data.createdAt, new Date())!,
        editedAt: convertTimestamp(data.editedAt),
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
          file = await compressImage(file, IMAGE_COMPRESSION.POST);
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
          // Cloud Function generateVideoThumbnail tự động tạo thumbnail
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
      const compressedFile = await compressImage(file, IMAGE_COMPRESSION.COMMENT);

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
