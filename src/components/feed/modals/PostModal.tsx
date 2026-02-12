import React, { useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Video, Globe, Users, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserAvatar, Button, EmojiPicker, Select, Modal, IconButton, UploadProgress, ConfirmDialog } from '../../ui';
import { toast } from '../../../store/toastStore';
import { validateFileSize } from '../../../utils/fileUtils';
import { User, Post, Visibility } from '../../../types';
import { postSchema, PostFormValues } from '../../../utils/validation';
import { insertTextAtCursor } from '../../../utils/uiUtils';
import { useAutoResizeTextarea } from '../../../hooks/utils';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  initialPost?: Post;
  initialFiles?: File[];
  onSubmit: (content: string, images: string[], videos: string[], visibility: Visibility, videoThumbnails?: Record<string, string>, pendingFiles?: File[]) => Promise<void>;
  onUploadImages: (files: File[], onProgress?: (progress: number) => void) => Promise<{ images: string[], videos: string[], videoThumbnails?: Record<string, string> }>;
}

const EMPTY_FILES: File[] = [];

export const PostModal: React.FC<PostModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialPost,
  initialFiles = EMPTY_FILES,
  onSubmit,
  onUploadImages
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEdit = !!initialPost;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting, isValid, isDirty }
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      content: '',
      images: [],
      videos: [],
      videoThumbnails: {},
      hasPendingFiles: false,
      visibility: Visibility.PUBLIC
    }
  });

  const formData = watch();
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);
  const [showDiscardConfirm, setShowDiscardConfirm] = React.useState(false);

  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<{ url: string; type: 'image' | 'video' }[]>([]);

  const initializedRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      if (isEdit && initialPost) {
        reset({
          content: initialPost.content,
          images: initialPost.images || [],
          videos: initialPost.videos || [],
          videoThumbnails: initialPost.videoThumbnails || {},
          hasPendingFiles: false,
          visibility: initialPost.visibility
        });
      } else {
        reset({
          content: '',
          images: [],
          videos: [],
          videoThumbnails: {},
          hasPendingFiles: initialFiles.length > 0,
          visibility: Visibility.PUBLIC
        });
        if (initialFiles.length > 0) processFiles(initialFiles);
      }
      initializedRef.current = true;
    }

    if (!isOpen && initializedRef.current) {
      initializedRef.current = false;
      if (previews.length > 0) {
        previews.forEach(p => URL.revokeObjectURL(p.url));
        setPreviews([]);
      }
      if (pendingFiles.length > 0) {
        setPendingFiles([]);
      }
    }
  }, [isOpen, isEdit, initialPost?.id, initialPost?.updatedAt, initialFiles, reset]);

  useAutoResizeTextarea(textareaRef, formData.content || '', isOpen);

  const processFiles = (files: File[]) => {
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const newPreviews: { url: string; type: 'image' | 'video' }[] = [];

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        if (validateFileSize(file, 'IMAGE')) {
          validFiles.push(file);
          newPreviews.push({ url: URL.createObjectURL(file), type: 'image' });
        }
      } else if (file.type.startsWith('video/')) {
        if (validateFileSize(file, 'VIDEO')) {
          validFiles.push(file);
          newPreviews.push({ url: URL.createObjectURL(file), type: 'video' });
        }
      } else {
        toast.error(`Không hỗ trợ định dạng file của "${file.name}"`);
      }
    });

    if (validFiles.length === 0) return;

    // Chỉ lưu file vào state, không upload ngay
    const allFiles = [...pendingFiles, ...validFiles];
    setPendingFiles(allFiles);
    setPreviews(prev => [...prev, ...newPreviews]);
    setValue('hasPendingFiles', allFiles.length > 0, { shouldValidate: true });

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    processFiles(files);
  };

  const handleRemoveImage = (index: number) => {
    setValue('images', formData.images.filter((_, i) => i !== index), { shouldDirty: true });
  };

  const handleRemoveVideo = (index: number) => {
    setValue('videos', formData.videos.filter((_, i) => i !== index), { shouldDirty: true });
  };

  // Xóa pending file (chưa upload)
  const handleRemovePending = (index: number) => {
    if (previews[index]) {
      URL.revokeObjectURL(previews[index].url);
    }
    const newFiles = pendingFiles.filter((_, i) => i !== index);
    setPendingFiles(newFiles);
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setValue('hasPendingFiles', newFiles.length > 0, { shouldValidate: true });
  };

  const onFormSubmit = async (data: PostFormValues) => {
    try {
      // Đóng modal và gửi dữ liệu qua store
      onClose();

      await onSubmit(
        data.content || '',
        data.images,
        data.videos,
        data.visibility,
        data.videoThumbnails,
        pendingFiles
      );

      // Thu hồi bộ nhớ blob
      previews.forEach(p => URL.revokeObjectURL(p.url));
      setPendingFiles([]);
      setPreviews([]);
    } catch (error) {
      console.error('Lỗi khởi tạo bài viết:', error);
      toast.error(`Không thể bắt đầu tạo bài viết. Vui lòng thử lại.`);
    }
  };

  const handleCloseAttempt = () => {
    const hasContent = !!formData.content?.trim();
    const hasMedia = formData.images.length > 0 || formData.videos.length > 0 || pendingFiles.length > 0;

    if (hasContent || hasMedia) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleCloseAttempt}
        title={isEdit ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}
        maxWidth="2xl"
        padding="none"
        fullScreen="mobile"
        footer={
          <div className="w-full">
            {/* Media Actions */}
            <div className="flex items-center justify-between mb-3 bg-bg-secondary p-2.5 md:p-3 rounded-xl border border-border-light">
              <span className="text-[13px] md:text-sm font-semibold text-text-secondary leading-none">Thêm vào bài viết</span>
              <div className="flex gap-0.5 md:gap-1">
                <IconButton
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group rounded-full"
                  title="Ảnh"
                  disabled={isSubmitting || isUploading}
                  icon={<ImageIcon className="text-success transition-all duration-base" size={20} />}
                  size="md"
                />
                <IconButton
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="group rounded-full"
                  title="Video"
                  disabled={isSubmitting || isUploading}
                  icon={<Video className="text-info transition-all duration-base" size={20} />}
                  size="md"
                />
                <div className="flex items-center">
                  <EmojiPicker
                    buttonClassName="hover:bg-bg-hover rounded-full group w-9 h-9 md:w-10 md:h-10 flex items-center justify-center"
                    onEmojiSelect={(emoji) => {
                      insertTextAtCursor(textareaRef, formData.content || '', emoji, (newText) => {
                        setValue('content', newText, { shouldDirty: true });
                      });
                    }}
                    disabled={isSubmitting || isUploading}
                    size={20}
                    buttonSize="md"
                    iconClassName="text-warning transition-all duration-base"
                  />
                </div>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
              <input ref={videoInputRef} type="file" accept="video/*" multiple onChange={handleFileSelect} className="hidden" />
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full text-[15px] font-bold shadow-sm"
              onClick={handleSubmit(onFormSubmit)}
              disabled={isSubmitting || isUploading || !isValid}
              isLoading={isSubmitting}
            >
              {isEdit ? 'Lưu thay đổi' : 'Đăng bài'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col min-h-[150px]">
          <div className="sticky top-[-1px] z-10 bg-bg-primary px-4 md:px-6 py-3 border-b border-divider flex items-center justify-between flex-none">
            <div className="flex items-center gap-3">
              <UserAvatar userId={currentUser.id} src={currentUser.avatar} name={currentUser.name} size="md" initialStatus={currentUser.status} />
              <h3 className="font-semibold text-text-primary text-sm md:text-base">{currentUser.name}</h3>
            </div>
            <Select
              value={formData.visibility}
              onChange={(v) => setValue('visibility', v as Visibility, { shouldDirty: true })}
              options={[
                { value: Visibility.PUBLIC, label: 'Công khai', icon: <Globe size={14} /> },
                { value: Visibility.FRIENDS, label: 'Bạn bè', icon: <Users size={14} /> },
                { value: Visibility.PRIVATE, label: 'Chỉ mình tôi', icon: <Lock size={14} /> }
              ]}
              size="sm"
              className="flex-none min-w-[150px]"
            />
          </div>

          <div className="flex-1 px-4 md:px-6 pt-3 md:pt-4 pb-6">
            <div className="relative group">
              <textarea
                {...register('content')}
                ref={(e) => {
                  register('content').ref(e);
                  (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                }}
                placeholder="Hãy viết gì đó..."
                className={`w-full resize-none outline-none bg-transparent text-text-primary placeholder:text-text-tertiary overflow-hidden transition-all duration-200 ${(formData.content?.length || 0) < 85 && formData.images.length === 0 && formData.videos.length === 0 && previews.length === 0
                  ? 'text-xl md:text-2xl font-medium min-h-[120px]'
                  : 'text-base md:text-lg min-h-[100px]'
                  }`}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {(formData.images.length > 0 || formData.videos.length > 0 || previews.length > 0) && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                {/* Media đã upload */}
                {formData.images.map((img, idx) => (
                  <div key={`img-${idx}`} className="relative group rounded-xl overflow-hidden bg-bg-secondary aspect-square md:aspect-video border border-border-light">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-base hover:bg-black/70 active:bg-black/90"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {formData.videos.map((video, idx) => (
                  <div key={`vid-${idx}`} className="relative group rounded-xl overflow-hidden bg-bg-secondary aspect-square md:aspect-video border border-border-light">
                    <video src={video} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Video className="text-white/80" size={32} />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVideo(idx)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-base hover:bg-black/70 active:bg-black/90"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {/* Pending files (chưa upload) */}
                {previews.map((preview, idx) => (
                  <div key={`pending-${idx}`} className="relative group rounded-xl overflow-hidden bg-bg-secondary aspect-square md:aspect-video border border-border-light border-dashed">
                    {preview.type === 'image' ? (
                      <img src={preview.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <video src={preview.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Video className="text-white/80" size={32} />
                        </div>
                      </>
                    )}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[10px] text-white/80">
                      Chưa tải lên
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePending(idx)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-base hover:bg-black/70 active:bg-black/90"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {isUploading && (
                  <div className="flex flex-col items-center justify-center aspect-square md:aspect-video bg-bg-secondary rounded-xl border border-border-light p-4">
                    <UploadProgress
                      progress={uploadProgress}
                      fileName="Đang tải lên media..."
                      showDetails
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
        title="Hủy bỏ bài viết?"
        message="Nội dung bạn đang soạn sẽ bị mất. Bạn có chắc chắn muốn thoát?"
        confirmLabel="Hủy bỏ"
        cancelLabel="Tiếp tục soạn"
        variant="primary"
      />
    </>
  );
};
