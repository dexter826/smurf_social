import React, { useRef, useState } from 'react';
import { Camera, Users, FileText, MessageCircle, UserPlus, UserCheck, Edit, Trash2, Pencil, Camera as CameraIcon, Settings, MoreHorizontal, Flag, Ban, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User, UserStatus, ReportType } from '../../types';
import { FriendStatus } from '../../types';
import { Avatar, UserAvatar, Button, Dropdown, DropdownItem, ImageCropper } from '../ui';
import { Image as ImageIcon } from 'lucide-react';
import { useReportStore } from '../../store/reportStore';

interface ProfileHeaderProps {
  user: User;
  stats: { friendCount: number; postCount: number };
  isOwnProfile: boolean;
  friendStatus?: FriendStatus;
  onEditClick?: () => void;
  onMessageClick?: () => void;
  onFriendClick?: () => void;
  onAvatarChange?: (file: File) => void;
  onCoverChange?: (file: File) => void;
  onAvatarDelete?: () => void;
  onCoverDelete?: () => void;
  onBlockClick?: () => void;
  onUnblockClick?: () => void;
  isBlockedByMe?: boolean;
  uploading?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  stats,
  isOwnProfile,
  friendStatus = FriendStatus.NOT_FRIEND,
  onEditClick,
  onMessageClick,
  onFriendClick,
  onAvatarChange,
  onCoverChange,
  onAvatarDelete,
  onCoverDelete,
  onBlockClick,
  onUnblockClick,
  isBlockedByMe = false,
  uploading = false
}) => {
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarCameraRef = useRef<HTMLInputElement>(null);
  const coverCameraRef = useRef<HTMLInputElement>(null);
  const { openReportModal } = useReportStore();

  // State cho crop modal
  const [cropState, setCropState] = useState<{
    isOpen: boolean;
    type: 'avatar' | 'cover';
    image: string;
  } | null>(null);

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
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      setCropState({ isOpen: true, type: 'avatar', image: blobUrl });
    }
    e.target.value = '';
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      setCropState({ isOpen: true, type: 'cover', image: blobUrl });
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedFile: File) => {
    if (cropState?.type === 'avatar' && onAvatarChange) {
      onAvatarChange(croppedFile);
    } else if (cropState?.type === 'cover' && onCoverChange) {
      onCoverChange(croppedFile);
    }
    // Cleanup blob URL
    if (cropState?.image) {
      URL.revokeObjectURL(cropState.image);
    }
    setCropState(null);
  };

  const handleCropCancel = () => {
    if (cropState?.image) {
      URL.revokeObjectURL(cropState.image);
    }
    setCropState(null);
  };

  return (
    <>
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
                  <span className="hidden md:inline">Chỉnh sửa ảnh bìa</span>
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
          <div className="flex flex-col md:flex-row items-center md:items-end text-center md:text-left gap-6 pb-6 mt-2">
            
            {/* Avatar */}
            <div className="relative group -mt-16 md:-mt-20 z-20 mx-auto md:mx-0">
              <div className="relative">
                <div className="p-1 bg-bg-primary rounded-full transition-theme">
                  <UserAvatar 
                    userId={user.id} 
                    src={user.avatar} 
                    name={user.name}
                    size="2xl" 
                    className="border-4 border-bg-primary shadow-lg" 
                    initialStatus={user.status}
                    showStatus={false}
                  />
                </div>
                
                {isOwnProfile && (
                  <div className="absolute bottom-1 right-1 z-30">
                    <Dropdown
                      trigger={
                        <Button
                          isLoading={uploading}
                          variant="secondary"
                          className="shadow-md border-2 border-bg-primary rounded-full w-9 h-9 p-0 flex items-center justify-center bg-bg-card hover:bg-bg-hover"
                          icon={<Pencil size={16} />}
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
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                <h1 className="text-3xl font-bold text-text-primary">{user.name}</h1>
              </div>
              
              {/* Stats */}
              <div className="flex items-center justify-center md:justify-start flex-wrap gap-2 md:gap-4 mt-3 text-sm text-text-secondary">
                <div className="flex items-center gap-1.5 bg-bg-secondary/50 px-3 py-1.5 rounded-lg border border-border-light">
                  <FileText size={16} className="text-primary" />
                  <span><strong className="text-text-primary">{stats.postCount}</strong> bài viết</span>
                </div>
                {isOwnProfile && (
                  <div className="flex items-center gap-1.5 bg-bg-secondary/50 px-3 py-1.5 rounded-lg border border-border-light">
                    <Users size={16} className="text-primary" />
                    <span><strong className="text-text-primary">{stats.friendCount}</strong> bạn bè</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 md:mb-2">
              {isOwnProfile ? (
                <>
                  <Button 
                    variant="secondary" 
                    onClick={onEditClick} 
                    icon={<Edit size={18} />}
                    className="flex-1 md:flex-none border-border-medium text-text-primary hover:bg-bg-hover"
                  >
                    Chỉnh sửa
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/settings')}
                    icon={<Settings size={18} />}
                    className="md:hidden border-border-medium text-text-primary hover:bg-bg-hover"
                  >
                    Cài đặt
                  </Button>
                </>
              ) : user.status === UserStatus.BANNED ? (
                <Dropdown
                  trigger={
                    <Button
                      variant="secondary"
                      icon={<MoreHorizontal size={18} />}
                      className="border-border-medium text-text-primary hover:bg-bg-hover"
                    />
                  }
                  align="right"
                >
                  <DropdownItem
                    icon={<Flag size={16} />}
                    label="Báo cáo"
                    variant="danger"
                    onClick={() => openReportModal(ReportType.USER, user.id, user.id)}
                  />
                </Dropdown>
              ) : (
                <>
                  <Button 
                    onClick={onMessageClick} 
                    icon={<MessageCircle size={18} />}
                    className="bg-primary-600 hover:bg-primary-700 shadow-md"
                  >
                    Nhắn tin
                  </Button>
                  
                  {friendStatus === FriendStatus.FRIEND ? (
                    <Button 
                      variant="secondary" 
                      onClick={onFriendClick} 
                      icon={<UserCheck size={18} />}
                      className="border-primary-100 bg-primary-50 text-primary-600 hover:bg-primary-100"
                    >
                      Bạn bè
                    </Button>
                  ) : friendStatus === FriendStatus.PENDING_SENT ? (
                    <Button 
                      variant="secondary"
                      onClick={onFriendClick} 
                      icon={<UserPlus size={18} />}
                      className="border-border-medium text-text-tertiary bg-bg-secondary cursor-pointer hover:bg-bg-hover"
                    >
                      Đã gửi lời mời
                    </Button>
                  ) : friendStatus === FriendStatus.PENDING_RECEIVED ? (
                    <Button 
                      variant="primary"
                      onClick={onFriendClick} 
                      icon={<UserPlus size={18} />}
                      className="bg-primary-600 hover:bg-primary-700 shadow-md"
                    >
                      Chấp nhận
                    </Button>
                  ) : (
                    <Button 
                      variant="secondary"
                      onClick={onFriendClick} 
                      icon={<UserPlus size={18} />}
                      className="border-border-medium text-text-primary hover:bg-bg-hover"
                    >
                      Kết bạn
                    </Button>
                  )}

                  <Dropdown
                    trigger={
                      <Button
                        variant="secondary"
                        icon={<MoreHorizontal size={18} />}
                        className="border-border-medium text-text-primary hover:bg-bg-hover"
                      />
                    }
                    align="right"
                  >
                    {isBlockedByMe ? (
                      <DropdownItem
                        icon={<UserCheck size={16} />}
                        label="Bỏ chặn"
                        onClick={onUnblockClick || (() => {})}
                      />
                    ) : (
                      <DropdownItem
                        icon={<Ban size={16} />}
                        label="Chặn"
                        variant="danger"
                        onClick={onBlockClick || (() => {})}
                      />
                    )}
                    <DropdownItem
                      icon={<Flag size={16} />}
                      label="Báo cáo"
                      variant="danger"
                      onClick={() => openReportModal(ReportType.USER, user.id, user.id)}
                    />
                  </Dropdown>
                </> 
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Image Cropper Modal */}
      {cropState && (
        <ImageCropper
          isOpen={cropState.isOpen}
          image={cropState.image}
          aspect={cropState.type === 'avatar' ? 1 : 16 / 9}
          title={cropState.type === 'avatar' ? 'Cắt ảnh đại diện' : 'Cắt ảnh bìa'}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
};
