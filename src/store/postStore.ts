import { Post, Visibility } from '../types';
import { postService } from '../services/postService';
import { DocumentSnapshot } from 'firebase/firestore';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PAGINATION } from '../constants';

interface PostState {
  posts: Post[];
  isLoading: boolean;
  isRevalidating: boolean;
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
  abortController: AbortController | null;
  isError: boolean;

  fetchPosts: (currentUserId: string, friendIds: string[], blockedUserIds?: string[], loadMore?: boolean) => Promise<void>;
  subscribeToPosts: (currentUserId: string, friendIds: string[], blockedUserIds?: string[]) => () => void;
  createPost: (userId: string, content: string, images: string[], videos: string[], visibility: Visibility, videoThumbnails?: Record<string, string>) => Promise<void>;
  updatePost: (postId: string, content: string, images: string[], videos: string[], visibility: Visibility, videoThumbnails?: Record<string, string>) => Promise<void>;
  deletePost: (postId: string, images?: string[], videos?: string[]) => Promise<void>;
  reactToPost: (postId: string, userId: string, reaction: string) => Promise<void>;
  uploadMedia: (files: File[], userId: string) => Promise<{ images: string[], videos: string[], videoThumbnails?: Record<string, string> }>;

  setLoading: (loading: boolean) => void;
  clearPosts: () => void;

  selectedPost: Post | null;
  isModalLoading: boolean;
  setSelectedPost: (post: Post | null) => void;
  fetchPostById: (postId: string, currentUserId: string, friendIds: string[]) => Promise<void>;
  reset: () => void;
}

export const usePostStore = create<PostState>()(
  persist(
    (set, get) => ({
      posts: [],
      isLoading: false,
      isRevalidating: false,
      hasMore: true,
      lastDoc: null,
      abortController: null,
      isError: false,
      selectedPost: null,
      isModalLoading: false,

      reset: () => {
        const { abortController } = get();
        if (abortController) abortController.abort();

        set({
          posts: [],
          isLoading: false,
          isRevalidating: false,
          hasMore: true,
          lastDoc: null,
          abortController: null,
          isError: false,
          selectedPost: null,
          isModalLoading: false,
        });
      },

      fetchPosts: async (currentUserId: string, friendIds: string[], blockedUserIds: string[] = [], loadMore = false) => {
        const { abortController: currentController, posts, isLoading, isRevalidating } = get();
        
        // Chống race conditions
        if (isLoading || isRevalidating) return;

        if (currentController) {
          currentController.abort();
        }

        const newController = new AbortController();

        // Dùng skeleton khi chưa có data
        const shouldRevalidate = posts.length > 0 && !loadMore;

        set({
          abortController: newController,
          isLoading: !shouldRevalidate,
          isRevalidating: shouldRevalidate,
          isError: false
        });

        const { lastDoc } = get();

        try {
          const result = await postService.getFeed(
            currentUserId, 
            friendIds, 
            blockedUserIds, 
            PAGINATION.FEED_POSTS, 
            loadMore ? lastDoc || undefined : undefined
          );

          if (newController.signal.aborted) return;

          set({
            posts: loadMore ? [...posts, ...result.posts] : result.posts,
            lastDoc: result.lastDoc,
            hasMore: result.hasMore,
            isLoading: false,
            isRevalidating: false,
            abortController: null,
            isError: false
          });
        } catch (error: unknown) {
          const err = error as { name?: string };
          if (err.name === 'AbortError') return;
          console.error("Lỗi tải bài viết:", error);
          set({ 
            isLoading: false, 
            isRevalidating: false, 
            abortController: null,
            isError: true 
          });
        }
      },

      subscribeToPosts: (currentUserId: string, friendIds: string[], blockedUserIds: string[] = []) => {
        const currentCount = Math.max(get().posts.length, PAGINATION.FEED_POSTS);

        const unsubscribe = postService.subscribeToFeed(
          currentUserId,
          friendIds,
          blockedUserIds,
          (action, changedPosts) => {
            set((state) => {
              if (action === 'initial') {
                return {
                  posts: changedPosts,
                  isLoading: false,
                  isRevalidating: false
                };
              }

              if (action === 'add') {
                const existingIds = new Set(state.posts.map(p => p.id));
                const newPosts = changedPosts.filter(p => !existingIds.has(p.id));

                if (newPosts.length === 0) return {};

                return {
                  posts: [...newPosts, ...state.posts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                };
              }

              if (action === 'update') {
                const updatedPosts = state.posts.map(p => {
                  const updated = changedPosts.find(cp => cp.id === p.id);
                  return updated || p;
                });

                return {
                  posts: updatedPosts,
                  selectedPost: state.selectedPost?.id === changedPosts[0]?.id ? changedPosts[0] : state.selectedPost
                };
              }

              if (action === 'remove') {
                const removedIds = new Set(changedPosts.map(p => p.id));
                return {
                  posts: state.posts.filter(p => !removedIds.has(p.id)),
                  selectedPost: removedIds.has(state.selectedPost?.id || '') ? null : state.selectedPost
                };
              }

              return {};
            });
          },
          currentCount
        );

        return unsubscribe;
      },

      createPost: async (userId: string, content: string, images: string[], videos: string[], visibility: Visibility = Visibility.PUBLIC, videoThumbnails?: Record<string, string>) => {
        try {
          await postService.createPost({
            userId,
            content,
            images,
            videos,
            videoThumbnails,
            reactions: {},
            visibility
          });
        } catch (error) {
          console.error("Lỗi tạo bài viết:", error);
          throw error;
        }
      },

      updatePost: async (postId: string, content: string, images: string[], videos: string[], visibility: Visibility, videoThumbnails?: Record<string, string>) => {
        try {
          await postService.updatePost(postId, content, images, videos, visibility, videoThumbnails);
          set((state) => ({
            posts: state.posts.map(p =>
              p.id === postId
                ? { ...p, content, images, videos, visibility, videoThumbnails, isEdited: true, editedAt: new Date() }
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

      reactToPost: async (postId: string, userId: string, reaction: string) => {
        const post = get().posts.find(p => p.id === postId);
        if (!post) return;

        const previousReactions = { ...(post.reactions || {}) };
        const previousSelectedPost = get().selectedPost;

        set((state) => {
          const updateReactions = (p: Post) => {
            const newReactions = { ...(p.reactions || {}) };
            if (reaction === 'REMOVE' || newReactions[userId] === reaction) {
              delete newReactions[userId];
            } else {
              newReactions[userId] = reaction;
            }
            return { ...p, reactions: newReactions };
          };

          const updatedPosts = state.posts.map(p => p.id === postId ? updateReactions(p) : p);

          const updatedSelectedPost = state.selectedPost?.id === postId
            ? updateReactions(state.selectedPost)
            : state.selectedPost;

          return {
            posts: updatedPosts,
            selectedPost: updatedSelectedPost
          };
        });

        try {
          await postService.reactToPost(postId, userId, reaction);
        } catch (error) {
          console.error("Lỗi react bài viết:", error);
          set((state) => ({
            posts: state.posts.map(p => p.id === postId ? { ...p, reactions: previousReactions } : p),
            selectedPost: previousSelectedPost
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

      clearPosts: () => set({ posts: [], lastDoc: null, hasMore: true }),

      setSelectedPost: (post: Post | null) => set({ selectedPost: post }),

      fetchPostById: async (postId: string, currentUserId: string, friendIds: string[]) => {
        set({ isModalLoading: true });
        try {
          const post = await postService.getPostById(postId, currentUserId, friendIds);
          set({ selectedPost: post, isModalLoading: false });
        } catch (error) {
          console.error("Lỗi lấy chi tiết bài viết:", error);
          set({ isModalLoading: false });
        }
      },
    }),
    {
      name: 'smurf_feed_cache',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ posts: state.posts.slice(0, PAGINATION.FEED_CACHE_LIMIT) }),
    }
  )
);
