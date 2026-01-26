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
        <img 
          src={user.coverImage || '/cover-image.jpg'} 
          className="w-full h-full object-cover" 
          alt="Cover"
        />
        
        {isOwnProfile && (
          <button 
            onClick={handleCoverClick}
            disabled={uploading}
            className="absolute bottom-4 right-4 bg-black/30 backdrop-blur-md text-white px-4 py-2 rounded-xl hover:bg-black/50 transition-all flex items-center gap-2 text-sm font-medium border border-white/20 disabled:opacity-50"
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
        <div className="relative -mt-12 md:-mt-16 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            
            {/* Avatar */}
            <div className="relative group">
              <div className="relative">
                <div className="p-1 bg-bg-primary rounded-full transition-theme">
                  <Avatar src={user.avatar} size="2xl" className="border-4 border-bg-primary" />
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
            <div className="flex-1 md:mb-2">
              <h1 className="text-3xl font-bold text-text-main">{user.name}</h1>

              
              {/* Stats */}
              <div className="flex items-center gap-6 mt-3 text-sm text-text-secondary">
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
