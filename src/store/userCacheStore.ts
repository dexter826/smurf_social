import { User } from '../types';
import { getDocs, query, collection, where, documentId } from 'firebase/firestore';
import { db } from '../firebase/config';
import { chunkArray } from '../utils/batchUtils';
import { FIREBASE_LIMITS, PAGINATION } from '../constants';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UserCacheState {
  users: Record<string, User>;
  loadingIds: Set<string>;
  
  fetchUsers: (ids: string[]) => Promise<void>;
  fetchUser: (id: string) => Promise<User | undefined>;
  getUser: (id: string) => User | undefined;
  setUser: (user: User) => void;
  invalidateUser: (id: string) => void;
  clear: () => void;
}

// Hằng số này đã được chuyển vào PAGINATION.USER_CACHE_LIMIT

export const useUserCache = create<UserCacheState>()(
  persist(
    (set, get) => ({
      users: {},
      loadingIds: new Set(),

  // Tải thông tin user theo lô
  fetchUsers: async (ids: string[]) => {
    if (!ids || ids.length === 0) return;

    const { users, loadingIds } = get();
    
    const missingIds = ids.filter(id => !users[id] && !loadingIds.has(id));
    
    if (missingIds.length === 0) return;

    set({ loadingIds: new Set([...loadingIds, ...missingIds]) });

    try {
      // Chia nhỏ ID tránh giới hạn Firestore
      const chunks = chunkArray(missingIds, FIREBASE_LIMITS.QUERY_IN_LIMIT);
      
      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const q = query(
            collection(db, 'users'),
            where(documentId(), 'in', chunk)
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
            lastSeen: doc.data().lastSeen?.toDate ? doc.data().lastSeen.toDate() : doc.data().lastSeen,
          })) as User[];
        })
      );

      const newUsers = results.flat().reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, User>);

      set({ 
        users: { ...users, ...newUsers },
        loadingIds: new Set([...loadingIds].filter(id => !missingIds.includes(id)))
      });
    } catch (error) {
      console.error('Lỗi fetch users batch:', error);
      set({ 
        loadingIds: new Set([...loadingIds].filter(id => !missingIds.includes(id)))
      });
    }
  },

  // Tải thông tin một người dùng
  fetchUser: async (id: string) => {
    const { users } = get();
    
    if (users[id]) {
      return users[id];
    }

    await get().fetchUsers([id]);
    return get().users[id];
  },

  getUser: (id: string) => {
    return get().users[id];
  },

  setUser: (user: User) => {
    const { users } = get();
    let newUsers = { ...users, [user.id]: user };
    
    // Giới hạn cache user
    const keys = Object.keys(newUsers);
    if (keys.length > PAGINATION.USER_CACHE_LIMIT) {
      delete newUsers[keys[0]];
    }

    set({ users: newUsers });
  },

  invalidateUser: (id: string) => {
    const { users } = get();
    const { [id]: _, ...rest } = users;
    set({ users: rest });
  },

  clear: () => {
    set({ users: {}, loadingIds: new Set() });
  }
}), {
  name: 'smurf_user_cache',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ users: state.users }),
}));
