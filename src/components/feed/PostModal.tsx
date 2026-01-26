import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Video, Loader2, Users, Lock } from 'lucide-react';
import { Avatar, Button, EmojiPicker } from '../ui';
import { User, Post } from '../../types';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  initialPost?: Post; // Nếu có thì là chế độ Edit
  initialFiles?: File[]; // Dùng cho Create khi kéo thả hoặc chọn nhanh
  onSubmit: (content: string, images: string[], videos: string[], visibility: 'friends' | 'private') => Promise<void>;
  onUploadImages: (files: File[]) => Promise<{ images: string[], videos: string[] }>;
}

export const PostModal: React.FC<PostModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialPost,
  initialFiles = [],
  onSubmit,
  onUploadImages
}) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'friends' | 'private'>('friends');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEdit = !!initialPost;

  // Khởi tạo dữ liệu khi mở Modal
  useEffect(() => {
    if (isOpen) {
      if (isEdit && initialPost) {
        setContent(initialPost.content);
        setImages(initialPost.images || []);
        setVideos(initialPost.videos || []);
        setVisibility(initialPost.visibility);
      } else {
        setContent('');
        setImages([]);
        setVideos([]);
        setVisibility('friends');
        // Xử lý files ban đầu nếu có (chỉ cho Create)
        if (initialFiles?.length > 0) {
          processFiles(initialFiles);
        }
      }
    }
  }, [isOpen, isEdit, initialPost, initialFiles]);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      await onSubmit(content.trim(), images, videos, visibility);
      onClose();
    } catch (error) {
      console.error('Lỗi xử lý bài viết:', error);
      alert(`Lỗi ${isEdit ? 'cập nhật' : 'tạo'} bài viết. Vui lòng thử lại.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isChanged = !isEdit || 
    content !== initialPost?.content || 
    JSON.stringify(images) !== JSON.stringify(initialPost?.images || []) ||
    JSON.stringify(videos) !== JSON.stringify(initialPost?.videos || []) ||
    visibility !== initialPost?.visibility;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl transition-theme">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-light">
          <h2 className="text-xl font-semibold text-text-primary">
            {isEdit ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-hover rounded-full transition-colors"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar src={currentUser.avatar} name={currentUser.name} size="md" />
            <div>
              <h3 className="font-semibold text-text-primary">{currentUser.name}</h3>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="text-xs text-text-secondary bg-bg-secondary px-2 py-0.5 rounded border-none outline-none cursor-pointer"
                disabled={isSubmitting}
              >
                <option value="friends">Bạn bè</option>
                <option value="private">Chỉ mình tôi</option>
              </select>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isEdit ? "Bạn đang nghĩ gì thế?" : `${currentUser.name} ơi, bạn đang nghĩ gì thế?`}
            className="w-full min-h-[150px] text-[16px] text-text-primary placeholder-text-tertiary bg-transparent resize-none outline-none py-2"
            disabled={isSubmitting}
            autoFocus
          />

          {(images.length > 0 || videos.length > 0) && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {images.map((url, index) => (
                <div key={`img-${index}`} className="relative group">
                  <img src={url} alt="Upload" className="w-full h-40 object-cover rounded-lg" />
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
                  <video src={url} className="w-full h-40 object-cover rounded-lg" controls />
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
            <div className="mt-4 flex items-center justify-center py-8 text-text-secondary">
              <Loader2 className="animate-spin mr-2" size={20} />
              Đang tải phương tiện...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-light">
          <div className="flex items-center justify-between mb-3 bg-bg-secondary p-3 rounded-lg border border-border-light">
            <span className="text-sm font-semibold text-text-secondary">Thêm vào bài viết</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-bg-hover rounded-full transition-colors group"
                title="Ảnh"
                disabled={isSubmitting || isUploading}
              >
                <ImageIcon className="text-[#22c55e] group-hover:scale-110 transition-transform" size={24} />
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="p-2 hover:bg-bg-hover rounded-full transition-colors group"
                title="Video"
                disabled={isSubmitting || isUploading}
              >
                <Video className="text-info group-hover:scale-110 transition-transform" size={24} />
              </button>
              <div className="flex items-center">
                <EmojiPicker
                  buttonClassName="hover:bg-bg-hover rounded-full group"
                  onEmojiSelect={(emoji) => {
                    const start = textareaRef.current?.selectionStart || 0;
                    const end = textareaRef.current?.selectionEnd || 0;
                    const newText = content.substring(0, start) + emoji + content.substring(end);
                    setContent(newText);
                    setTimeout(() => {
                      textareaRef.current?.focus();
                      textareaRef.current?.setSelectionRange(start + emoji.length, start + emoji.length);
                    }, 0);
                  }}
                  disabled={isSubmitting || isUploading}
                />
              </div>
            </div>
            
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
            <input ref={videoInputRef} type="file" accept="video/*" multiple onChange={handleFileSelect} className="hidden" />
          </div>

          <Button
            variant="primary"
            className="w-full"
            onClick={handleSubmit}
            disabled={(!content.trim() && images.length === 0) || !isChanged || isSubmitting || isUploading}
            isLoading={isSubmitting}
          >
            {isEdit ? 'Lưu thay đổi' : 'Đăng bài'}
          </Button>
        </div>
      </div>
    </div>
  );
};
