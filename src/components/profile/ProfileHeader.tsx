import React, { useRef } from 'react';
import { Camera, Users, FileText, MessageCircle, UserPlus, UserCheck, Edit, Trash2, Pencil, Camera as CameraIcon } from 'lucide-react';
import { User, UserStatus } from '../../types';
import { Avatar, UserAvatar, Button, Dropdown, DropdownItem } from '../ui';
import { Image as ImageIcon } from 'lucide-react';

interface ProfileHeaderProps {
  user: User;
  stats: { friendCount: number; postCount: number };
  isOwnProfile: boolean;
  isFriend?: boolean;
  onEditClick?: () => void;
  onMessageClick?: () => void;
  onFriendClick?: () => void;
  onAvatarChange?: (file: File) => void;
  onCoverChange?: (file: File) => void;
  onAvatarDelete?: () => void;
  onCoverDelete?: () => void;
  uploading?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  stats,
  isOwnProfile,
  isFriend = false,
  onEditClick,
  onMessageClick,
  onFriendClick,
  onAvatarChange,
  onCoverChange,
  onAvatarDelete,
  onCoverDelete,
  uploading = false
}) => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarCameraRef = useRef<HTMLInputElement>(null);
  const coverCameraRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (isOwnProfile && !uploading) {
      avatarInputRef.current?.click();
    }
  };

  const handleAvatarCameraClick = () => {
    if (isOwnProfile && !uploading) {
      avatarCameraRef.current?.click();
    }
  };

  const handleCoverClick = () => {
    if (isOwnProfile && !uploading) {
      coverInputRef.current?.click();
    }
  };

  const handleCoverCameraClick = () => {
    if (isOwnProfile && !uploading) {
      coverCameraRef.current?.click();
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarChange) {
      onAvatarChange(file);
    }
    e.target.value = '';
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onCoverChange) {
      onCoverChange(file);
    }
    e.target.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Cover */}
      <div className="relative h-[200px] md:h-[320px] w-full md:rounded-b-2xl shadow-sm">
        {/* Background Image Layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600 md:rounded-b-2xl overflow-hidden">
          <img 
            src={user.coverImage || '/cover-image.jpg'} 
            className="w-full h-full object-cover" 
            alt="Cover"
          />
        </div>
        
        {isOwnProfile && (
          <div className="absolute bottom-4 right-4 z-10">
            <Dropdown
              trigger={
                <Button 
                  isLoading={uploading}
                  variant="ghost"
                  className="bg-black/30 backdrop-blur-md text-white hover:bg-black/50 hover:!text-white transition-all gap-2 border border-white/20 rounded-xl"
                  icon={<Pencil size={18} />}
                >
                  <span>Chỉnh sửa ảnh bìa</span>
                </Button>
              }
              align="right"
            >
              <DropdownItem
                icon={<ImageIcon size={16} />}
                label="Tải ảnh lên"
                onClick={handleCoverClick}
              />
              <DropdownItem
                icon={<CameraIcon size={16} />}
                label="Chụp ảnh ngay"
                onClick={handleCoverCameraClick}
              />
              {user.coverImage && (
                <DropdownItem
                  icon={<Trash2 size={16} />}
                  label="Xóa ảnh bìa"
                  variant="danger"
                  onClick={onCoverDelete || (() => {})}
                />
              )}
            </Dropdown>
          </div>
        )}
        
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverFileChange}
          className="hidden"
        />
        <input
          ref={coverCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCoverFileChange}
          className="hidden"
        />
      </div>

      {/* Profile Info */}
      <div className="px-4">
        <div className="relative pb-0 transition-theme">
          <div className="flex flex-col md:flex-row md:items-end gap-6 pb-6 mt-2">
            
            {/* Avatar */}
            <div className="relative group -mt-12 md:-mt-16">
              <div className="relative">
                <div className="p-1 bg-bg-primary rounded-full transition-theme">
                  <UserAvatar 
                    userId={user.id} 
                    src={user.avatar} 
                    name={user.name}
                    size="2xl" 
                    className="border-4 border-bg-primary shadow-lg" 
                    initialStatus={user.status} 
                  />
                </div>
                
                {isOwnProfile && (
                  <div className="absolute bottom-2 right-2 z-10">
                    <Dropdown
                      trigger={
                        <Button
                          isLoading={uploading}
                          variant="secondary"
                          className="shadow-md border-2 border-bg-primary rounded-full w-10 h-10 p-0 flex items-center justify-center"
                          icon={<Pencil size={18} />}
                        />
                      }
                      align="left"
                    >
                      <DropdownItem
                        icon={<ImageIcon size={16} />}
                        label="Tải ảnh lên"
                        onClick={handleAvatarClick}
                      />
                      <DropdownItem
                        icon={<CameraIcon size={16} />}
                        label="Chụp ảnh ngay"
                        onClick={handleAvatarCameraClick}
                      />
                      {user.avatar && (
                        <DropdownItem
                          icon={<Trash2 size={16} />}
                          label="Xóa ảnh đại diện"
                          variant="danger"
                          onClick={onAvatarDelete || (() => {})}
                        />
                      )}
                    </Dropdown>
                  </div>
                )}
              </div>
              
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
              <input
                ref={avatarCameraRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
            </div>

            {/* Info */}
            <div className="flex-1 pb-1">
              <h1 className="text-3xl font-bold text-text-primary">{user.name}</h1>
              
              {/* Stats */}
              <div className="flex items-center gap-6 mt-2 text-sm text-text-secondary">
                <div className="flex items-center gap-1.5 bg-bg-secondary px-3 py-1 rounded-full border border-divider">
                  <FileText size={14} className="text-primary-500" />
                  <span><strong className="text-text-primary">{stats.postCount}</strong> bài viết</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:mb-2">
              {isOwnProfile ? (
                <Button 
                  variant="secondary" 
                  onClick={onEditClick} 
                  icon={<Edit size={18} />}
                  className="border-border-medium text-text-primary hover:bg-bg-hover"
                >
                  Chỉnh sửa thông tin
                </Button>
              ) : (
                <>
                  {isFriend ? (
                    <>
                      <Button 
                        onClick={onMessageClick} 
                        icon={<MessageCircle size={18} />}
                        className="bg-primary-600 hover:bg-primary-700 shadow-md"
                      >
                        Nhắn tin
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={onFriendClick} 
                        icon={<UserCheck size={18} />}
                        className="border-primary-100 bg-primary-50 text-primary-600 hover:bg-primary-100"
                      >
                        Bạn bè
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={onFriendClick} 
                      icon={<UserPlus size={18} />}
                      className="bg-primary-600 hover:bg-primary-700 shadow-md"
                    >
                      Kết bạn
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
