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
      <div className="max-w-5xl mx-auto px-4 pb-8">
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
                  {profile.workplace && (
                    <div className="flex items-center gap-3 text-text-secondary text-sm">
                      <div className="w-8 h-8 flex items-center justify-center bg-bg-secondary rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                      </div>
                      <span>Làm việc tại <strong className="text-text-primary">{profile.workplace}</strong></span>
                    </div>
                  )}
                  {profile.education && (
                    <div className="flex items-center gap-3 text-text-secondary text-sm">
                      <div className="w-8 h-8 flex items-center justify-center bg-bg-secondary rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14v10"></path></svg>
                      </div>
                      <span>Từng học tại <strong className="text-text-primary">{profile.education}</strong></span>
                    </div>
                  )}
                  {profile.location && (
                    <div className="flex items-center gap-3 text-text-secondary text-sm">
                      <div className="w-8 h-8 flex items-center justify-center bg-bg-secondary rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      </div>
                      <span>Sống tại <strong className="text-text-primary">{profile.location}</strong></span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setActiveTab('about')}
                  className="w-full mt-4 py-2 bg-bg-secondary hover:bg-bg-hover text-text-primary text-sm font-medium rounded-lg transition-all"
                >
                  Xem thêm chi tiết
                </button>
              </div>
            </div>

            {/* Right Column: Posts */}
            <div className="flex-1 min-w-0">
               <PostsTab userId={profile.id} currentUser={currentUser} />
            </div>
          </div>
        ) : (
          <div>
            {activeTab === 'about' && <AboutTab user={profile} />}
            {activeTab === 'friends' && <FriendsTab userId={profile.id} />}
            {activeTab === 'photos' && <PhotosTab userId={profile.id} />}
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