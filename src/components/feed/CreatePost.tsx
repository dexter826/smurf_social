import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Video } from 'lucide-react';
import { PostModal } from './PostModal';
import { User } from '../../types';
import { Avatar } from '../ui';
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
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 bg-bg-secondary hover:bg-bg-hover rounded-full px-4 py-2.5 flex items-center text-text-secondary cursor-pointer transition-colors text-left font-medium border-none outline-none"
          >
            {currentUser.name} ơi, bạn đang nghĩ gì thế?
          </button>
        </div>
        
        <div className="flex gap-2 pt-2 border-t border-divider">
          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-bg-hover rounded-lg text-[15px] font-semibold text-text-secondary transition-colors group"
          >
            <ImageIcon className="text-green-500 group-hover:scale-110 transition-transform" size={20} />
            Ảnh/Video
          </button>
          <button
            onClick={() => videoInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-bg-hover rounded-lg text-[15px] font-semibold text-text-secondary transition-colors group"
          >
            <Video className="text-blue-500 group-hover:scale-110 transition-transform" size={20} />
            Video
          </button>
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
