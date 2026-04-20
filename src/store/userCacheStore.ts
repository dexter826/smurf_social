import { User } from '../../shared/types';
import { PAGINATION } from '../constants';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { batchGetUsers } from '../utils/batchUtils';

interface UserCacheState {
  users: Record<string, User>;
  loadingIds: string[];
  accessOrder: string[];
  
  fetchUsers: (ids: string[]) => Promise<void>;
  fetchUser: (id: string) => Promise<User | undefined>;
  getUser: (id: string) => User | undefined;
  setUser: (user: User) => void;
  updateUser: (user: User) => void;
  invalidateUser: (id: string) => void;
  _updateAccess: (id: string) => void; // Quản lý nội bộ thứ tự truy cập
  reset: () => void;
}

/**
 * Quản lý Cache người dùng với chính sách LRU
 */
export const useUserCache = create<UserCacheState>()(
  persist(
    (set, get) => ({
      users: {},
      loadingIds: [],
      accessOrder: [],

  // Cập nhật thứ tự truy cập (LRU Eviction)
  _updateAccess: (id: string) => {
    const { accessOrder, users } = get();
    const newOrder = accessOrder.filter(oid => oid !== id);
    newOrder.push(id);
    
    // Giới hạn dung lượng cache
    if (newOrder.length > PAGINATION.USER_CACHE_LIMIT) {
      const evictId = newOrder.shift();
      if (evictId) {
        const { [evictId]: _, ...restUsers } = users;
        set({ users: restUsers, accessOrder: newOrder });
      }
    } else {
      set({ accessOrder: newOrder });
    }
  },

  // Tải danh sách người dùng theo lô (Batching)
  fetchUsers: async (ids: string[]) => {
    if (!ids?.length) return;

    const { users, loadingIds } = get();
    const missingIds = ids.filter(id => !users[id] && !loadingIds.includes(id));
    if (missingIds.length === 0) return;

    set({ loadingIds: [...loadingIds, ...missingIds] });

    try {
      const newUsers = await batchGetUsers(missingIds);
      set(state => ({ 
        users: { ...state.users, ...newUsers },
        loadingIds: state.loadingIds.filter(id => !missingIds.includes(id))
      }));
    } catch (error) {
      set(state => ({ 
        loadingIds: state.loadingIds.filter(id => !missingIds.includes(id))
      }));
    }
  },

  // Lấy và cập nhật cache cho một người dùng
  fetchUser: async (id: string) => {
    const { users, _updateAccess, fetchUsers } = get();
    if (users[id]) {
      _updateAccess(id);
      return users[id];
    }

    await fetchUsers([id]);
    const updatedUser = get().users[id];
    if (updatedUser) _updateAccess(id);
    return updatedUser;
  },

  // Lấy dữ liệu nhanh từ cache (Synchronous)
  getUser: (id: string) => {
    return get().users[id];
  },

  // Ghi mới dữ liệu vào cache
  setUser: (user: User) => {
    if (!user?.id) return;
    set(state => ({ users: { ...state.users, [user.id]: user } }));
    get()._updateAccess(user.id);
  },

  // Cập nhật thông tin chi tiết
  updateUser: (user: User) => {
    if (!user?.id) return;
    const { users } = get();
    if (!users[user.id]) return;
    
    set(state => ({
      users: { ...state.users, [user.id]: { ...state.users[user.id], ...user } }
    }));
  },

  // Thu hồi cache của một người dùng
  invalidateUser: (id: string) => {
    set(state => {
      const { [id]: _, ...rest } = state.users;
      return { 
        users: rest, 
        accessOrder: state.accessOrder.filter(oid => oid !== id) 
      };
    });
  },

  reset: () => {
    set({ users: {}, loadingIds: [], accessOrder: [] });
  }
}), {
  name: 'smurf_user_cache',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ 
    users: state.users,
    accessOrder: state.accessOrder 
  }),
}));

import { registerStore } from './storeUtils';
registerStore(() => useUserCache.getState().reset());
