import { doc, getDoc, setDoc, collection, getDocs, query, where, updateDoc, serverTimestamp, arrayUnion, arrayRemove, onSnapshot, orderBy, limit, startAfter, DocumentSnapshot, getCountFromServer, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User, UserStatus, Visibility, Gender, MediaObject } from '../types';
import { batchGetUsers } from '../utils/batchUtils';
import { compressImage } from '../utils/imageUtils';
import { withRetry } from '../utils/retryUtils';
import { uploadWithProgress, ProgressCallback, deleteStorageFile } from '../utils/uploadUtils';
import { PAGINATION, IMAGE_COMPRESSION } from '../constants';

function convertDocToUser(doc: DocumentSnapshot): User {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    createdAt: data?.createdAt as Timestamp,
    updatedAt: data?.updatedAt as Timestamp | undefined,
    deletedAt: data?.deletedAt as Timestamp | undefined,
    dob: data?.dob as Timestamp | undefined,
  } as User;
}

export const userService = {
  // Lấy thông tin người dùng theo ID
  getUserById: async (id: string): Promise<User | undefined> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', id));
      if (userDoc.exists()) {
        return convertDocToUser(userDoc);
      }
      return undefined;
    } catch (error) {
      console.error("Lỗi lấy thông tin user", error);
      return undefined;
    }
  },



  // Lấy toàn bộ bạn bè
  getAllFriends: async (currentUserId: string): Promise<User[]> => {
    try {
      const snap = await getDocs(collection(db, 'users', currentUserId, 'friends'));
      const friendIds = snap.docs.map(d => d.id);
      if (friendIds.length === 0) return [];
      const friendsMap = await batchGetUsers(friendIds);
      return Object.values(friendsMap).filter(u => u.status !== 'banned');
    } catch (error) {
      console.error("Lỗi lấy danh sách bạn bè", error);
      return [];
    }
  },

  // Đăng ký nhận cập nhật danh sách bạn bè
  subscribeToFriends: (userId: string, callback: (friends: User[]) => void): (() => void) => {
    const friendsRef = collection(db, 'users', userId, 'friends');
    let previousFriendIds: string[] = [];

    return onSnapshot(friendsRef, async (snapshot) => {
      const friendIds = snapshot.docs.map(d => d.id);

      // Skip fetch khi friendIds chưa thay đổi
      const isIdsChanged = friendIds.length !== previousFriendIds.length ||
        !friendIds.every((id) => previousFriendIds.includes(id));

      if (!isIdsChanged && previousFriendIds.length > 0) return;
      previousFriendIds = friendIds;

      if (friendIds.length === 0) {
        callback([]);
        return;
      }

      try {
        const friendsMap = await batchGetUsers(friendIds);
        const friends = Object.values(friendsMap).filter(u => u.status !== 'banned');
        callback(friends);
      } catch (error) {
        console.error("Lỗi fetch friends realtime", error);
      }
    });
  },

  // Cloud Function searchUsers thay thế full collection scan
  searchUsers: async (searchTerm: string, currentUserId: string): Promise<User[]> => {
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const fn = httpsCallable<{ searchTerm: string; currentUserId: string }, { users: User[] }>(functions, 'searchUsers');
      const result = await fn({ searchTerm, currentUserId });
      return result.data.users;
    } catch (error) {
      console.error("Lỗi tìm kiếm người dùng", error);
      return [];
    }
  },

  // Tìm kiếm trong danh sách bạn bè
  searchFriends: async (searchTerm: string, currentUserId: string): Promise<User[]> => {
    try {
      const snap = await getDocs(collection(db, 'users', currentUserId, 'friends'));
      const friendIds = snap.docs.map(d => d.id);
      if (friendIds.length === 0) return [];

      const friendsMap = await batchGetUsers(friendIds);
      const friends = Object.values(friendsMap);

      return friends.filter(friend =>
        friend.status !== 'banned' &&
        (friend.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          friend.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    } catch (error) {
      console.error("Lỗi tìm kiếm bạn bè", error);
      return [];
    }
  },

  // Tạo mới hoặc cập nhật thông tin cá nhân
  updateProfile: async (userId: string, data: Partial<User>): Promise<User> => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      let updatedData: User;
      if (userDoc.exists()) {
        updatedData = {
          ...userDoc.data() as User,
          ...data,
          updatedAt: Timestamp.now(),
        };
      } else {
        updatedData = {
          id: userId,
          fullName: data.fullName || 'Người dùng mới',
          avatar: data.avatar || { url: '', fileName: '', mimeType: '', size: 0 },
          email: data.email || '',
          status: 'active',
          role: data.role || 'user',
          bio: data.bio || '',
          cover: data.cover,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          ...data
        };
      }

      const PRIVATE_FIELDS = ['blockedUserIds', 'fcmTokens'];
      const cleanData = Object.fromEntries(
        Object.entries(updatedData).filter(([k, v]) => v !== undefined && !PRIVATE_FIELDS.includes(k))
      );

      await setDoc(userRef, { ...cleanData, updatedAt: serverTimestamp() }, { merge: true });
      return updatedData;
    } catch (error) {
      console.error("Lỗi cập nhật profile", error);
      throw error;
    }
  },

  // Tải lên ảnh đại diện
  uploadAvatar: async (
    userId: string,
    file: File,
    onProgress?: ProgressCallback
  ): Promise<MediaObject> => {
    try {
      const compressedFile = await compressImage(file, IMAGE_COMPRESSION.AVATAR);

      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${userId}_${Date.now()}.${fileExt}`;
      const path = `avatars/${userId}/${fileName}`;

      // Lấy avatar cũ để xóa sau
      const currentUser = await userService.getUserById(userId);
      const oldAvatarUrl = currentUser?.avatar?.url;

      const downloadURL = await withRetry(() =>
        uploadWithProgress(path, compressedFile, onProgress)
      );

      const mediaObject: MediaObject = {
        url: downloadURL,
        fileName,
        mimeType: file.type,
        size: compressedFile.size,
        isSensitive: false,
      };

      await userService.updateProfile(userId, { avatar: mediaObject });

      if (oldAvatarUrl) await deleteStorageFile(oldAvatarUrl);

      return mediaObject;
    } catch (error) {
      console.error("Lỗi upload avatar", error);
      throw error;
    }
  },

  // Tải lên ảnh bìa
  uploadCoverImage: async (
    userId: string,
    file: File,
    onProgress?: ProgressCallback
  ): Promise<MediaObject> => {
    try {
      const compressedFile = await compressImage(file, IMAGE_COMPRESSION.COVER);

      const fileExt = file.name.split('.').pop();
      const fileName = `cover_${userId}_${Date.now()}.${fileExt}`;
      const path = `covers/${userId}/${fileName}`;

      // Lấy cover cũ để xóa sau
      const currentUser = await userService.getUserById(userId);
      const oldCoverUrl = currentUser?.cover?.url;

      const downloadURL = await withRetry(() =>
        uploadWithProgress(path, compressedFile, onProgress)
      );

      const mediaObject: MediaObject = {
        url: downloadURL,
        fileName,
        mimeType: file.type,
        size: compressedFile.size,
        isSensitive: false,
      };

      await userService.updateProfile(userId, { cover: mediaObject });

      if (oldCoverUrl) await deleteStorageFile(oldCoverUrl);

      return mediaObject;
    } catch (error) {
      console.error("Lỗi upload cover image", error);
      throw error;
    }
  },



  // Lấy thống kê số lượng bài viết
  getUserStats: async (userId: string, currentUserId?: string, friendIds?: string[]): Promise<{ postCount: number }> => {
    try {
      const isOwner = userId === currentUserId;
      const isFriend = friendIds?.includes(userId) || false;

      let visibilityFilter: string[];
      if (isOwner) {
        visibilityFilter = [Visibility.PUBLIC, Visibility.FRIENDS, Visibility.PRIVATE];
      } else if (isFriend) {
        visibilityFilter = [Visibility.PUBLIC, Visibility.FRIENDS];
      } else {
        visibilityFilter = [Visibility.PUBLIC];
      }

      const postsQuery = query(
        collection(db, 'posts'),
        where('authorId', '==', userId),
        where('visibility', 'in', visibilityFilter)
      );

      const postsSnapshot = await getCountFromServer(postsQuery);

      return {
        postCount: postsSnapshot.data().count,
      };
    } catch (error) {
      console.error("Lỗi lấy thống kê user", error);
      return { postCount: 0 };
    }
  },

  // Lấy danh sách bị chặn từ subcollection blockedUsers
  getBlockedUserIds: async (userId: string): Promise<string[]> => {
    try {
      const blockedSnap = await getDocs(collection(db, 'users', userId, 'blockedUsers'));
      return blockedSnap.docs.map(doc => doc.id);
    } catch {
      return [];
    }
  },

  blockUser: async (userId: string, blockedUserId: string): Promise<void> => {
    try {
      await setDoc(
        doc(db, 'users', userId, 'blockedUsers', blockedUserId),
        {
          blockedUid: blockedUserId,
          createdAt: serverTimestamp()
        }
      );
    } catch (error) {
      console.error("Lỗi chặn người dùng", error);
      throw error;
    }
  },

  unblockUser: async (userId: string, blockedUserId: string): Promise<void> => {
    try {
      const blockedDocRef = doc(db, 'users', userId, 'blockedUsers', blockedUserId);
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(blockedDocRef);
    } catch (error) {
      console.error("Lỗi bỏ chặn người dùng", error);
      throw error;
    }
  },

  // Đăng ký nhận cập nhật thông tin người dùng theo thời gian thực
  subscribeToUser: (userId: string, callback: (user: User) => void): (() => void) => {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(convertDocToUser(snapshot));
      }
    });
  },

  // API dành riêng cho Admin - Lấy danh sách users có phân trang
  getAdminUsers: async (
    limitCount: number = PAGINATION.ADMIN_USERS,
    lastVisibleDoc?: DocumentSnapshot
  ): Promise<{ users: User[], lastDoc: DocumentSnapshot | null }> => {
    try {
      const usersRef = collection(db, 'users');
      let q = query(
        usersRef,
        limit(limitCount)
      );

      if (lastVisibleDoc) {
        q = query(q, startAfter(lastVisibleDoc));
      }

      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => convertDocToUser(doc));

      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      return { users, lastDoc };
    } catch (error) {
      console.error("Lỗi lấy danh sách admin users", error);
      throw error;
    }
  },

  // Lấy thống kê tổng hợp cho Admin dashboard
  getAdminStats: async (): Promise<{ total: number, active: number, banned: number }> => {
    try {
      const usersRef = collection(db, 'users');
      // 2 count queries song song thay vì tải toàn bộ docs
      const [totalSnap, bannedSnap] = await Promise.all([
        getCountFromServer(usersRef),
        getCountFromServer(query(usersRef, where('status', '==', 'banned')))
      ]);

      const total = totalSnap.data().count;
      const banned = bannedSnap.data().count;

      return { total, banned, active: total - banned };
    } catch (error) {
      console.error("Lỗi lấy thống kê admin", error);
      return { total: 0, active: 0, banned: 0 };
    }
  },

  // Đăng ký nhận danh sách người dùng cho Admin (Realtime)
  subscribeToAdminUsers: (
    limitCount: number = PAGINATION.ADMIN_USERS,
    callback: (users: User[]) => void,
    onError?: (error: Error) => void
  ): (() => void) => {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => convertDocToUser(doc));
      callback(users);
    }, (error) => {
      if (onError) onError(error);
    });
  }
};