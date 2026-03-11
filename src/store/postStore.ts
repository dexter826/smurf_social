import { Post, Visibility, PostStatus, ReactionType, MediaObject } from '../types';
import { postService } from '../services/postService';
import { DocumentSnapshot, Timestamp } from 'firebase/firestore';
import { toast } from './toastStore';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PAGINATION, TOAST_MESSAGES } from '../constants';
import { useLoadingStore } from './loadingStore';

interface PostState {
  posts: Post[];
  myPostReactions: Record<string, string>; // postId -> reactionType
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
  abortController: AbortController | null;
  uploadingStates: Record<string, { progress: number; error?: string }>;
  isError: boolean;

  fetchPosts: (currentUserId: string, loadMore?: boolean) => Promise<void>;
  subscribeToPosts: (currentUserId: string) => () => void;
  createPost: (userId: string, content: string, media: MediaObject[], visibility: Visibility, pendingFiles?: File[]) => Promise<void>;
  updatePost: (postId: string, content: string, media: MediaObject[], visibility: Visibility, pendingFiles?: File[]) => Promise<void>;
  deletePost: (postId: string, userId: string, images?: string[], videos?: string[]) => Promise<void>;
  reactToPost: (postId: string, userId: string, reaction: string) => Promise<void>;
  uploadMedia: (files: File[], userId: string) => Promise<MediaObject[]>;

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
      myPostReactions: {},
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
          myPostReactions: {},
          hasMore: true,
          lastDoc: null,
          abortController: null,
          isError: false,
          selectedPost: null,
          uploadingStates: {}
        });
      },

      fetchPosts: async (currentUserId: string, loadMore = false) => {
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
          const result = await postService.getFeedFromFanout(
            currentUserId,
            PAGINATION.FEED_POSTS,
            loadMore ? lastDoc || undefined : undefined
          );

          if (newController.signal.aborted) return;

          // Load myReactions for posts
          const postIds = result.posts.map(p => p.id);
          const myReactions = await postService.batchLoadMyReactions(postIds, currentUserId);

          set({
            posts: loadMore ? [...posts, ...result.posts] : result.posts,
            myPostReactions: loadMore ? { ...get().myPostReactions, ...myReactions } : myReactions,
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

      subscribeToPosts: (currentUserId: string) => {
        const currentCount = Math.max(get().posts.length, PAGINATION.FEED_POSTS);

        const unsubscribe = postService.subscribeToFeedFanout(
          currentUserId,
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
                  posts: [...newPosts, ...currentPosts].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
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

      createPost: async (userId: string, content: string, media: MediaObject[], visibility: Visibility = Visibility.PUBLIC, pendingFiles?: File[]) => {
        const postId = postService.generatePostId();
        const previewMedia = pendingFiles ? pendingFiles.map(f => ({
          url: URL.createObjectURL(f),
          fileName: f.name,
          mimeType: f.type,
          size: f.size,
          isSensitive: false,
        } as MediaObject)) : [];

        const newPost: Post = {
          id: postId,
          authorId: userId,
          content,
          media: [...media, ...previewMedia],
          visibility,
          commentCount: 0,
          createdAt: Timestamp.now(),
          status: PostStatus.ACTIVE,
          reactions: {},
        };

        set(state => ({
          posts: [newPost, ...state.posts],
          uploadingStates: { ...state.uploadingStates, [postId]: { progress: 0 } }
        }));

        const processUpload = async () => {
          try {
            let finalMedia = [...media];

            if (pendingFiles && pendingFiles.length > 0) {
              const uploadedMedia = await postService.uploadPostMedia(pendingFiles, userId, (progress) => {
                set(state => ({
                  uploadingStates: {
                    ...state.uploadingStates,
                    [postId]: { ...state.uploadingStates[postId], progress }
                  }
                }));
              });
              finalMedia = [...finalMedia, ...uploadedMedia];
            }

            await postService.createPost({
              authorId: userId,
              content,
              media: finalMedia,
              visibility,
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
            previewMedia.forEach(m => URL.revokeObjectURL(m.url));
          }
        };

        processUpload();
      },

      updatePost: async (postId: string, content: string, media: MediaObject[], visibility: Visibility, pendingFiles?: File[]) => {
        const { posts } = get();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const previewMedia = pendingFiles ? pendingFiles.map(f => ({
          url: URL.createObjectURL(f),
          fileName: f.name,
          mimeType: f.type,
          size: f.size,
          isSensitive: false,
        } as MediaObject)) : [];

        set(state => ({
          posts: state.posts.map(p =>
            p.id === postId
              ? {
                ...p,
                content,
                media: [...media, ...previewMedia],
                visibility,
                isEdited: true,
                editedAt: Timestamp.now()
              }
              : p
          ),
          uploadingStates: pendingFiles && pendingFiles.length > 0
            ? { ...state.uploadingStates, [postId]: { progress: 0 } }
            : state.uploadingStates
        }));

        const processUpdate = async () => {
          try {
            let finalMedia = [...media];

            if (pendingFiles && pendingFiles.length > 0) {
              const uploadedMedia = await postService.uploadPostMedia(pendingFiles, post.authorId, (progress) => {
                set(state => ({
                  uploadingStates: {
                    ...state.uploadingStates,
                    [postId]: { ...state.uploadingStates[postId], progress }
                  }
                }));
              });
              finalMedia = [...finalMedia, ...uploadedMedia];
            }

            await postService.updatePost(postId, content, finalMedia, visibility);

            set(state => {
              const newUploadingStates = { ...state.uploadingStates };
              delete newUploadingStates[postId];
              return {
                uploadingStates: newUploadingStates,
                posts: state.posts.map(p =>
                  p.id === postId
                    ? { ...p, media: finalMedia }
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
            previewMedia.forEach(m => URL.revokeObjectURL(m.url));
          }
        };

        processUpdate();
      },

      deletePost: async (postId: string, userId: string, _images?: string[], _videos?: string[]) => {
        try {
          await postService.deletePost(postId, userId);
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

        const prevMyReaction = get().myPostReactions[postId];
        const prevReactions = { ...post.reactions };
        const prevSelectedPost = get().selectedPost;

        const isRemove = reaction === 'REMOVE' || prevMyReaction === reaction;
        const oldType = prevMyReaction;

        const applyOptimistic = (p: Post): Post => {
          const newReactions = { ...p.reactions };

          if (isRemove && oldType) {
            newReactions[oldType as ReactionType] = Math.max(0, (newReactions[oldType as ReactionType] ?? 1) - 1);
            if (newReactions[oldType as ReactionType] === 0) delete newReactions[oldType as ReactionType];
          } else if (!isRemove) {
            if (oldType) {
              newReactions[oldType as ReactionType] = Math.max(0, (newReactions[oldType as ReactionType] ?? 1) - 1);
              if (newReactions[oldType as ReactionType] === 0) delete newReactions[oldType as ReactionType];
            }
            newReactions[reaction as ReactionType] = (newReactions[reaction as ReactionType] ?? 0) + 1;
          }

          return {
            ...p,
            reactions: newReactions,
          };
        };

        // Update myPostReactions
        const newMyReactions = { ...get().myPostReactions };
        if (isRemove) {
          delete newMyReactions[postId];
        } else {
          newMyReactions[postId] = reaction;
        }

        set((state) => ({
          posts: state.posts.map(p => p.id === postId ? applyOptimistic(p) : p),
          selectedPost: state.selectedPost?.id === postId ? applyOptimistic(state.selectedPost) : state.selectedPost,
          myPostReactions: newMyReactions,
        }));

        try {
          await postService.reactToPost(postId, userId, reaction);
        } catch (error) {
          console.error("Lỗi react bài viết:", error);
          set((state) => ({
            posts: state.posts.map(p => p.id === postId ? { ...p, reactions: prevReactions } : p),
            selectedPost: prevSelectedPost,
            myPostReactions: { ...state.myPostReactions, [postId]: prevMyReaction },
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
          const myReaction = await postService.getMyReactionForPost(postId, currentUserId);

          set({
            selectedPost: post,
            myPostReactions: { ...get().myPostReactions, [postId]: myReaction || '' }
          });
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

