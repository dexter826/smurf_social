import { Post } from '../types';

const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    userId: 'u1',
    content: 'Hôm nay trời đẹp quá! Đi cà phê thôi mọi người ☕️\nKhông gian thật tuyệt vời để làm việc.',
    images: ['https://picsum.photos/seed/cafe/800/600'],
    likes: ['u2', 'u3', 'me'],
    comments: [
        { id: 'c1', userId: 'u2', content: 'Ở đâu đấy?', timestamp: new Date() }
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    visibility: 'public'
  },
  {
    id: 'p2',
    userId: 'u2',
    content: 'Vừa hoàn thành xong project mới. Mệt nhưng vui! 💻🔥',
    likes: ['u1'],
    comments: [],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    visibility: 'friends'
  }
];

export const postService = {
  getFeed: async (): Promise<Post[]> => {
    // Simulate network delay
    return new Promise(resolve => setTimeout(() => resolve(MOCK_POSTS), 600));
  },

  likePost: async (postId: string, userId: string): Promise<void> => {
    const post = MOCK_POSTS.find(p => p.id === postId);
    if (post) {
        if (post.likes.includes(userId)) {
            post.likes = post.likes.filter(id => id !== userId);
        } else {
            post.likes.push(userId);
        }
    }
  }
};