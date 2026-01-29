import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Video, Users, Lock } from 'lucide-react';
import { Avatar, UserAvatar, Button, EmojiPicker, Loading, Select, Modal, IconButton } from '../ui';
import { toast } from '../../store/toastStore';
import { validateFileSize } from '../../utils/fileUtils';
import { User, Post } from '../../types';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  initialPost?: Post; 
  initialFiles?: File[]; 
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

  // Khởi tạo dữ liệu
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
        // Xử lý file ban đầu
        if (initialFiles?.length > 0) {
          processFiles(initialFiles);
        }
      }
    }
  }, [isOpen, isEdit, initialPost, initialFiles]);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const validFiles: File[] = [];
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        if (validateFileSize(file, 'IMAGE')) validFiles.push(file);
      } else if (file.type.startsWith('video/')) {
        if (validateFileSize(file, 'VIDEO')) validFiles.push(file);
      } else {
        toast.error(`Không hỗ trợ định dạng file của "${file.name}"`);
      }
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const result = await onUploadImages(validFiles);
      setImages(prev => [...prev, ...result.images]);
      setVideos(prev => [...prev, ...result.videos]);
    } catch (error) {
      console.error('Lỗi upload media:', error);
      toast.error('Lỗi upload media. Vui lòng thử lại.');
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
      toast.error(`Lỗi ${isEdit ? 'cập nhật' : 'tạo'} bài viết. Vui lòng thử lại.`);
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}
      maxWidth="2xl"
      footer={
        <div className="w-full">
          <div className="flex items-center justify-between mb-3 bg-bg-secondary p-3 rounded-xl border border-border-light">
            <span className="text-sm font-semibold text-text-secondary">Thêm vào bài viết</span>
            <div className="flex gap-1">
              <IconButton
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group rounded-full"
                title="Ảnh"
                disabled={isSubmitting || isUploading}
                icon={<ImageIcon className="text-green-500 group-hover:scale-110 transition-transform" size={24} />}
                size="lg"
              />
              <IconButton
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="group rounded-full"
                title="Video"
                disabled={isSubmitting || isUploading}
                icon={<Video className="text-blue-500 group-hover:scale-110 transition-transform" size={24} />}
                size="lg"
              />
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
                  size={24}
                  buttonSize="lg"
                  iconClassName="text-yellow-500 group-hover:scale-110 transition-transform"
                />
              </div>
            </div>
            
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
            <input ref={videoInputRef} type="file" accept="video/*" multiple onChange={handleFileSelect} className="hidden" />
          </div>

          <Button
            variant="primary"
            className="w-full h-10 text-[15px] font-bold"
            onClick={handleSubmit}
            disabled={(!content.trim() && images.length === 0) || !isChanged || isSubmitting || isUploading}
            isLoading={isSubmitting}
          >
            {isEdit ? 'Lưu thay đổi' : 'Đăng bài'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <UserAvatar userId={currentUser.id} src={currentUser.avatar} name={currentUser.name} size="md" initialStatus={currentUser.status} />
          <div>
            <h3 className="font-semibold text-text-primary mb-0.5">{currentUser.name}</h3>
            <Select
              value={visibility}
              onChange={(val) => setVisibility(val as any)}
              options={[
                { value: 'friends', label: 'Bạn bè' },
                { value: 'private', label: 'Chỉ mình tôi' }
              ]}
              className="w-28 h-8 text-xs"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isEdit ? "Bạn đang nghĩ gì thế?" : `${currentUser.name} ơi, bạn đang nghĩ gì thế?`}
          className={`w-full min-h-[300px] p-4 text-text-primary placeholder-text-tertiary bg-bg-primary rounded-xl resize-none outline-none transition-all ${
            content.length < 100 ? 'text-2xl font-medium' : 
            content.length < 200 ? 'text-xl' : 
            'text-[15px]'
          }`}
          disabled={isSubmitting}
          autoFocus
        />

        {(images.length > 0 || videos.length > 0) && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {images.map((url, index) => (
              <div key={`img-${index}`} className="relative group">
                <img src={url} alt="Upload" className="w-full h-40 object-cover rounded-xl" />
                <IconButton
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-2 right-2 bg-black/50 text-white shadow-lg opacity-0 group-hover:opacity-100 rounded-full"
                  disabled={isSubmitting}
                  icon={<X size={16} />}
                  size="sm"
                />
              </div>
            ))}
            {videos.map((url, index) => (
              <div key={`vid-${index}`} className="relative group">
                <video src={url} className="w-full h-40 object-cover rounded-xl" controls />
                <IconButton
                  onClick={() => handleRemoveVideo(index)}
                  className="absolute top-2 right-2 bg-black/50 text-white shadow-lg opacity-0 group-hover:opacity-100 rounded-full"
                  disabled={isSubmitting}
                  icon={<X size={16} />}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}

        {isUploading && (
          <Loading 
            variant="inline" 
            size="sm" 
            text="Đang tải phương tiện..." 
            className="py-4"
          />
        )}
      </div>
    </Modal>
  );
};
