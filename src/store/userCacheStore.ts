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
  _updateAccess: (id: string) => void;
  reset: () => void;
}


export const useUserCache = create<UserCacheState>()(
  persist(
    (set, get) => ({
      users: {},
      loadingIds: [],
      accessOrder: [],

  /** Cập nhật thứ tự truy cập LRU */
  _updateAccess: (id: string) => {
    const { accessOrder, users } = get();
    const newOrder = accessOrder.filter(oid => oid !== id);
    newOrder.push(id);
    
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

  /** Tải danh sách người dùng theo lô */
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

  /** Tải thông tin một người dùng */
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

  /** Lấy người dùng từ bộ nhớ đệm */
  getUser: (id: string) => {
    return get().users[id];
  },

  /** Lưu người dùng vào bộ nhớ đệm */
  setUser: (user: User) => {
    if (!user?.id) return;
    set(state => ({ users: { ...state.users, [user.id]: user } }));
    get()._updateAccess(user.id);
  },

  /** Cập nhật thông tin người dùng */
  updateUser: (user: User) => {
    if (!user?.id) return;
    const { users } = get();
    if (!users[user.id]) return;
    
    set(state => ({
      users: { ...state.users, [user.id]: { ...state.users[user.id], ...user } }
    }));
  },

  /** Xóa người dùng khỏi bộ nhớ đệm */
  invalidateUser: (id: string) => {
    set(state => {
      const { [id]: _, ...rest } = state.users;
      return { 
        users: rest, 
        accessOrder: state.accessOrder.filter(oid => oid !== id) 
      };
    });
  },

  /** Đặt lại bộ nhớ đệm */
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
