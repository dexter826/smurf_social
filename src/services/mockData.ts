import { User, UserStatus, Conversation, Post, Message } from '../types';

export const CURRENT_USER: User = {
  id: 'me',
  name: 'Nguyễn Văn A',
  avatar: 'https://picsum.photos/id/1011/200/200',
  phone: '0987654321',
  status: UserStatus.ONLINE,
  bio: 'Lập trình viên ReactJS'
};

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Trần Thị B', avatar: 'https://picsum.photos/id/1027/200/200', phone: '0901234567', status: UserStatus.ONLINE },
  { id: 'u2', name: 'Lê Văn C', avatar: 'https://picsum.photos/id/1012/200/200', phone: '0912345678', status: UserStatus.OFFLINE },
  { id: 'u3', name: 'Phạm Minh D', avatar: 'https://picsum.photos/id/1005/200/200', phone: '0923456789', status: UserStatus.BUSY },
  { id: 'u4', name: 'Nhóm Dev Zalo', avatar: 'https://picsum.photos/id/1/200/200', phone: '', status: UserStatus.ONLINE },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    participants: [MOCK_USERS[0]],
    isGroup: false,
    unreadCount: 2,
    updatedAt: new Date(),
    lastMessage: {
      id: 'm1', conversationId: 'c1', senderId: 'u1', content: 'Cuối tuần này rảnh không?', timestamp: new Date(Date.now() - 1000 * 60 * 5), type: 'text'
    }
  },
  {
    id: 'c2',
    participants: [MOCK_USERS[1]],
    isGroup: false,
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    lastMessage: {
      id: 'm2', conversationId: 'c2', senderId: 'me', content: 'Đã gửi file thiết kế nhé.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), type: 'text'
    }
  },
  {
    id: 'c3',
    participants: [MOCK_USERS[0], MOCK_USERS[1], MOCK_USERS[2]],
    isGroup: true,
    groupName: 'Team Smurfy Dự Án',
    unreadCount: 5,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    lastMessage: {
      id: 'm3', conversationId: 'c3', senderId: 'u3', content: 'Mọi người nhớ check task nhé.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), type: 'text'
    }
  }
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  'c1': [
    { id: 'msg1', conversationId: 'c1', senderId: 'me', content: 'Chào bạn, khỏe không?', timestamp: new Date(Date.now() - 1000 * 60 * 60), type: 'text' },
    { id: 'msg2', conversationId: 'c1', senderId: 'u1', content: 'Mình khỏe, cảm ơn!', timestamp: new Date(Date.now() - 1000 * 60 * 55), type: 'text' },
    { id: 'msg3', conversationId: 'c1', senderId: 'u1', content: 'Cuối tuần này rảnh không?', timestamp: new Date(Date.now() - 1000 * 60 * 5), type: 'text' }
  ],
  'c3': [
    { id: 'msg_g1', conversationId: 'c3', senderId: 'u2', content: 'Dự án tới đâu rồi anh em?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25), type: 'text' },
    { id: 'msg_g2', conversationId: 'c3', senderId: 'me', content: 'Đang làm phần Frontend.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24.5), type: 'text' },
    { id: 'msg_g3', conversationId: 'c3', senderId: 'u3', content: 'Mọi người nhớ check task nhé.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), type: 'text' }
  ]
};

export const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    userId: 'u1',
    content: 'Hôm nay trời đẹp quá! Đi cà phê thôi mọi người ☕️',
    images: ['https://picsum.photos/seed/coffee/600/400'],
    likes: ['u2', 'u3', 'u4'],
    comments: [],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    visibility: 'public'
  },
  {
    id: 'p2',
    userId: 'u2',
    content: 'Vừa hoàn thành xong project mới. Mệt nhưng vui! 💻🔥',
    likes: ['u1', 'u3', 'u4', 'me'],
    comments: [],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    visibility: 'friends'
  },
  {
    id: 'p3',
    userId: 'me',
    content: 'Cập nhật trạng thái mới...',
    likes: ['u1'],
    comments: [],
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    visibility: 'private'
  }
];