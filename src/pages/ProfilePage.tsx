import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { chatService } from '../services/chatService';
import { friendService } from '../services/friendService';
import { postService } from '../services/postService';
import { User } from '../types';
import { useAuthStore } from '../store/authStore';
import { Spinner, Button, ConfirmDialog } from '../components/ui';
import { toast } from '../store/toastStore';
import { validateFileSize } from '../utils/fileUtils';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabs } from '../components/profile/ProfileTabs';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { AboutTab } from '../components/profile/AboutTab';
import { PostsTab } from '../components/profile/PostsTab';
import { FriendsTab } from '../components/profile/FriendsTab';
import { PhotosTab } from '../components/profile/PhotosTab';
import { Video, User as UserIcon, MessageCircle, Lock } from 'lucide-react';

type TabType = 'media' | 'posts' | 'friends' | 'photos' | 'videos';

const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState({ friendCount: 0, postCount: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmUnfriendOpen, setIsConfirmUnfriendOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [latestMedia, setLatestMedia] = useState<string[]>([]);

  const profileUserId = userId || currentUser?.id;
  const isOwnProfile = currentUser?.id === profileUserId;
  const isFriend = currentUser?.friendIds?.includes(profileUserId || '') || false;
  const canViewContent = isOwnProfile || isFriend;

  useEffect(() => {
    loadProfile();
  }, [profileUserId]);

  const loadProfile = async () => {
    if (!profileUserId) return;
    
    setLoading(true);
    try {
      const [userData, userStats, userPosts] = await Promise.all([
        userService.getUserById(profileUserId),
        userService.getUserStats(profileUserId),
        postService.getUserPosts(profileUserId, 20)
      ]);
      
      setProfile(userData || null);
      setStats(userStats);

      // Trích xuất 6 media mới nhất
      const media: string[] = [];
      userPosts.posts.forEach(post => {
        if (post.images) media.push(...post.images);
        if (post.videos) media.push(...post.videos);
      });
      setLatestMedia(media.slice(0, 6));

    } catch (error) {
      console.error("Lỗi load profile", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUser || !profile) return;
    try {
      const conversationId = await chatService.getOrCreateConversation(currentUser.id, profile.id);
      navigate(`/?conv=${conversationId}`);
    } catch (error) {
      toast.error('Không thể mở cuộc hội thoại');
    }
  };

  const handleFriendAction = async () => {
    if (!currentUser || !profile) return;
    try {
      if (isFriend) {
        setIsConfirmUnfriendOpen(true);
      } else {
        await friendService.sendFriendRequest(currentUser.id, profile.id);
        toast.success('Đã gửi lời mời kết bạn');
      }
    } catch (error) {
      toast.error('Thực hiện hành động thất bại');
    }
  };

  const confirmUnfriend = async () => {
    if (!currentUser || !profile) return;
    try {
      await friendService.unfriend(currentUser.id, profile.id);
      toast.success('Đã hủy kết bạn');
      loadProfile();
    } catch (error) {
      toast.error('Không thể hủy kết bạn');
    } finally {
      setIsConfirmUnfriendOpen(false);
    }
  };

  const handleSaveProfile = async (data: Partial<User>) => {
    if (!profile) return;
    
    try {
      const updated = await userService.updateProfile(profile.id, data);
      setProfile(updated);
      
      if (isOwnProfile && currentUser) {
        useAuthStore.setState({ user: updated });
      }
    } catch (error) {
      console.error("Lỗi cập nhật profile", error);
      throw error;
    }
  };

  const handleAvatarChange = async (file: File) => {
    if (!profile || !isOwnProfile) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }
    if (!validateFileSize(file, 'AVATAR')) return;
    
    setUploading(true);
    try {
      const newAvatarUrl = await userService.uploadAvatar(profile.id, file);
      setProfile({ ...profile, avatar: newAvatarUrl });
      if (currentUser) {
        useAuthStore.setState({ user: { ...currentUser, avatar: newAvatarUrl } });
      }
    } catch (error) {
      console.error("Lỗi upload avatar", error);
      toast.error('Không thể tải lên ảnh đại diện');
    } finally {
      setUploading(false);
    }
  };

  const handleCoverChange = async (file: File) => {
    if (!profile || !isOwnProfile) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }
    if (!validateFileSize(file, 'COVER')) return;
    
    setUploading(true);
    try {
      const newCoverUrl = await userService.uploadCoverImage(profile.id, file);
      setProfile({ ...profile, coverImage: newCoverUrl });
    } catch (error) {
      console.error("Lỗi upload cover", error);
      toast.error('Không thể tải lên ảnh bìa');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !profile || !currentUser) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-secondary">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-bg-secondary">
      <div className="bg-bg-primary transition-theme shadow-sm mb-4">
        <ProfileHeader
          user={profile}
          stats={stats}
          isOwnProfile={isOwnProfile}
          isFriend={isFriend}
          onEditClick={() => setIsEditModalOpen(true)}
          onMessageClick={handleMessage}
          onFriendClick={handleFriendAction}
          onAvatarChange={handleAvatarChange}
          onCoverChange={handleCoverChange}
          uploading={uploading}
        />

        {canViewContent && (
          <ProfileTabs activeTab={activeTab as any} onTabChange={setActiveTab as any} />
        )}
      </div>

      {canViewContent ? (
        <div className="max-w-5xl mx-auto px-4 pt-2 pb-12">
          {activeTab === 'posts' ? (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-[360px] flex-shrink-0 space-y-4">
                  {/* Khối Giới thiệu */}
                  <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light p-4 transition-theme">
                    <h3 className="font-bold text-lg mb-4 text-text-primary">Giới thiệu</h3>
                    {profile.bio && (
                      <p className="text-text-primary text-sm mb-4 text-center italic">
                        "{profile.bio}"
                      </p>
                    )}
                    <div className="space-y-3">
                      {profile.birthDate || profile.gender || profile.location ? (
                        <>
                          {profile.gender && (
                            <div className="flex items-center gap-3 text-text-secondary text-sm">
                              <div className="w-8 h-8 flex items-center justify-center bg-bg-secondary rounded-lg">
                                <UserIcon size={16} />
                              </div>
                              <span>Giới tính <strong className="text-text-primary">{profile.gender === 'male' ? 'Nam' : profile.gender === 'female' ? 'Nữ' : 'Khác'}</strong></span>
                            </div>
                          )}
                          {profile.birthDate && (
                            <div className="flex items-center gap-3 text-text-secondary text-sm">
                              <div className="w-8 h-8 flex items-center justify-center bg-bg-secondary rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z"></path></svg>
                              </div>
                              <span>Sinh ngày <strong className="text-text-primary">{new Date(profile.birthDate).toLocaleDateString('vi-VN')}</strong></span>
                            </div>
                          )}
                          {profile.location && (
                            <div className="flex items-center gap-3 text-text-secondary text-sm">
                              <div className="w-8 h-8 flex items-center justify-center bg-bg-secondary rounded-lg">
                                <div className="text-text-secondary">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </div>
                              </div>
                              <span>Đến từ <strong className="text-text-primary">{profile.location}</strong></span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-text-secondary text-sm text-center py-2">
                          Chưa có thông tin giới thiệu
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Khối Ảnh/Video Preview */}
                  <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light p-4 transition-theme">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg text-text-primary">Ảnh/Video</h3>
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('media')}
                        className="text-primary hover:underline font-medium h-auto p-0"
                      >
                        Xem tất cả
                      </Button>
                    </div>
                    {latestMedia.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {latestMedia.map((url, idx) => (
                          <div 
                            key={idx} 
                            className="aspect-square rounded-lg overflow-hidden bg-bg-secondary cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setActiveTab('media')}
                          >
                            {url.includes('.mp4') || url.includes('video') || (url.includes('storage') && url.includes('videos')) ? (
                              <video src={url} className="w-full h-full object-cover" />
                            ) : (
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                   <PostsTab userId={profile.id} currentUser={currentUser} />
                </div>
              </div>
            ) : (
              <div>
                {activeTab === 'media' && <PhotosTab userId={profile.id} />}
              </div>
            )}
          </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="bg-bg-primary rounded-2xl shadow-sm border border-border-light p-10 transition-theme">
            <div className="w-20 h-20 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock size={40} className="text-text-secondary" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">Trang cá nhân của {profile.name}</h2>
            <p className="text-text-secondary mb-8">Kết bạn để xem bài viết và thông tin của người này.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Nút kết bạn đã có trong ProfileHeader nếu cần, hoặc thêm ở đây */}
              <Button onClick={() => navigate('/contacts')} variant="primary" className="px-8">
                Tìm kiếm bạn bè
              </Button>
            </div>
          </div>
        </div>
      )}

      <EditProfileModal
        user={profile}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProfile}
      />

      <ConfirmDialog
        isOpen={isConfirmUnfriendOpen}
        onClose={() => setIsConfirmUnfriendOpen(false)}
        onConfirm={confirmUnfriend}
        title="Hủy kết bạn"
        message={`Bạn có chắc chắn muốn hủy kết bạn với ${profile?.name || ''}?`}
        confirmLabel="Hủy kết bạn"
        variant="danger"
      />
    </div>
  );
};

export default ProfilePage;
