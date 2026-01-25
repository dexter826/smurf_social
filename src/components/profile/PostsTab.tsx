import React, { useEffect, useState } from 'react';
import { Post, User } from '../../types';
import { postService } from '../../services/postService';
import { userService } from '../../services/userService';
import { Spinner } from '../ui';
import { PostItem } from '../feed/PostItem';

interface PostsTabProps {
  userId: string;
  currentUser: User;
}

export const PostsTab: React.FC<PostsTabProps> = ({ userId, currentUser }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, [userId]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const userPosts = await postService.getUserPosts(userId);
      setPosts(userPosts);
      
      // Load user info cho từng post
      const userIds = Array.from(new Set(userPosts.map(p => p.userId)));
      const usersData: Record<string, User> = {};
      for (const uid of userIds) {
        const user = await userService.getUserById(uid);
        if (user) usersData[uid] = user;
      }
      setUsers(usersData);
    } catch (error) {
      console.error("Lỗi load posts", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const isLiked = post.likes.includes(currentUser.id);
      await postService.likePost(postId, currentUser.id, isLiked);
      
      await loadPosts();
    } catch (error) {
      console.error("Lỗi like post", error);
    }
  };

  const handleComment = (postId: string) => {
    // Scroll to comment section
  };

  const handleEdit = (postId: string) => {
    // Open edit modal
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
    
    try {
      const post = posts.find(p => p.id === postId);
      await postService.deletePost(postId, post?.images);
      await loadPosts();
    } catch (error) {
      console.error("Lỗi xóa post", error);
      alert('Không thể xóa bài viết');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="bg-bg-main rounded-lg shadow-card p-8 text-center">
          <p className="text-text-secondary">Chưa có bài viết nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="space-y-4">
        {posts.map((post) => (
          <PostItem
            key={post.id}
            post={post}
            author={users[post.userId]}
            currentUser={currentUser}
            onLike={handleLike}
            onComment={handleComment}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
};
