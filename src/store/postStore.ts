import { create } from 'zustand';
import { Post, Comment } from '../types';
import { postService } from '../services/postService';
import { DocumentSnapshot } from 'firebase/firestore';

interface PostState {
  posts: Post[];
  isLoading: boolean;
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
  abortController: AbortController | null;

  fetchPosts: (currentUserId: string, friendIds: string[], loadMore?: boolean) => Promise<void>;
  subscribeToPosts: (currentUserId: string, friendIds: string[]) => () => void;
  createPost: (userId: string, content: string, images: string[], videos: string[], visibility: 'friends' | 'private') => Promise<void>;
  updatePost: (postId: string, content: string, images: string[], videos: string[], visibility: 'friends' | 'private') => Promise<void>;
  deletePost: (postId: string, images?: string[], videos?: string[]) => Promise<void>;
  likePost: (postId: string, userId: string) => Promise<void>;
  uploadMedia: (files: File[], userId: string) => Promise<{ images: string[], videos: string[] }>;

  setLoading: (loading: boolean) => void;
  clearPosts: () => void;
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  isLoading: false,
  hasMore: true,
  lastDoc: null,
  abortController: null,

  fetchPosts: async (currentUserId: string, friendIds: string[], loadMore = false) => {
    // Hủy request cũ nếu đang chạy
    const { abortController: currentController } = get();
    if (currentController) {
      currentController.abort();
    }

    const newController = new AbortController();
    set({ abortController: newController, isLoading: true });

    const { lastDoc, posts } = get();

    try {
      const result = await postService.getFeed(currentUserId, friendIds, 10, loadMore ? lastDoc || undefined : undefined);
      
      if (newController.signal.aborted) return;

      set({
        posts: loadMore ? [...posts, ...result.posts] : result.posts,
        lastDoc: result.lastDoc,
        hasMore: result.posts.length === 10,
        isLoading: false,
        abortController: null
      });
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error("Lỗi tải bài viết:", error);
      set({ isLoading: false, abortController: null });
    }
  },

  subscribeToPosts: (currentUserId: string, friendIds: string[]) => {
    const unsubscribe = postService.subscribeToFeed(currentUserId, friendIds, (posts) => {
      set({ posts });
    });

    return unsubscribe;
  },

  createPost: async (userId: string, content: string, images: string[], videos: string[], visibility: 'friends' | 'private' = 'friends') => {
    try {
      await postService.createPost({
        userId,
        content,
        images,
        videos,
        likes: [],
        visibility
      });
    } catch (error) {
      console.error("Lỗi tạo bài viết:", error);
      throw error;
    }
  },

  updatePost: async (postId: string, content: string, images: string[], videos: string[], visibility: 'friends' | 'private') => {
    try {
      await postService.updatePost(postId, content, images, videos, visibility);
      set((state) => ({
        posts: state.posts.map(p =>
          p.id === postId
            ? { ...p, content, images, videos, visibility, edited: true, editedAt: new Date() }
            : p
        )
      }));
    } catch (error) {
      console.error("Lỗi cập nhật bài viết:", error);
      throw error;
    }
  },

  deletePost: async (postId: string, images?: string[], videos?: string[]) => {
    try {
      await postService.deletePost(postId, images, videos);
      set((state) => ({
        posts: state.posts.filter(p => p.id !== postId)
      }));
    } catch (error) {
      console.error("Lỗi xóa bài viết:", error);
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
      console.error("Lỗi thích bài viết:", error);
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

  uploadMedia: async (files: File[], userId: string) => {
    try {
      return await postService.uploadPostMedia(files, userId);
    } catch (error) {
      console.error("Lỗi tải lên media:", error);
      throw error;
    }
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  clearPosts: () => set({ posts: [], lastDoc: null, hasMore: true })
}));
