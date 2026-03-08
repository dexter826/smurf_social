import { doc, getDoc, setDoc, collection, getDocs, query, where, updateDoc, serverTimestamp, arrayUnion, arrayRemove, onSnapshot, orderBy, limit, startAfter, DocumentSnapshot, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User, UserStatus, Visibility, Gender } from '../types';
import { batchGetUsers } from '../utils/batchUtils';
import { compressImage } from '../utils/imageUtils';
import { withRetry } from '../utils/retryUtils';
import { uploadWithProgress, ProgressCallback, deleteStorageFile } from '../utils/uploadUtils';
import { PAGINATION, IMAGE_COMPRESSION } from '../constants';
import { convertTimestamp } from '../utils/dateUtils';

// Helper chuyển đổi Firestore document sang User object
function convertDocToUser(doc: DocumentSnapshot): User {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    createdAt: convertTimestamp(data?.createdAt, new Date())!,
    lastSeen: convertTimestamp(data?.lastSeen),
    birthDate: convertTimestamp(data?.birthDate),
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

  // Cập nhật trạng thái trực tuyến và thời gian truy cập
  updateUserStatus: async (userId: string, status: UserStatus): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status,
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái", error);
    }
  },

  // Lấy toàn bộ bạn bè
  getAllFriends: async (currentUserId: string): Promise<User[]> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUserId));
      if (!userDoc.exists()) return [];

      const userData = userDoc.data() as User;
      const friendIds = userData.friendIds || [];

      if (friendIds.length === 0) return [];

      const friendsMap = await batchGetUsers(friendIds);
      return Object.values(friendsMap).filter(u => u.status !== UserStatus.BANNED);
    } catch (error) {
      console.error("Lỗi lấy danh sách bạn bè", error);
      return [];
    }
  },

  // Đăng ký nhận cập nhật danh sách bạn bè
  subscribeToFriends: (userId: string, callback: (friends: User[]) => void): (() => void) => {
    const userRef = doc(db, 'users', userId);
    let previousFriendIds: string[] = [];

    return onSnapshot(userRef, async (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }

      const userData = snapshot.data() as User;
      const friendIds = userData.friendIds || [];

      // Skip fetch khi friendIds chưa thay đổi
      const isIdsChanged = friendIds.length !== previousFriendIds.length ||
        !friendIds.every((id, index) => id === previousFriendIds[index]);

      if (!isIdsChanged && previousFriendIds.length > 0) {
        return;
      }

      previousFriendIds = friendIds;

      if (friendIds.length === 0) {
        callback([]);
        return;
      }

      try {
        const friendsMap = await batchGetUsers(friendIds);
        const friends = Object.values(friendsMap).filter(u => u.status !== UserStatus.BANNED);
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
      const userDoc = await getDoc(doc(db, 'users', currentUserId));
      if (!userDoc.exists()) return [];

      const friendIds = (userDoc.data() as User).friendIds || [];
      if (friendIds.length === 0) return [];

      const friendsMap = await batchGetUsers(friendIds);
      const friends = Object.values(friendsMap);

      return friends.filter(friend =>
        friend.status !== UserStatus.BANNED &&
        (friend.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        updatedData = { ...userDoc.data() as User, ...data };
      } else {
        updatedData = {
          id: userId,
          name: data.name || 'Người dùng mới',
          avatar: data.avatar || '',
          email: data.email || '',
          status: UserStatus.ONLINE,
          bio: data.bio || '',
          coverImage: data.coverImage || '',
          createdAt: new Date(),
          ...data
        };
      }

      const PRIVATE_FIELDS = ['blockedUserIds', 'fcmTokens'];
      const cleanData = Object.fromEntries(
        Object.entries(updatedData).filter(([k, v]) => v !== undefined && !PRIVATE_FIELDS.includes(k))
      );

      await setDoc(userRef, cleanData, { merge: true });
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
  ): Promise<string> => {
    try {
      const compressedFile = await compressImage(file, IMAGE_COMPRESSION.AVATAR);

      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${userId}_${Date.now()}.${fileExt}`;
      const path = `avatars/${userId}/${fileName}`;

      // Lấy avatar cũ để xóa sau
      const currentUser = await userService.getUserById(userId);
      const oldAvatarUrl = currentUser?.avatar;

      const downloadURL = await withRetry(() =>
        uploadWithProgress(path, compressedFile, onProgress)
      );
      await userService.updateProfile(userId, { avatar: downloadURL });

      if (oldAvatarUrl) await deleteStorageFile(oldAvatarUrl);

      return downloadURL;
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
  ): Promise<string> => {
    try {
      const compressedFile = await compressImage(file, IMAGE_COMPRESSION.COVER);

      const fileExt = file.name.split('.').pop();
      const fileName = `cover_${userId}_${Date.now()}.${fileExt}`;
      const path = `covers/${userId}/${fileName}`;

      // Lấy cover cũ để xóa sau
      const currentUser = await userService.getUserById(userId);
      const oldCoverUrl = currentUser?.coverImage;

      const downloadURL = await withRetry(() =>
        uploadWithProgress(path, compressedFile, onProgress)
      );
      await userService.updateProfile(userId, { coverImage: downloadURL });

      if (oldCoverUrl) await deleteStorageFile(oldCoverUrl);

      return downloadURL;
    } catch (error) {
      console.error("Lỗi upload cover image", error);
      throw error;
    }
  },

  deleteAvatar: async (userId: string): Promise<void> => {
    try {
      const currentUser = await userService.getUserById(userId);
      if (currentUser?.avatar) await deleteStorageFile(currentUser.avatar);
      await userService.updateProfile(userId, { avatar: '' });
    } catch (error) {
      console.error("Lỗi xóa avatar", error);
      throw error;
    }
  },

  deleteCoverImage: async (userId: string): Promise<void> => {
    try {
      const currentUser = await userService.getUserById(userId);
      if (currentUser?.coverImage) await deleteStorageFile(currentUser.coverImage);
      await userService.updateProfile(userId, { coverImage: '' });
    } catch (error) {
      console.error("Lỗi xóa cover image", error);
      throw error;
    }
  },

  // Lấy thống kê số lượng bạn bè và bài viết
  getUserStats: async (userId: string, currentUserId?: string, friendIds?: string[]): Promise<{ friendCount: number, postCount: number }> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const friendCount = userId === currentUserId
        ? (userDoc.data()?.friendIds || []).length
        : 0;

      const isOwner = userId === currentUserId;
      const isFriend = friendIds?.includes(userId) || false;

      // Đếm bài viết theo visibility mà người xem có thể thấy
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
        where('userId', '==', userId),
        where('visibility', 'in', visibilityFilter)
      );
      const postsSnapshot = await getDocs(postsQuery);
      const postCount = postsSnapshot.size;

      return { friendCount, postCount };
    } catch (error) {
      console.error("Lỗi lấy thông kê user", error);
      return { friendCount: 0, postCount: 0 };
    }
  },

  // Lấy danh sách bị chặn từ subcollection riêng tư
  getBlockedUserIds: async (userId: string): Promise<string[]> => {
    try {
      const secDoc = await getDoc(doc(db, 'users', userId, 'private', 'security'));
      return secDoc.data()?.blockedUserIds || [];
    } catch {
      return [];
    }
  },

  blockUser: async (userId: string, blockedUserId: string): Promise<void> => {
    try {
      await setDoc(
        doc(db, 'users', userId, 'private', 'security'),
        { blockedUserIds: arrayUnion(blockedUserId) },
        { merge: true }
      );
    } catch (error) {
      console.error("Lỗi chặn người dùng", error);
      throw error;
    }
  },

  unblockUser: async (userId: string, blockedUserId: string): Promise<void> => {
    try {
      await setDoc(
        doc(db, 'users', userId, 'private', 'security'),
        { blockedUserIds: arrayRemove(blockedUserId) },
        { merge: true }
      );
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

  // Khóa tài khoản người dùng
  banUser: async (userId: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: UserStatus.BANNED,
      });
    } catch (error) {
      console.error("Lỗi khóa tài khoản user", error);
      throw error;
    }
  },

  // Mở khóa tài khoản người dùng
  unbanUser: async (userId: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: UserStatus.OFFLINE, // Reset về Offline sau khi unban
      });
    } catch (error) {
      console.error("Lỗi mở khóa tài khoản user", error);
      throw error;
    }
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
        getCountFromServer(query(usersRef, where('status', '==', UserStatus.BANNED)))
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