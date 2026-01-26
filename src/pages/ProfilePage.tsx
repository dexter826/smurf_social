import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { chatService } from '../services/chatService';
import { friendService } from '../services/friendService';
import { User } from '../types';
import { useAuthStore } from '../store/authStore';
import { Spinner, Button, ConfirmDialog } from '../components/ui';
import { toast } from '../store/toastStore';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabs } from '../components/profile/ProfileTabs';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { AboutTab } from '../components/profile/AboutTab';
import { PostsTab } from '../components/profile/PostsTab';
import { FriendsTab } from '../components/profile/FriendsTab';
import { PhotosTab } from '../components/profile/PhotosTab';
import { Video, User as UserIcon, MessageCircle, Lock } from 'lucide-react';

type TabType = 'about' | 'posts' | 'friends' | 'photos' | 'videos';

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
      const [userData, userStats] = await Promise.all([
        userService.getUserById(profileUserId),
        userService.getUserStats(profileUserId)
      ]);
      
      setProfile(userData || null);
      setStats(userStats);
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
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB');
      return;
    }
    
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
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 10MB');
      return;
    }
    
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
    <div className="h-full w-full overflow-y-auto">
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

      {canViewContent ? (
        <>
          <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">
            {activeTab === 'posts' ? (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-[360px] flex-shrink-0 space-y-4">
                  <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light p-4 transition-theme">
                    <h3 className="font-bold text-lg mb-4 text-text-primary">Giới thiệu</h3>
                    {profile.bio && (
                      <p className="text-text-primary text-sm mb-4 text-center italic">
                        "{profile.bio}"
                      </p>
                    )}
                    <div className="space-y-3">
                      {profile.birthDate || profile.gender ? (
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
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                              </div>
                              <span>Sinh ngày <strong className="text-text-primary">{new Date(profile.birthDate).toLocaleDateString('vi-VN')}</strong></span>
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
                </div>
                <div className="flex-1 min-w-0">
                   <PostsTab userId={profile.id} currentUser={currentUser} />
                </div>
              </div>
            ) : (
              <div>
                {activeTab === 'photos' && <PhotosTab userId={profile.id} />}
                {activeTab === 'videos' && (
                  <div className="bg-bg-primary rounded-lg shadow-sm border border-border-light p-8 text-center transition-theme">
                    <Video size={48} className="mx-auto mb-3 text-text-secondary" />
                    <p className="text-text-secondary">Chưa có video nào</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
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
