import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Image as ImageIcon, Video } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { postService } from '../services/postService';
import { userService } from '../services/userService';
import { Post, User } from '../types';
import { Avatar, Spinner } from '../components/ui';
import { useAuthStore } from '../store/authStore';

const FeedPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});

  useEffect(() => {
    const loadData = async () => {
        try {
            const [fetchedPosts, friends] = await Promise.all([
                postService.getFeed(),
                userService.getAllFriends(currentUser?.id || '')
            ]);
            
            const uMap: Record<string, User> = {};
            friends.forEach(u => uMap[u.id] = u);
            if(currentUser) uMap['me'] = currentUser;
            
            setUsersMap(uMap);
            setPosts(fetchedPosts);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [currentUser]);

  const handleLike = async (postId: string) => {
      const post = posts.find(p => p.id === postId);
      if(!currentUser || !post) return;
      const isLiked = post.likes.includes(currentUser.id);
      await postService.likePost(postId, currentUser.id, isLiked);
      setPosts(prev => prev.map(p => {
          if (p.id !== postId) return p;
          const isLiked = p.likes.includes(currentUser.id);
          return {
              ...p,
              likes: isLiked ? p.likes.filter(id => id !== currentUser.id) : [...p.likes, currentUser.id]
          };
      }));
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Spinner /></div>;

  return (
    <div className="flex justify-center h-full w-full overflow-y-auto bg-[#eef0f1] dark:bg-gray-900">
      <div className="w-full max-w-[640px] py-6 space-y-4 px-2 md:px-0 pb-20">
        
        {/* Create Post */}
        <div className="bg-bg-main rounded-xl p-4 shadow-card border border-gray-100">
            <div className="flex gap-3 mb-4">
                <Avatar src={currentUser?.avatar} size="md" />
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2.5 flex items-center text-text-secondary cursor-pointer hover:bg-gray-200 transition-colors">
                    Hôm nay bạn thế nào?
                </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
                 <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 rounded-lg text-sm font-medium text-text-secondary">
                     <ImageIcon className="text-green-500" size={20} /> Ảnh
                 </button>
                 <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 rounded-lg text-sm font-medium text-text-secondary">
                     <Video className="text-red-500" size={20} /> Video
                 </button>
            </div>
        </div>

        {/* Posts */}
        {posts.map(post => {
            const author = usersMap[post.userId];
            const isLiked = post.likes.includes(currentUser?.id || '');

            return (
                <div key={post.id} className="bg-bg-main rounded-xl shadow-card border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 flex items-start justify-between">
                        <div className="flex gap-3">
                            <Avatar src={author?.avatar} size="md" />
                            <div>
                                <h3 className="font-bold text-text-main text-[15px]">{author?.name || 'Unknown User'}</h3>
                                <p className="text-xs text-text-secondary mt-0.5">
                                    {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                                    <span className="mx-1">•</span>
                                    {post.visibility === 'public' ? 'Công khai' : 'Bạn bè'}
                                </p>
                            </div>
                        </div>
                        <button className="text-text-secondary hover:bg-gray-100 p-1.5 rounded-full"><MoreHorizontal size={20} /></button>
                    </div>

                    {/* Content */}
                    <div className="px-4 pb-3 text-text-main whitespace-pre-line text-[15px] leading-relaxed">
                        {post.content}
                    </div>

                    {/* Images */}
                    {post.images && post.images.length > 0 && (
                        <div className="cursor-pointer bg-gray-100">
                            <img src={post.images[0]} className="w-full h-auto max-h-[600px] object-contain" loading="lazy" />
                        </div>
                    )}

                    {/* Stats */}
                    <div className="px-4 py-3 flex justify-between items-center border-b border-gray-50">
                        <div className="flex items-center gap-1.5">
                            <div className="bg-primary-500 p-1 rounded-full"><Heart size={12} className="text-white fill-white" /></div>
                            <span className="text-sm text-text-secondary font-medium">{post.likes.length}</span>
                        </div>
                        <div className="text-sm text-text-secondary hover:underline cursor-pointer">
                            {post.comments.length} bình luận
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex px-2 py-1">
                        <button 
                            onClick={() => handleLike(post.id)}
                            className={`flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg transition-all active:scale-95 ${isLiked ? 'text-primary-500' : 'text-text-secondary hover:bg-gray-50'}`}
                        >
                            <Heart size={20} className={isLiked ? "fill-current" : ""} /> 
                            <span className="text-sm font-medium">Thích</span>
                        </button>
                        <button className="flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg text-text-secondary hover:bg-gray-50 transition-all">
                            <MessageCircle size={20} />
                            <span className="text-sm font-medium">Bình luận</span>
                        </button>
                        <button className="flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg text-text-secondary hover:bg-gray-50 transition-all">
                            <Share2 size={20} />
                            <span className="text-sm font-medium">Chia sẻ</span>
                        </button>
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};

export default FeedPage;