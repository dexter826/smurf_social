import {
  collection,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  Timestamp,
  serverTimestamp,
  onSnapshot,
  limit,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Post, Visibility, ReactionType, PostStatus, MediaObject } from '../types';
import { chunkArray, batchGetUsers } from '../utils/batchUtils';
import { userService } from './userService';
import { PAGINATION, FIREBASE_LIMITS, IMAGE_COMPRESSION } from '../constants';
import { compressImage, isImageFile } from '../utils/imageUtils';
import { withRetry } from '../utils/retryUtils';
import { uploadWithProgress, ProgressCallback, deleteStorageFiles } from '../utils/uploadUtils';

function convertDocToPost(document: DocumentSnapshot): Post {
  const data = document.data()!;
  return {
    ...data,
    id: document.id,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
    editedAt: data.editedAt as Timestamp | undefined,
    deletedAt: data.deletedAt as Timestamp | undefined,
  } as Post;
}

// Phân quyền hiển thị
function getVisibilityFilter(isOwner: boolean, isFriend: boolean): Visibility[] {
  if (isOwner) {
    return [Visibility.PUBLIC, Visibility.FRIENDS, Visibility.PRIVATE];
  } else if (isFriend) {
    return [Visibility.PUBLIC, Visibility.FRIENDS];
  }
  return [Visibility.PUBLIC];
}

export const postService = {
  // ========== FAN-OUT FEED METHODS ==========

  // Lấy feed từ fan-out
  getFeedFromFanout: async (
    userId: string,
    limitCount: number = PAGINATION.FEED_POSTS,
    lastDoc?: DocumentSnapshot
  ): Promise<{ posts: Post[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }> => {
    try {
      if (!userId) {
        console.warn("getFeedFromFanout: userId is missing");
        return { posts: [], lastDoc: null, hasMore: false };
      }

      // Query feeds subcollection
      let feedQuery = query(
        collection(db, 'users', userId, 'feeds'),
        orderBy('createdAt', 'desc'),
        limit(limitCount + 1)
      );

      if (lastDoc) {
        feedQuery = query(feedQuery, startAfter(lastDoc));
      }

      const feedSnapshot = await getDocs(feedQuery);

      if (feedSnapshot.empty) {
        return { posts: [], lastDoc: null, hasMore: false };
      }

      // Lấy postIds
      const postIds = feedSnapshot.docs.map(doc => doc.data().postId);

      // Batch fetch posts
      const posts: Post[] = [];
      const chunkSize = 10; // Firestore limit

      for (let i = 0; i < postIds.length; i += chunkSize) {
        const chunk = postIds.slice(i, i + chunkSize);
        const postsQuery = query(
          collection(db, 'posts'),
          where('__name__', 'in', chunk),
          where('status', '==', PostStatus.ACTIVE)
        );

        const postsSnapshot = await getDocs(postsQuery);
        posts.push(...postsSnapshot.docs.map(convertDocToPost));
      }

      // Sort by createdAt
      posts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      // Filter banned users
      const authorIds = [...new Set(posts.map(p => p.authorId))];
      const usersMap = await batchGetUsers(authorIds);
      const filteredPosts = posts.filter(p => usersMap[p.authorId]?.status !== 'banned');

      const hasMore = filteredPosts.length > limitCount;
      const finalPosts = filteredPosts.slice(0, limitCount);

      const lastPost = finalPosts[finalPosts.length - 1];
      const lastVisible = lastPost
        ? feedSnapshot.docs.find(d => d.data().postId === lastPost.id) || null
        : null;

      return { posts: finalPosts, lastDoc: lastVisible, hasMore };
    } catch (error) {
      console.error("Lỗi lấy feed từ fan-out", error);
      return { posts: [], lastDoc: null, hasMore: false };
    }
  },

  subscribeToFeedFanout: (
    userId: string,
    callback: (action: 'initial' | 'add' | 'update' | 'remove', posts: Post[]) => void,
    limitCount: number = PAGINATION.FEED_POSTS
  ) => {
    if (!userId) {
      console.warn("subscribeToFeedFanout: thiếu userId");
      callback('initial', []);
      return () => { };
    }

    let isInitialLoad = true;
    const postUnsubscribers = new Map<string, () => void>();

    const feedQuery = query(
      collection(db, 'users', userId, 'feeds'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(feedQuery, async (snapshot) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        const result = await postService.getFeedFromFanout(userId, limitCount);

        result.posts.forEach(p => {
          const existingUnsub = postUnsubscribers.get(p.id);
          if (existingUnsub) existingUnsub();
          
          const postUnsub = onSnapshot(doc(db, 'posts', p.id), (postDoc) => {
            if (postDoc.exists()) {
              const updatedPost = convertDocToPost(postDoc);
              callback('update', [updatedPost]);
            }
          });
          postUnsubscribers.set(p.id, postUnsub);
        });

        callback('initial', result.posts);
        return;
      }

      for (const change of snapshot.docChanges()) {
        const feedData = change.doc.data();
        const postId = feedData.postId;

        if (change.type === 'added') {
          const postDoc = await getDoc(doc(db, 'posts', postId));
          if (postDoc.exists() && postDoc.data().status === PostStatus.ACTIVE) {
            const post = convertDocToPost(postDoc);

            const existingUnsub = postUnsubscribers.get(postId);
            if (existingUnsub) existingUnsub();

            const postUnsub = onSnapshot(doc(db, 'posts', postId), (updatedPostDoc) => {
              if (updatedPostDoc.exists()) {
                const updatedPost = convertDocToPost(updatedPostDoc);
                callback('update', [updatedPost]);
              }
            });
            postUnsubscribers.set(postId, postUnsub);

            callback('add', [post]);
          }
        } else if (change.type === 'removed') {
          const postUnsub = postUnsubscribers.get(postId);
          if (postUnsub) {
            postUnsub();
            postUnsubscribers.delete(postId);
          }

          callback('remove', [{ id: postId } as Post]);
        }
      }
    }, (error) => {
      console.error("Lỗi subscribe feed fan-out", error);
    });

    return () => {
      unsubscribe();
      postUnsubscribers.forEach(unsub => unsub());
      postUnsubscribers.clear();
    };
  },

  // ========== USER POSTS METHODS ==========

  // Lấy bài viết của user
  getUserPosts: async (userId: string, currentUserId: string, friendIds: string[], limitCount: number = PAGINATION.USER_POSTS, lastDoc?: DocumentSnapshot): Promise<{ posts: Post[], lastDoc: DocumentSnapshot | null }> => {
    try {
      const isOwner = userId === currentUserId;
      const isFriend = friendIds?.includes(userId) || false;
      const visibilityFilter = getVisibilityFilter(isOwner, isFriend);

      let q = query(
        collection(db, 'posts'),
        where('authorId', '==', userId),
        where('status', '==', PostStatus.ACTIVE),
        where('visibility', 'in', visibilityFilter),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const user = await userService.getUserById(userId);
      if (user?.status === 'banned') {
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
      where('authorId', '==', userId),
      where('status', '==', PostStatus.ACTIVE),
      where('visibility', 'in', visibilityFilter),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    let unsubscribe: (() => void) | null = null;
    let isCancelled = false;

    const setup = async () => {
      const user = await userService.getUserById(userId);
      if (isCancelled) return;
      if (user?.status === 'banned') {
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
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  },

  // Tạo bài viết mới
  createPost: async (postData: Omit<Post, 'id' | 'createdAt' | 'commentCount' | 'status' | 'reactions'>, predefinedId?: string): Promise<string> => {
    try {
      const postRef = predefinedId ? doc(db, 'posts', predefinedId) : doc(collection(db, 'posts'));
      await setDoc(postRef, {
        authorId: postData.authorId,
        content: postData.content || '',
        visibility: postData.visibility || Visibility.PUBLIC,
        media: postData.media || [],
        status: PostStatus.ACTIVE,
        commentCount: 0,
        isEdited: false,
        editedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return postRef.id;
    } catch (error) {
      console.error("Lỗi tạo bài viết", error);
      throw error;
    }
  },

  generatePostId: () => doc(collection(db, 'posts')).id,

  // Cập nhật nội dung bài viết
  updatePost: async (postId: string, content: string, media: MediaObject[], visibility: Visibility): Promise<void> => {
    try {
      const postRef = doc(db, 'posts', postId);

      const oldSnap = await getDoc(postRef);
      if (oldSnap.exists()) {
        const old = oldSnap.data();
        const oldMediaUrls = (old.media || []).map((m: MediaObject) => m.url);
        const newMediaUrls = media.map(m => m.url);
        const removedUrls = oldMediaUrls.filter((u: string) => !newMediaUrls.includes(u));

        if (removedUrls.length > 0) {
          await deleteStorageFiles(removedUrls);
        }
      }

      await updateDoc(postRef, {
        content,
        media,
        visibility,
        isEdited: true,
        editedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi cập nhật bài viết", error);
      throw error;
    }
  },

  // Xóa bài viết (soft-delete)
  deletePost: async (postId: string, userId: string): Promise<void> => {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        status: PostStatus.DELETED,
        deletedAt: serverTimestamp(),
        deletedBy: userId,
        updatedAt: serverTimestamp()
      });
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
        await setDoc(reactionRef, { type: reaction, createdAt: serverTimestamp() });
      }
      // CF onPostReactionWrite xử lý update Map reactions + notification
    } catch (error) {
      console.error("Lỗi react bài viết", error);
      throw error;
    }
  },

  // Lấy reaction cá nhân tại post
  getMyReactionForPost: async (postId: string, userId: string): Promise<string | null> => {
    try {
      const snap = await getDoc(doc(db, 'posts', postId, 'reactions', userId));
      return snap.exists() ? snap.data().type : null;
    } catch {
      return null;
    }
  },

  // Tải hàng loạt reaction cá nhân
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

      if (data.status === PostStatus.DELETED) return null;

      const isOwner = data.authorId === currentUserId;
      const isFriend = friendIds?.includes(data.authorId) || false;

      if (data.visibility === Visibility.PRIVATE && !isOwner) {
        return null;
      }
      if (data.visibility === Visibility.FRIENDS && !isOwner && !isFriend) {
        return null;
      }

      return {
        ...data,
        id: postSnap.id,
        createdAt: data.createdAt as Timestamp,
        editedAt: data.editedAt as Timestamp | undefined,
      } as Post;
    } catch (error) {
      console.error("Lỗi lấy chi tiết bài viết", error);
      return null;
    }
  },

  // Admin lấy bài viết
  getPostByIdForAdmin: async (postId: string): Promise<Post | null> => {
    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);

      if (!postSnap.exists()) return null;

      const data = postSnap.data();
      return {
        ...data,
        id: postSnap.id,
        createdAt: data.createdAt as Timestamp,
        editedAt: data.editedAt as Timestamp | undefined,
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
  ): Promise<MediaObject[]> => {
    try {
      const media: MediaObject[] = [];
      const totalFiles = files.length;

      for (let i = 0; i < totalFiles; i++) {
        let file = files[i];
        const isVideo = file.type.startsWith('video/');
        const typeFolder = isVideo ? 'videos' : 'images';
        const createdAt = Date.now();
        const fileName = `${createdAt}_${file.name}`;
        const path = `posts/${userId}/${typeFolder}/${fileName}`;
        
        let thumbnailUrl: string | undefined = undefined;

        if (isImageFile(file)) {
          file = await compressImage(file, IMAGE_COMPRESSION.POST);
        } else if (isVideo) {
          // Trích xuất và upload thumbnail
          try {
             const { generateVideoThumbnail } = await import('../utils/uploadUtils');
             const thumbFile = await generateVideoThumbnail(file);
             const thumbPath = `posts/${userId}/thumbnails/${createdAt}_${thumbFile.name}`;
             thumbnailUrl = await uploadWithProgress(thumbPath, thumbFile);
          } catch (e) {
             console.error("Lỗi tạo/up thumbnail:", e);
          }
        }

        const url = await withRetry(() =>
          uploadWithProgress(path, file, (progress) => {
            const fileProgress = progress.progress / 100;
            const overallProgress = ((i + fileProgress) / totalFiles) * 100;
            onProgress?.(overallProgress, i, totalFiles);
          })
        );

        const mediaObject: MediaObject = {
          url,
          fileName,
          mimeType: file.type,
          size: file.size,
          isSensitive: false
        };
        
        if (thumbnailUrl) {
          mediaObject.thumbnailUrl = thumbnailUrl;
        }

        media.push(mediaObject);
      }

      return media;
    } catch (error) {
      console.error("Lỗi upload media", error);
      throw error;
    }
  },

  uploadCommentImage: async (
    file: File,
    userId: string,
    onProgress?: ProgressCallback
  ): Promise<MediaObject> => {
    try {
      // Compress ảnh
      const compressedFile = await compressImage(file, IMAGE_COMPRESSION.COMMENT);

      const createdAt = Date.now();
      const fileName = `comment_img_${createdAt}_${file.name}`;
      const path = `comments/${userId}/images/${fileName}`;

      const url = await withRetry(() => uploadWithProgress(path, compressedFile, onProgress));

      return {
        url,
        fileName,
        mimeType: file.type,
        size: compressedFile.size,
        isSensitive: false,
      };
    } catch (error) {
      console.error("Lỗi upload ảnh bình luận", error);
      throw error;
    }
  }
};

