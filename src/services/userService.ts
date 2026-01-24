import { User, UserStatus } from '../types';

// Initial Mock Data
const MOCK_USERS: User[] = [
  { 
    id: 'u1', 
    name: 'Nguyễn Thu Hà', 
    avatar: 'https://i.pravatar.cc/150?u=u1', 
    phone: '0901234567', 
    status: UserStatus.ONLINE,
    bio: 'Cuộc sống là những chuyến đi ✈️',
    coverImage: 'https://picsum.photos/800/300?random=1'
  },
  { 
    id: 'u2', 
    name: 'Trần Minh Tuấn', 
    avatar: 'https://i.pravatar.cc/150?u=u2', 
    phone: '0912345678', 
    status: UserStatus.OFFLINE,
    bio: 'Work hard, play hard',
    coverImage: 'https://picsum.photos/800/300?random=2'
  },
  { 
    id: 'u3', 
    name: 'Design Team', 
    avatar: 'https://ui-avatars.com/api/?name=DT&background=0D8ABC&color=fff', 
    phone: '', 
    status: UserStatus.BUSY 
  },
  { 
    id: 'me', 
    name: 'Phạm Văn Nam', 
    avatar: 'https://i.pravatar.cc/150?u=me', 
    phone: '0987654321', 
    status: UserStatus.ONLINE, 
    bio: 'Fullstack Developer tại HCM',
    coverImage: 'https://picsum.photos/800/300?random=3'
  },
];

export const userService = {
  getCurrentUser: async (): Promise<User> => {
    return new Promise(resolve => setTimeout(() => resolve(MOCK_USERS.find(u => u.id === 'me')!), 500));
  },

  getUserById: async (id: string): Promise<User | undefined> => {
    return MOCK_USERS.find(u => u.id === id);
  },

  getAllFriends: async (): Promise<User[]> => {
    return MOCK_USERS.filter(u => u.id !== 'me');
  },

  updateProfile: async (userId: string, data: Partial<User>): Promise<User> => {
    // Logic update mock user
    const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
    if (userIndex > -1) {
      MOCK_USERS[userIndex] = { ...MOCK_USERS[userIndex], ...data };
      return MOCK_USERS[userIndex];
    }
    throw new Error('User not found');
  }
};