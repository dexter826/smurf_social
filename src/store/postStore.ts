import { create } from 'zustand';
import { Post, Comment } from '../types';
import { postService } from '../services/postService';
import { DocumentSnapshot } from 'firebase/firestore';

interface PostState {
  posts: Post[];
  isLoading: boolean;
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;

  fetchPosts: (currentUserId: string, friendIds: string[], loadMore?: boolean) => Promise<void>;
  subscribeToPosts: (currentUserId: string, friendIds: string[]) => () => void;
  createPost: (userId: string, content: string, images: string[], visibility: 'public' | 'friends' | 'private') => Promise<void>;
  updatePost: (postId: string, content: string) => Promise<void>;
  deletePost: (postId: string, images?: string[]) => Promise<void>;
  likePost: (postId: string, userId: string) => Promise<void>;
  uploadImages: (files: File[], userId: string) => Promise<string[]>;

  setLoading: (loading: boolean) => void;
  clearPosts: () => void;
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  isLoading: false,
  hasMore: true,
  lastDoc: null,

  fetchPosts: async (currentUserId: string, friendIds: string[], loadMore = false) => {
    const { lastDoc, posts } = get();
    set({ isLoading: true });

    try {
      const result = await postService.getFeed(currentUserId, friendIds, 10, loadMore ? lastDoc || undefined : undefined);
      
      set({
        posts: loadMore ? [...posts, ...result.posts] : result.posts,
        lastDoc: result.lastDoc,
        hasMore: result.posts.length === 10,
        isLoading: false
      });
    } catch (error) {
      console.error("Lỗi fetch posts", error);
      set({ isLoading: false });
    }
  },

  subscribeToPosts: (currentUserId: string, friendIds: string[]) => {
    const unsubscribe = postService.subscribeToFeed(currentUserId, friendIds, (posts) => {
      set({ posts });
    });

    return unsubscribe;
  },

  createPost: async (userId: string, content: string, images: string[], visibility: 'public' | 'friends' | 'private') => {
    try {
      await postService.createPost({
        userId,
        content,
        images,
        likes: [],
        visibility
      });
    } catch (error) {
      console.error("Lỗi tạo post", error);
      throw error;
    }
  },

  updatePost: async (postId: string, content: string) => {
    try {
      await postService.updatePost(postId, content);
      set((state) => ({
        posts: state.posts.map(p =>
          p.id === postId
            ? { ...p, content, edited: true, editedAt: new Date() }
            : p
        )
      }));
    } catch (error) {
      console.error("Lỗi update post", error);
      throw error;
    }
  },

  deletePost: async (postId: string, images?: string[]) => {
    try {
      await postService.deletePost(postId, images);
      set((state) => ({
        posts: state.posts.filter(p => p.id !== postId)
      }));
    } catch (error) {
      console.error("Lỗi delete post", error);
      throw error;
    }
  },

  likePost: async (postId: string, userId: string) => {
    const post = get().posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.likes.includes(userId);

    set((state) => ({
      posts: state.posts.map(p =>
        p.id === postId
          ? {
              ...p,
              likes: isLiked
                ? p.likes.filter(id => id !== userId)
                : [...p.likes, userId]
            }
          : p
      )
    }));

    try {
      await postService.likePost(postId, userId, isLiked);
    } catch (error) {
      console.error("Lỗi like post", error);
      set((state) => ({
        posts: state.posts.map(p =>
          p.id === postId
            ? {
                ...p,
                likes: isLiked
                  ? [...p.likes, userId]
                  : p.likes.filter(id => id !== userId)
              }
            : p
        )
      }));
    }
  },

  uploadImages: async (files: File[], userId: string) => {
    try {
      return await postService.uploadPostImages(files, userId);
    } catch (error) {
      console.error("Lỗi upload images", error);
      throw error;
    }
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  clearPosts: () => set({ posts: [], lastDoc: null, hasMore: true })
}));
