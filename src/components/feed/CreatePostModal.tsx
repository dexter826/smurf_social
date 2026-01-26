import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Video, Globe, Users, Lock, Loader2 } from 'lucide-react';
import { Avatar, Button } from '../ui';
import { User } from '../../types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSubmit: (content: string, images: string[], videos: string[], visibility: 'friends' | 'private') => Promise<void>;
  onUploadImages: (files: File[]) => Promise<{ images: string[], videos: string[] }>;
  initialFiles?: File[];
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSubmit,
  onUploadImages,
  initialFiles = []
}) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'friends' | 'private'>('friends');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialFiles.length > 0) {
      processFiles(initialFiles);
    }
  }, [initialFiles]);

  if (!isOpen) return null;

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Validation
    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`File ${file.name} quá lớn. Giới hạn: ${isVideo ? '50MB cho video' : '5MB cho ảnh'}.`);
        return;
      }
    }

    setIsUploading(true);
    try {
      const result = await onUploadImages(files);
      setImages(prev => [...prev, ...result.images]);
      setVideos(prev => [...prev, ...result.videos]);
    } catch (error) {
      console.error('Lỗi upload media:', error);
      alert('Lỗi upload media. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    processFiles(files);
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0 && videos.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content, images, videos, visibility);
      setContent('');
      setImages([]);
      setVideos([]);
      onClose();
    } catch (error) {
      console.error('Lỗi tạo bài viết:', error);
      alert('Lỗi tạo bài viết. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibilityOptions = [
    { value: 'friends' as const, label: 'Bạn bè', icon: Users },
    { value: 'private' as const, label: 'Chỉ mình tôi', icon: Lock }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Tạo bài viết</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar src={currentUser.avatar} name={currentUser.name} size="md" />
            <div>
              <h3 className="font-semibold text-gray-900">{currentUser.name}</h3>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded border-none outline-none cursor-pointer"
                disabled={isSubmitting}
              >
                {visibilityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`${currentUser.name} ơi, bạn đang nghĩ gì thế?`}
            className="w-full min-h-[120px] text-[15px] text-gray-900 placeholder-gray-400 resize-none outline-none"
            disabled={isSubmitting}
            autoFocus
          />

          {(images.length > 0 || videos.length > 0) && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {images.map((url, index) => (
                <div key={`img-${index}`} className="relative group">
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isSubmitting}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {videos.map((url, index) => (
                <div key={`vid-${index}`} className="relative group">
                  <video
                    src={url}
                    className="w-full h-40 object-cover rounded-lg"
                    controls
                  />
                  <button
                    onClick={() => handleRemoveVideo(index)}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isSubmitting}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {isUploading && (
            <div className="mt-4 flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="animate-spin mr-2" size={20} />
              Đang tải phương tiện...
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span className="text-sm font-semibold text-gray-700">Thêm vào bài viết</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors group"
                title="Ảnh"
                disabled={isSubmitting || isUploading}
              >
                <ImageIcon className="text-green-500 group-hover:scale-110 transition-transform" size={24} />
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors group"
                title="Video"
                disabled={isSubmitting || isUploading}
              >
                <Video className="text-blue-500 group-hover:scale-110 transition-transform" size={24} />
              </button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          <Button
            variant="primary"
            className="w-full"
            onClick={handleSubmit}
            disabled={(!content.trim() && images.length === 0) || isSubmitting || isUploading}
            isLoading={isSubmitting}
          >
            Đăng bài
          </Button>
        </div>
      </div>
    </div>
  );
};
