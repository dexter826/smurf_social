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
      className="md:max-h-[85vh]"
      footer={
        <div className="w-full">
          {/* Media Actions */}
          <div className="flex items-center justify-between mb-3 bg-bg-secondary p-2.5 md:p-3 rounded-xl border border-border-light">
            <span className="text-[13px] md:text-sm font-semibold text-text-secondary leading-none">Thêm vào bài viết</span>
            <div className="flex gap-0.5 md:gap-1">
              <IconButton
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group rounded-full w-9 h-9 md:w-10 md:h-10"
                title="Ảnh"
                disabled={isSubmitting || isUploading}
                icon={<ImageIcon className="text-green-500 group-hover:scale-110 transition-transform" size={20} />}
                size="md"
              />
              <IconButton
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="group rounded-full w-9 h-9 md:w-10 md:h-10"
                title="Video"
                disabled={isSubmitting || isUploading}
                icon={<Video className="text-blue-500 group-hover:scale-110 transition-transform" size={20} />}
                size="md"
              />
              <div className="flex items-center">
                <EmojiPicker
                  buttonClassName="hover:bg-bg-hover rounded-full group w-9 h-9 md:w-10 md:h-10 flex items-center justify-center"
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
                  size={20}
                  buttonSize="md"
                  iconClassName="text-yellow-500 group-hover:scale-110 transition-transform"
                />
              </div>
            </div>
            
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
            <input ref={videoInputRef} type="file" accept="video/*" multiple onChange={handleFileSelect} className="hidden" />
          </div>

          <Button
            variant="primary"
            className="w-full h-10 md:h-11 text-[15px] font-bold shadow-sm"
            onClick={handleSubmit}
            disabled={(!content.trim() && images.length === 0 && videos.length === 0) || !isChanged || isSubmitting || isUploading}
            isLoading={isSubmitting}
          >
            {isEdit ? 'Lưu thay đổi' : 'Đăng bài'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col h-full min-h-[150px] md:min-h-0">
        <div className="flex items-center gap-3 mb-4 flex-none">
          <UserAvatar userId={currentUser.id} src={currentUser.avatar} name={currentUser.name} size="md" initialStatus={currentUser.status} />
          <div>
            <h3 className="font-semibold text-text-primary mb-0.5 text-sm md:text-base">{currentUser.name}</h3>
            <Select
              value={visibility}
              onChange={(v) => setVisibility(v as any)}
              options={[
                { value: 'friends', label: 'Bạn bè', icon: <Users size={14} /> },
                { value: 'private', label: 'Chỉ mình tôi', icon: <Lock size={14} /> }
              ]}
              variant="ghost"
              size="sm"
              className="px-0 py-0 h-auto font-medium text-text-secondary hover:bg-transparent"
            />
          </div>
        </div>

        <div className="flex-1 min-h-[120px] md:min-h-0 relative group">
          <textarea
            ref={textareaRef}
            placeholder="Hãy viết gì đó..."
            className="w-full h-full resize-none outline-none text-base md:text-lg bg-transparent text-text-primary placeholder:text-text-tertiary"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        {(images.length > 0 || videos.length > 0) && (
          <div className="grid grid-cols-2 gap-2 mt-4 flex-none">
            {images.map((img, idx) => (
              <div key={`img-${idx}`} className="relative group rounded-xl overflow-hidden bg-bg-secondary aspect-square md:aspect-video border border-border-light">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {videos.map((video, idx) => (
              <div key={`vid-${idx}`} className="relative group rounded-xl overflow-hidden bg-bg-secondary aspect-square md:aspect-video border border-border-light">
                <video src={video} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                   <Video className="text-white/80" size={32} />
                </div>
                <button
                  onClick={() => handleRemoveVideo(idx)}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {isUploading && (
              <div className="flex items-center justify-center aspect-square md:aspect-video bg-bg-secondary rounded-xl border border-border-light">
                 <Loading size="md" />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
