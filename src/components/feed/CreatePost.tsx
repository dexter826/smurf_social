import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Video, Camera } from 'lucide-react';
import { PostModal } from './PostModal';
import { User } from '../../types';
import { Avatar, Button } from '../ui';
import { usePostStore } from '../../store/postStore';
import { postService } from '../../services/postService';

interface CreatePostProps {
  currentUser: User;
}

export const CreatePost: React.FC<CreatePostProps> = ({ currentUser }) => {
  const { createPost } = usePostStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraPhotoRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLInputElement>(null);

  const onMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPendingFiles(files);
      setShowCreateModal(true);
    }
    e.target.value = '';
  };

  const handleCreatePost = async (
    content: string,
    images: string[],
    videos: string[],
    visibility: 'friends' | 'private'
  ) => {
    await createPost(currentUser.id, content, images, videos, visibility);
    setPendingFiles([]);
  };

  const handleUploadImages = async (files: File[]) => {
    return await postService.uploadPostMedia(files, currentUser.id);
  };

  return (
    <>
      <div className="bg-bg-primary rounded-xl p-4 shadow-sm border border-border-light transition-theme mb-4">
        <div className="flex gap-3 mb-4">
          <Avatar src={currentUser.avatar} name={currentUser.name} size="md" />
          <Button
            variant="secondary"
            onClick={() => setShowCreateModal(true)}
            className="flex-1 justify-start text-text-secondary font-medium border-none rounded-full"
          >
            <span>{currentUser.name} ơi, bạn đang nghĩ gì thế?</span>
          </Button>
        </div>
        
        <div className="flex gap-2 pt-2 border-t border-divider">
          <Button
            variant="ghost"
            onClick={() => imageInputRef.current?.click()}
            className="flex-1 text-[15px] font-semibold text-text-secondary group"
            icon={<ImageIcon className="text-green-500 group-hover:scale-110 transition-transform" size={20} />}
          >
            Ảnh
          </Button>
          <Button
            variant="ghost"
            onClick={() => cameraPhotoRef.current?.click()}
            className="flex-1 text-[15px] font-semibold text-text-secondary group"
            icon={<Camera className="text-red-500 group-hover:scale-110 transition-transform" size={20} />}
          >
            Máy ảnh
          </Button>
          <Button
            variant="ghost"
            onClick={() => videoInputRef.current?.click()}
            className="flex-1 text-[15px] font-semibold text-text-secondary group"
            icon={<Video className="text-blue-500 group-hover:scale-110 transition-transform" size={20} />}
          >
            Video
          </Button>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onMediaSelect}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={onMediaSelect}
        />
        <input
          ref={cameraPhotoRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onMediaSelect}
        />
        <input
          ref={cameraVideoRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={onMediaSelect}
        />
      </div>

      <PostModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setPendingFiles([]);
        }}
        currentUser={currentUser}
        initialFiles={pendingFiles}
        onSubmit={handleCreatePost}
        onUploadImages={handleUploadImages}
      />
    </>
  );
};
