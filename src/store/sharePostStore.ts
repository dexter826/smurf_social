import { create } from 'zustand';
import { Post } from '../../shared/types';

interface SharePostState {
  post: Post | null;
  authorName: string;
  openSharePost: (post: Post, authorName: string) => void;
  closeSharePost: () => void;
}

export const useSharePostStore = create<SharePostState>((set) => ({
  post: null,
  authorName: 'Người dùng',
  openSharePost: (post, authorName) => set({ post, authorName }),
  closeSharePost: () => set({ post: null, authorName: 'Người dùng' }),
}));