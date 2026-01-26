import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { userService } from '../services/userService';
import { User } from '../types';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/ui';
import { toast } from '../store/toastStore';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabs } from '../components/profile/ProfileTabs';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { AboutTab } from '../components/profile/AboutTab';
import { PostsTab } from '../components/profile/PostsTab';
import { FriendsTab } from '../components/profile/FriendsTab';
import { PhotosTab } from '../components/profile/PhotosTab';
import { Video, User as UserIcon } from 'lucide-react';

type TabType = 'about' | 'posts' | 'friends' | 'photos' | 'videos';

const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState({ friendCount: 0, postCount: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const profileUserId = userId || currentUser?.id;
  const isOwnProfile = currentUser?.id === profileUserId;

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

  const handleSaveProfile = async (data: Partial<User>) => {
    if (!profile) return;
    
    try {
      const updated = await userService.updateProfile(profile.id, data);
      setProfile(updated);
      
      // Update auth store nếu là profile của mình
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
    
    // Validate file
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
      
      // Update auth store
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
    
    // Validate file
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
      
      {/* Header */}
      <ProfileHeader
        user={profile}
        stats={stats}
        isOwnProfile={isOwnProfile}
        onEditClick={() => setIsEditModalOpen(true)}
        onAvatarChange={handleAvatarChange}
        onCoverChange={handleCoverChange}
        uploading={uploading}
      />

      {/* Tabs */}
      <ProfileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">
        {activeTab === 'posts' ? (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Column: Intro */}
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

            {/* Right Column: Posts */}
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

      {/* Edit Modal */}
      <EditProfileModal
        user={profile}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProfile}
      />

    </div>
  );
};

export default ProfilePage;