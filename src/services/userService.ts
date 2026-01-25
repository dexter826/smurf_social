import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { User, UserStatus } from '../types';

export const userService = {
  getCurrentUser: async (uid: string): Promise<User | undefined> => {
    return userService.getUserById(uid);
  },

  getUserById: async (id: string): Promise<User | undefined> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', id));
      if (userDoc.exists()) {
        return userDoc.data() as User;
      }
      return undefined;
    } catch (error) {
      console.error("Lỗi lấy thông tin user", error);
      return undefined;
    }
  },

  getAllFriends: async (currentUserId: string): Promise<User[]> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUserId));
      if (!userDoc.exists()) return [];
      
      const userData = userDoc.data() as User;
      const friendIds = userData.friendIds || [];
      
      if (friendIds.length === 0) return [];

      const friends: User[] = [];
      for (const friendId of friendIds) {
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        if (friendDoc.exists()) {
          friends.push(friendDoc.data() as User);
        }
      }
      
      return friends;
    } catch (error) {
      console.error("Lỗi lấy danh sách bạn bè", error);
      return [];
    }
  },

  searchUsers: async (searchTerm: string, currentUserId: string): Promise<User[]> => {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const users = querySnapshot.docs
        .map(doc => doc.data() as User)
        .filter(user => 
          user.id !== currentUserId &&
          (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.phone?.includes(searchTerm))
        );
      
      return users;
    } catch (error) {
      console.error("Lỗi tìm kiếm người dùng", error);
      return [];
    }
  },

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
      
      await setDoc(userRef, updatedData, { merge: true });
      return updatedData;
    } catch (error) {
      console.error("Lỗi cập nhật profile", error);
      throw error;
    }
  },

  uploadAvatar: async (userId: string, file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${userId}_${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, `avatars/${userId}/${fileName}`);

      // Upload file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update user profile
      await userService.updateProfile(userId, { avatar: downloadURL });
      
      return downloadURL;
    } catch (error) {
      console.error("Lỗi upload avatar", error);
      throw error;
    }
  },

  uploadCoverImage: async (userId: string, file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cover_${userId}_${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, `covers/${userId}/${fileName}`);

      // Upload file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update user profile
      await userService.updateProfile(userId, { coverImage: downloadURL });
      
      return downloadURL;
    } catch (error) {
      console.error("Lỗi upload cover image", error);
      throw error;
    }
  },

  getUserStats: async (userId: string): Promise<{ friendCount: number, postCount: number }> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const friendCount = (userDoc.data()?.friendIds || []).length;
      
      // Count posts
      const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId));
      const postsSnapshot = await getDocs(postsQuery);
      const postCount = postsSnapshot.size;
      
      return { friendCount, postCount };
    } catch (error) {
      console.error("Lỗi lấy thống kê user", error);
      return { friendCount: 0, postCount: 0 };
    }
  }
};