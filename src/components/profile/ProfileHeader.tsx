import React, { useRef } from 'react';
import { Camera, Users, FileText, MessageCircle, UserPlus, UserCheck, Edit } from 'lucide-react';
import { User, UserStatus } from '../../types';
import { Avatar, UserAvatar, Button } from '../ui';

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
  uploading = false
}) => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (isOwnProfile && !uploading) {
      avatarInputRef.current?.click();
    }
  };

  const handleCoverClick = () => {
    if (isOwnProfile && !uploading) {
      coverInputRef.current?.click();
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarChange) {
      onAvatarChange(file);
    }
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onCoverChange) {
      onCoverChange(file);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Cover */}
      <div className="relative h-[200px] md:h-[320px] w-full bg-gradient-to-br from-primary-400 to-primary-600 md:rounded-b-2xl overflow-hidden shadow-sm">
        <img 
          src={user.coverImage || '/cover-image.jpg'} 
          className="w-full h-full object-cover" 
          alt="Cover"
        />
        
        {isOwnProfile && (
          <button 
            onClick={handleCoverClick}
            disabled={uploading}
            className="absolute bottom-4 right-4 bg-black/30 backdrop-blur-md text-white px-4 py-2 rounded-xl hover:bg-black/50 transition-all flex items-center gap-2 text-sm font-medium border border-white/20 disabled:opacity-50 z-10"
          >
            <Camera size={18} />
            <span>Chỉnh sửa ảnh bìa</span>
          </button>
        )}
        
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverFileChange}
          className="hidden"
        />
      </div>

      {/* Profile Info */}
      <div className="px-4">
        <div className="relative -mt-12 md:-mt-16 pb-0 transition-theme">
          <div className="flex flex-col md:flex-row md:items-end gap-6 pb-6">
            
            {/* Avatar */}
            <div className="relative group">
              <div className="relative">
                <div className="p-1 bg-bg-primary rounded-full transition-theme">
                  <UserAvatar userId={user.id} src={user.avatar} size="2xl" className="border-4 border-bg-primary shadow-lg" initialStatus={user.status} />
                </div>
                
                {isOwnProfile && (
                  <button
                    onClick={handleAvatarClick}
                    disabled={uploading}
                    className="absolute bottom-2 right-2 bg-bg-secondary p-2 rounded-full text-text-primary hover:bg-bg-hover transition-all disabled:opacity-50 shadow-md border-2 border-bg-primary flex items-center justify-center z-10"
                  >
                    <Camera size={20} />
                  </button>
                )}
              </div>
              
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
            </div>

            {/* Info */}
            <div className="flex-1 md:mb-1 mt-2 md:mt-0">
              <h1 className="text-3xl font-bold text-text-primary pt-2 md:pt-0">{user.name}</h1>
              
              {/* Stats */}
              <div className="flex items-center gap-6 mt-2 text-sm text-text-secondary">
                <div className="flex items-center gap-1.5 bg-bg-secondary px-3 py-1 rounded-full border border-divider">
                  <FileText size={14} className="text-primary-500" />
                  <span><strong className="text-text-primary">{stats.postCount}</strong> bài viết</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 md:mb-2">
              {isOwnProfile ? (
                <Button variant="secondary" onClick={onEditClick} className="rounded-xl px-4 h-11 border-border-medium text-text-primary hover:bg-bg-hover flex items-center gap-2">
                  <Edit size={18} />
                  <span>Chỉnh sửa thông tin</span>
                </Button>
              ) : (
                <>
                  {isFriend ? (
                    <>
                      <Button onClick={onMessageClick} className="rounded-xl px-6 h-11 flex items-center gap-2 bg-primary-600 hover:bg-primary-700 shadow-md">
                        <MessageCircle size={18} />
                        Nhắn tin
                      </Button>
                      <Button variant="secondary" onClick={onFriendClick} className="rounded-xl px-4 h-11 border-primary-100 bg-primary-50 text-primary-600 hover:bg-primary-100">
                        <UserCheck size={18} />
                        Bạn bè
                      </Button>
                    </>
                  ) : (
                    <Button onClick={onFriendClick} className="rounded-xl px-8 h-11 flex items-center gap-2 bg-primary-600 hover:bg-primary-700 shadow-md">
                      <UserPlus size={18} />
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
