import { doc, getDoc, setDoc, collection, getDocs, query, where, updateDoc, serverTimestamp, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User, UserStatus } from '../types';
import { batchGetUsers } from '../utils/batchUtils';
import { compressImage, withRetry } from '../utils/imageUtils';
import { uploadWithProgress, ProgressCallback } from '../utils/uploadUtils';

export const userService = {
  // Lấy thông tin người dùng theo ID
  getUserById: async (id: string): Promise<User | undefined> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', id));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          ...data,
          id: userDoc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          lastSeen: data.lastSeen?.toDate ? data.lastSeen.toDate() : data.lastSeen,
        } as User;
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

  // Lấy danh sách toàn bộ bạn bè
  getAllFriends: async (currentUserId: string): Promise<User[]> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUserId));
      if (!userDoc.exists()) return [];
      
      const userData = userDoc.data() as User;
      const friendIds = userData.friendIds || [];
      
      if (friendIds.length === 0) return [];

      const friendsMap = await batchGetUsers(friendIds);
      return Object.values(friendsMap);
    } catch (error) {
      console.error("Lỗi lấy danh sách bạn bè", error);
      return [];
    }
  },

  // Tìm kiếm người dùng theo email
  searchUsers: async (searchTerm: string, currentUserId: string): Promise<User[]> => {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const users = querySnapshot.docs
        .map(doc => doc.data() as User)
        .filter(user => 
          user.id !== currentUserId &&
          user.email?.toLowerCase() === searchTerm.toLowerCase()
        );
      
      return users;
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
        friend.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        friend.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
          avatar: data.avatar || `https://i.pravatar.cc/150?u=${userId}`,
          email: data.email || '',
          status: UserStatus.ONLINE,
          bio: data.bio || '',
          coverImage: data.coverImage || '',
          ...data
        };
      }
      
      const cleanData = Object.fromEntries(
        Object.entries(updatedData).filter(([_, v]) => v !== undefined)
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
      // Compress ảnh avatar
      const compressedFile = await compressImage(file, { 
        maxSizeMB: 0.5, 
        maxWidthOrHeight: 512 
      });
      
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${userId}_${Date.now()}.${fileExt}`;
      const path = `avatars/${userId}/${fileName}`;

      const downloadURL = await withRetry(() => 
        uploadWithProgress(path, compressedFile, onProgress)
      );
      await userService.updateProfile(userId, { avatar: downloadURL });
      
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
      // Compress ảnh cover
      const compressedFile = await compressImage(file, { 
        maxSizeMB: 1, 
        maxWidthOrHeight: 1920 
      });
      
      const fileExt = file.name.split('.').pop();
      const fileName = `cover_${userId}_${Date.now()}.${fileExt}`;
      const path = `covers/${userId}/${fileName}`;

      const downloadURL = await withRetry(() => 
        uploadWithProgress(path, compressedFile, onProgress)
      );
      await userService.updateProfile(userId, { coverImage: downloadURL });
      
      return downloadURL;
    } catch (error) {
      console.error("Lỗi upload cover image", error);
      throw error;
    }
  },

  deleteAvatar: async (userId: string): Promise<void> => {
    try {
      await userService.updateProfile(userId, { avatar: '' });
    } catch (error) {
      console.error("Lỗi xóa avatar", error);
      throw error;
    }
  },

  deleteCoverImage: async (userId: string): Promise<void> => {
    try {
      await userService.updateProfile(userId, { coverImage: '' });
    } catch (error) {
      console.error("Lỗi xóa cover image", error);
      throw error;
    }
  },

  // Lấy thống kê số lượng bạn bè và bài viết
  getUserStats: async (userId: string): Promise<{ friendCount: number, postCount: number }> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const friendCount = (userDoc.data()?.friendIds || []).length;
      
      const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId));
      const postsSnapshot = await getDocs(postsQuery);
      const postCount = postsSnapshot.size;
      
      return { friendCount, postCount };
    } catch (error) {
      console.error("Lỗi lấy thông kê user", error);
      return { friendCount: 0, postCount: 0 };
    }
  },

  // Thêm người dùng vào danh sách chặn
  blockUser: async (userId: string, blockedUserId: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        blockedUserIds: arrayUnion(blockedUserId)
      });
    } catch (error) {
      console.error("Lỗi chặn người dùng", error);
      throw error;
    }
  },

  // Xóa người dùng khỏi danh sách chặn
  unblockUser: async (userId: string, blockedUserId: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        blockedUserIds: arrayRemove(blockedUserId)
      });
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
        const data = snapshot.data();
        callback({
          ...data,
          id: snapshot.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          lastSeen: data.lastSeen?.toDate ? data.lastSeen.toDate() : data.lastSeen,
        } as User);
      }
    });
  }
};