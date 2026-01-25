import React, { useRef } from 'react';
import { Camera, Users, FileText } from 'lucide-react';
import { User } from '../../types';
import { Avatar, Button } from '../ui';

interface ProfileHeaderProps {
  user: User;
  stats: { friendCount: number; postCount: number };
  isOwnProfile: boolean;
  onEditClick?: () => void;
  onAvatarChange?: (file: File) => void;
  onCoverChange?: (file: File) => void;
  uploading?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  stats,
  isOwnProfile,
  onEditClick,
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
    <>
      {/* Cover */}
      <div className="relative h-[200px] md:h-[320px] w-full bg-gradient-to-br from-primary-400 to-primary-600">
        {user.coverImage ? (
          <img 
            src={user.coverImage} 
            className="w-full h-full object-cover" 
            alt="Cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 text-6xl">
            <Camera size={80} />
          </div>
        )}
        
        {isOwnProfile && (
          <button 
            onClick={handleCoverClick}
            disabled={uploading}
            className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
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
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative -mt-16 md:-mt-20 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            
            {/* Avatar */}
            <div className="relative group">
              <div className="relative">
                <div className="p-1 bg-white dark:bg-gray-900 rounded-full">
                  <Avatar src={user.avatar} size="2xl" className="border-4 border-white dark:border-gray-900" />
                </div>
                
                {isOwnProfile && (
                  <button
                    onClick={handleAvatarClick}
                    disabled={uploading}
                    className="absolute bottom-2 right-2 bg-gray-200 dark:bg-gray-700 p-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    <Camera size={18} />
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
            <div className="flex-1 md:mb-2">
              <h1 className="text-3xl font-bold text-text-main">{user.name}</h1>
              {user.bio && (
                <p className="text-text-secondary mt-1">{user.bio}</p>
              )}
              
              {/* Stats */}
              <div className="flex items-center gap-6 mt-3 text-sm text-text-secondary">
                <div className="flex items-center gap-1.5">
                  <Users size={16} />
                  <span><strong className="text-text-main">{stats.friendCount}</strong> bạn bè</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText size={16} />
                  <span><strong className="text-text-main">{stats.postCount}</strong> bài viết</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {isOwnProfile && (
              <div className="md:mb-2">
                <Button variant="secondary" onClick={onEditClick}>
                  Chỉnh sửa trang cá nhân
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
