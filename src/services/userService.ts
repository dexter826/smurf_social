import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
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
  }
};