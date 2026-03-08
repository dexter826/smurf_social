import { Post, Visibility } from '../types';
import { postService } from '../services/postService';
import { DocumentSnapshot } from 'firebase/firestore';
import { toast } from './toastStore';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PAGINATION, TOAST_MESSAGES } from '../constants';
import { useLoadingStore } from './loadingStore';

interface PostState {
  posts: Post[];
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
  abortController: AbortController | null;
  uploadingStates: Record<string, { progress: number; error?: string }>;
  isError: boolean;

  fetchPosts: (currentUserId: string, friendIds: string[], blockedUserIds?: string[], loadMore?: boolean) => Promise<void>;
  subscribeToPosts: (currentUserId: string, friendIds: string[], blockedUserIds?: string[]) => () => void;
  createPost: (userId: string, content: string, images: string[], videos: string[], visibility: Visibility, videoThumbnails?: Record<string, string>, pendingFiles?: File[]) => Promise<void>;
  updatePost: (postId: string, content: string, images: string[], videos: string[], visibility: Visibility, videoThumbnails?: Record<string, string>, pendingFiles?: File[]) => Promise<void>;
  deletePost: (postId: string, images?: string[], videos?: string[]) => Promise<void>;
  reactToPost: (postId: string, userId: string, reaction: string) => Promise<void>;
  uploadMedia: (files: File[], userId: string) => Promise<{ images: string[], videos: string[], videoThumbnails?: Record<string, string> }>;

  clearPosts: () => void;

  selectedPost: Post | null;
  setSelectedPost: (post: Post | null) => void;
  fetchPostById: (postId: string, currentUserId: string, friendIds: string[]) => Promise<void>;
  reset: () => void;
}

export const usePostStore = create<PostState>()(
  persist(
    (set, get) => ({
      posts: [],
      hasMore: true,
      lastDoc: null,
      abortController: null,
      isError: false,
      uploadingStates: {},
      selectedPost: null,

      reset: () => {
        const { abortController } = get();
        if (abortController) abortController.abort();

        set({
          posts: [],
          hasMore: true,
          lastDoc: null,
          abortController: null,
          isError: false,
          selectedPost: null,
          uploadingStates: {}
        });
      },

      fetchPosts: async (currentUserId: string, friendIds: string[], blockedUserIds: string[] = [], loadMore = false) => {
        const { abortController: currentController, posts } = get();
        const loadingStore = useLoadingStore.getState();

        if (loadingStore.isLoading('feed.posts') || loadingStore.isLoading('feed.loadMore')) return;

        if (currentController) {
          currentController.abort();
        }

        const newController = new AbortController();

        set({
          abortController: newController,
          isError: false
        });

        loadingStore.setLoading(loadMore ? 'feed.loadMore' : 'feed.posts', true);

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
            abortController: null,
            isError: false
          });
        } catch (error: unknown) {
          const err = error as { name?: string };
          if (err.name === 'AbortError') return;
          console.error("Lỗi tải bài viết:", error);
          set({
            abortController: null,
            isError: true
          });
        } finally {
          loadingStore.setLoading(loadMore ? 'feed.loadMore' : 'feed.posts', false);
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
                  posts: changedPosts
                };
              }

              if (action === 'add') {
                const existingIds = new Set(state.posts.map(p => p.id));
                const newPosts = changedPosts.filter(p => !existingIds.has(p.id));
                const duplicates = changedPosts.filter(p => existingIds.has(p.id));

                let currentPosts = state.posts;
                if (duplicates.length > 0) {
                  currentPosts = currentPosts.map(p => {
                    const match = duplicates.find(d => d.id === p.id);
                    return match || p;
                  });
                }

                if (newPosts.length === 0 && duplicates.length === 0) return {};

                return {
                  posts: [...newPosts, ...currentPosts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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

      createPost: async (userId: string, content: string, images: string[], videos: string[], visibility: Visibility = Visibility.PUBLIC, videoThumbnails?: Record<string, string>, pendingFiles?: File[]) => {
        const postId = postService.generatePostId();
        const previewImages = pendingFiles ? pendingFiles.filter(f => f.type.startsWith('image/')).map(f => URL.createObjectURL(f)) : [];
        const previewVideos = pendingFiles ? pendingFiles.filter(f => f.type.startsWith('video/')).map(f => URL.createObjectURL(f)) : [];

        const newPost: Post = {
          id: postId,
          userId,
          content,
          images: [...(images || []), ...previewImages],
          videos: [...(videos || []), ...previewVideos],
          videoThumbnails: videoThumbnails || {},
          visibility,
          commentCount: 0,
          createdAt: new Date()
        };

        set(state => ({
          posts: [newPost, ...state.posts],
          uploadingStates: { ...state.uploadingStates, [postId]: { progress: 0 } }
        }));

        const processUpload = async () => {
          try {
            let finalImages = [...images];
            let finalVideos = [...videos];
            let finalThumbnails = { ...videoThumbnails };

            if (pendingFiles && pendingFiles.length > 0) {
              const result = await postService.uploadPostMedia(pendingFiles, userId, (progress) => {
                set(state => ({
                  uploadingStates: {
                    ...state.uploadingStates,
                    [postId]: { ...state.uploadingStates[postId], progress }
                  }
                }));
              });
              finalImages = [...finalImages, ...result.images];
              finalVideos = [...finalVideos, ...result.videos];
              finalThumbnails = { ...finalThumbnails, ...result.videoThumbnails };
            }

            await postService.createPost({
              userId,
              content,
              images: finalImages,
              videos: finalVideos,
              videoThumbnails: finalThumbnails,
              visibility
            }, postId);

            set(state => {
              const newUploadingStates = { ...state.uploadingStates };
              delete newUploadingStates[postId];
              return { uploadingStates: newUploadingStates };
            });

            toast.success(TOAST_MESSAGES.POST.CREATE_SUCCESS);
          } catch (error) {
            console.error("Lỗi đăng bài:", error);
            const errorMessage = (error as any)?.message || 'Lỗi tải lên';
            set(state => ({
              uploadingStates: {
                ...state.uploadingStates,
                [postId]: { ...state.uploadingStates[postId], error: errorMessage }
              }
            }));
            toast.error(TOAST_MESSAGES.POST.CREATE_FAILED(errorMessage));
          } finally {
            // Dọn dẹp các URL tạm thời để tránh rò rỉ bộ nhớ
            previewImages.forEach(url => URL.revokeObjectURL(url));
            previewVideos.forEach(url => URL.revokeObjectURL(url));
          }
        };

        processUpload();
      },

      updatePost: async (postId: string, content: string, images: string[], videos: string[], visibility: Visibility, videoThumbnails?: Record<string, string>, pendingFiles?: File[]) => {
        const { posts } = get();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        // Tạo URL xem trước tạm thời
        const previewImages = pendingFiles ? pendingFiles.filter(f => f.type.startsWith('image/')).map(f => URL.createObjectURL(f)) : [];
        const previewVideos = pendingFiles ? pendingFiles.filter(f => f.type.startsWith('video/')).map(f => URL.createObjectURL(f)) : [];

        set(state => ({
          posts: state.posts.map(p =>
            p.id === postId
              ? { 
                  ...p, 
                  content, 
                  images: [...images, ...previewImages], 
                  videos: [...videos, ...previewVideos], 
                  visibility, 
                  videoThumbnails, 
                  isEdited: true, 
                  editedAt: new Date() 
                }
              : p
          ),
          uploadingStates: pendingFiles && pendingFiles.length > 0
            ? { ...state.uploadingStates, [postId]: { progress: 0 } }
            : state.uploadingStates
        }));

        const processUpdate = async () => {
          try {
            let finalImages = [...images];
            let finalVideos = [...videos];
            let finalThumbnails = { ...videoThumbnails };

            if (pendingFiles && pendingFiles.length > 0) {
              const result = await postService.uploadPostMedia(pendingFiles, post.userId, (progress) => {
                set(state => ({
                  uploadingStates: {
                    ...state.uploadingStates,
                    [postId]: { ...state.uploadingStates[postId], progress }
                  }
                }));
              });
              finalImages = [...finalImages, ...result.images];
              finalVideos = [...finalVideos, ...result.videos];
              finalThumbnails = { ...finalThumbnails, ...result.videoThumbnails };
            }

            await postService.updatePost(postId, content, finalImages, finalVideos, visibility, finalThumbnails);

            set(state => {
              const newUploadingStates = { ...state.uploadingStates };
              delete newUploadingStates[postId];
              return {
                uploadingStates: newUploadingStates,
                posts: state.posts.map(p =>
                  p.id === postId
                    ? { ...p, images: finalImages, videos: finalVideos, videoThumbnails: finalThumbnails }
                    : p
                )
              };
            });

            toast.success(TOAST_MESSAGES.POST.UPDATE_SUCCESS);
          } catch (error) {
            console.error("Lỗi cập nhật bài viết:", error);
            const errorMessage = (error as any)?.message || 'Lỗi tải lên';
            set(state => ({
              uploadingStates: {
                ...state.uploadingStates,
                [postId]: { ...state.uploadingStates[postId], error: errorMessage }
              }
            }));
            toast.error(TOAST_MESSAGES.POST.UPDATE_FAILED(errorMessage));
          } finally {
            // Dọn dẹp URL tạm
            previewImages.forEach(url => URL.revokeObjectURL(url));
            previewVideos.forEach(url => URL.revokeObjectURL(url));
          }
        };

        processUpdate();
      },

      deletePost: async (postId: string, _images?: string[], _videos?: string[]) => {
        try {
          await postService.deletePost(postId);
          set((state) => ({
            posts: state.posts.filter(p => p.id !== postId)
          }));
          toast.success(TOAST_MESSAGES.POST.DELETE_SUCCESS);
        } catch (error) {
          console.error("Lỗi xóa bài viết:", error);
          toast.error(TOAST_MESSAGES.POST.DELETE_FAILED);
          throw error;
        }
      },

      reactToPost: async (postId: string, userId: string, reaction: string) => {
        const post = get().posts.find(p => p.id === postId) ?? get().selectedPost;
        if (!post) return;

        const prevMyReaction = post.myReaction;
        const prevCount = post.reactionCount ?? 0;
        const prevSummary = { ...(post.reactionSummary ?? {}) };
        const prevSelectedPost = get().selectedPost;

        const applyOptimistic = (p: Post): Post => {
          const isRemove = reaction === 'REMOVE' || p.myReaction === reaction;
          const oldType = p.myReaction;
          const newSummary = { ...(p.reactionSummary ?? {}) };
          let delta = 0;

          if (isRemove && oldType) {
            newSummary[oldType] = Math.max(0, (newSummary[oldType] ?? 1) - 1);
            if (newSummary[oldType] === 0) delete newSummary[oldType];
            delta = -1;
          } else if (!isRemove) {
            if (oldType) {
              newSummary[oldType] = Math.max(0, (newSummary[oldType] ?? 1) - 1);
              if (newSummary[oldType] === 0) delete newSummary[oldType];
            } else {
              delta = 1;
            }
            newSummary[reaction] = (newSummary[reaction] ?? 0) + 1;
          }

          return {
            ...p,
            myReaction: isRemove ? undefined : reaction,
            reactionCount: Math.max(0, (p.reactionCount ?? 0) + delta),
            reactionSummary: newSummary,
          };
        };

        set((state) => ({
          posts: state.posts.map(p => p.id === postId ? applyOptimistic(p) : p),
          selectedPost: state.selectedPost?.id === postId ? applyOptimistic(state.selectedPost) : state.selectedPost,
        }));

        try {
          await postService.reactToPost(postId, userId, reaction);
        } catch (error) {
          console.error("Lỗi react bài viết:", error);
          set((state) => ({
            posts: state.posts.map(p => p.id === postId ? { ...p, myReaction: prevMyReaction, reactionCount: prevCount, reactionSummary: prevSummary } : p),
            selectedPost: prevSelectedPost,
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

      clearPosts: () => set({ posts: [], lastDoc: null, hasMore: true }),

      setSelectedPost: (post: Post | null) => set({ selectedPost: post }),

      fetchPostById: async (postId: string, currentUserId: string, friendIds: string[]) => {
        useLoadingStore.getState().setLoading('feed', true);
        try {
          const post = await postService.getPostById(postId, currentUserId, friendIds);
          set({ selectedPost: post });
        } catch (error) {
          console.error("Lỗi lấy chi tiết bài viết:", error);
        } finally {
          useLoadingStore.getState().setLoading('feed', false);
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
