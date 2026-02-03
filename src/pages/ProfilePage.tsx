import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { useAuthStore } from '../store/authStore';
import { Spinner, Button, ConfirmDialog } from '../components/ui';
import { PostViewModal } from '../components/feed';
import { usePostStore } from '../store/postStore';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabs } from '../components/profile/ProfileTabs';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { PostsTab } from '../components/profile/PostsTab';
import { PhotosTab } from '../components/profile/PhotosTab';
import { ProfileSkeleton } from '../components/profile/ProfileSkeleton';
import { Video, User as UserIcon, Lock } from 'lucide-react';
import { useProfile } from '../hooks';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const {
    profile,
    stats,
    latestMedia,
    loading,
    uploading,
    isOwnProfile,
    friendStatus,
    canViewContent,
    activeTab,
    setActiveTab,
    handleMessage,
    handleFriendAction,
    confirmUnfriend,
    handleSaveProfile,
    handleAvatarChange,
    handleCoverChange,
    handleAvatarDelete,
    handleCoverDelete,
    isBlockedByMe,
    handleBlockUser,
    handleUnblockUser,
  } = useProfile();

  const { selectedPost, setSelectedPost } = usePostStore();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmUnfriendOpen, setIsConfirmUnfriendOpen] = useState(false);
  const [isConfirmDeleteAvatarOpen, setIsConfirmDeleteAvatarOpen] = useState(false);
  const [isConfirmDeleteCoverOpen, setIsConfirmDeleteCoverOpen] = useState(false);
  const [isConfirmBlockOpen, setIsConfirmBlockOpen] = useState(false);

  const onFriendActionClick = async () => {
    const { needConfirm } = await handleFriendAction();
    if (needConfirm) {
      setIsConfirmUnfriendOpen(true);
    }
  };

  const onUnfriendConfirm = async () => {
    await confirmUnfriend();
    setIsConfirmUnfriendOpen(false);
  };

  const onAvatarDeleteClick = async () => {
    await handleAvatarDelete();
    setIsConfirmDeleteAvatarOpen(false);
  };

  const onCoverDeleteClick = async () => {
    await handleCoverDelete();
    setIsConfirmDeleteCoverOpen(false);
  };

  if (loading || !profile || !currentUser) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-bg-secondary">
      <div className="bg-bg-primary shadow-sm mb-4">
        <ProfileHeader
          user={profile}
          stats={stats}
          isOwnProfile={isOwnProfile}
          friendStatus={friendStatus}
          onEditClick={() => setIsEditModalOpen(true)}
          onMessageClick={handleMessage}
          onFriendClick={onFriendActionClick}
          onAvatarChange={handleAvatarChange}
          onCoverChange={handleCoverChange}
          onAvatarDelete={() => setIsConfirmDeleteAvatarOpen(true)}
          onCoverDelete={() => setIsConfirmDeleteCoverOpen(true)}
          onBlockClick={() => setIsConfirmBlockOpen(true)}
          onUnblockClick={handleUnblockUser}
          isBlockedByMe={isBlockedByMe}
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
                  <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light p-4">
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
                  <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light p-4">
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
          <div className="bg-bg-primary rounded-2xl shadow-sm border border-border-light p-10">
            <div className="w-20 h-20 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock size={40} className="text-text-secondary" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">Không thể xem trang này</h2>
            <p className="text-text-secondary mb-8">Bạn đã chặn người dùng này. Bỏ chặn để xem nội dung của họ.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
        onConfirm={onUnfriendConfirm}
        title="Hủy kết bạn"
        message={`Bạn có chắc chắn muốn hủy kết bạn với ${profile?.name || ''}?`}
        confirmLabel="Hủy kết bạn"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={isConfirmDeleteAvatarOpen}
        onClose={() => setIsConfirmDeleteAvatarOpen(false)}
        onConfirm={onAvatarDeleteClick}
        title="Xóa ảnh đại diện"
        message="Bạn có chắc chắn muốn xóa ảnh đại diện hiện tại? Bạn sẽ quay về sử dụng ảnh mặc định."
        confirmLabel="Xóa ngay"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={isConfirmDeleteCoverOpen}
        onClose={() => setIsConfirmDeleteCoverOpen(false)}
        onConfirm={onCoverDeleteClick}
        title="Xóa ảnh bìa"
        message="Bạn có chắc chắn muốn xóa ảnh bìa hiện tại?"
        confirmLabel="Xóa ngay"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={isConfirmBlockOpen}
        onClose={() => setIsConfirmBlockOpen(false)}
        onConfirm={async () => {
          await handleBlockUser();
          setIsConfirmBlockOpen(false);
        }}
        title="Chặn người dùng"
        message={`Bạn có chắc chắn muốn chặn ${profile?.name || ''}? Hai bạn sẽ không thể tìm thấy nhau hoặc gửi tin nhắn mới.`}
        confirmLabel="Chặn người dùng"
        variant="danger"
      />

      <PostViewModal
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        post={selectedPost}
        author={selectedPost?.userId === profile?.id ? profile : null}
        currentUser={currentUser}
        onLike={async (postId) => {
          await usePostStore.getState().likePost(postId, currentUser.id);
        }}
      />
    </div>
  );
};

export default ProfilePage;
