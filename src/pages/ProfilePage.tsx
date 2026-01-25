import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { userService } from '../services/userService';
import { User } from '../types';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/ui';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabs } from '../components/profile/ProfileTabs';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { AboutTab } from '../components/profile/AboutTab';
import { PostsTab } from '../components/profile/PostsTab';
import { FriendsTab } from '../components/profile/FriendsTab';
import { PhotosTab } from '../components/profile/PhotosTab';

type TabType = 'about' | 'posts' | 'friends' | 'photos';

const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState({ friendCount: 0, postCount: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('about');
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
      alert('Vui lòng chọn file ảnh');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh không được vượt quá 5MB');
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
      alert('Không thể tải lên ảnh đại diện');
    } finally {
      setUploading(false);
    }
  };

  const handleCoverChange = async (file: File) => {
    if (!profile || !isOwnProfile) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước ảnh không được vượt quá 10MB');
      return;
    }
    
    setUploading(true);
    try {
      const newCoverUrl = await userService.uploadCoverImage(profile.id, file);
      setProfile({ ...profile, coverImage: newCoverUrl });
    } catch (error) {
      console.error("Lỗi upload cover", error);
      alert('Không thể tải lên ảnh bìa');
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
      <div className="pb-8">
        {activeTab === 'about' && <AboutTab user={profile} />}
        {activeTab === 'posts' && <PostsTab userId={profile.id} currentUser={currentUser} />}
        {activeTab === 'friends' && <FriendsTab userId={profile.id} />}
        {activeTab === 'photos' && <PhotosTab userId={profile.id} />}
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