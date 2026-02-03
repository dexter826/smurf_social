import React, { useRef, useEffect } from 'react';
import { Image as ImageIcon, X, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserAvatar, IconButton, Button, EmojiPicker, Loading } from '../ui';
import { validateFileSize } from '../../utils/fileUtils';
import { toast } from '../../store/toastStore';
import { commentSchema, CommentFormValues } from '../../utils/validation';

interface CommentInputProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  placeholder?: string;
  initialValue?: string;
  initialImage?: string;
  onSubmit: (content: string, image?: string) => Promise<void>;
  onCancel?: () => void;
  onUploadMedia: (file: File) => Promise<string>;
  autoFocus?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  user,
  placeholder = 'Viết bình luận...',
  initialValue = '',
  initialImage,
  onSubmit,
  onCancel,
  onUploadMedia,
  autoFocus = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting, isDirty }
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: initialValue,
      image: initialImage
    }
  });

  const formData = watch();
  const [isUploading, setIsUploading] = React.useState(false);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [formData.content]);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFileSize(file, 'IMAGE')) {
      return;
    }

    setIsUploading(true);
    try {
      const url = await onUploadMedia(file);
      setValue('image', url, { shouldDirty: true });
    } catch (error) {
      toast.error('Lỗi tải media lên');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleFormSubmit = async (data: CommentFormValues) => {
    const submittedData = { ...data };
    reset();
    try {
      await onSubmit(submittedData.content || '', submittedData.image);
    } catch (error) {
      console.error('Lỗi gửi bình luận:', error);
    }
  };

  const handleRemoveMedia = () => {
    setValue('image', undefined, { shouldDirty: true });
  };

  return (
    <div className="flex gap-3">
      <UserAvatar userId={user.id} src={user.avatar} name={user.name} size="xs" />
      <div className="flex-1 min-w-0">
        <form 
          onSubmit={handleSubmit(handleFormSubmit)}
          className="bg-bg-secondary rounded-2xl transition-colors p-2"
        >
          <textarea
            {...register('content')}
            ref={(e) => {
              register('content').ref(e);
              (textareaRef as any).current = e;
            }}
            placeholder={placeholder}
            rows={1}
            className="w-full bg-transparent border-none outline-none focus:ring-0 focus:outline-none text-sm resize-none py-1 placeholder:text-text-tertiary max-h-32 custom-scrollbar"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(handleFormSubmit)();
              }
              if (e.key === 'Escape' && onCancel) {
                onCancel();
              }
            }}
          />

          {(formData.image || isUploading) && (
            <div className="mt-2 relative inline-block">
              {isUploading ? (
                <div className="w-20 h-20 flex items-center justify-center bg-bg-third rounded-lg">
                  <Loading size="sm" />
                </div>
              ) : formData.image ? (
                <div className="relative group">
                  <img src={formData.image} alt="Preview" className="h-20 w-auto rounded-lg object-cover" />
                  <IconButton
                    type="button"
                    onClick={handleRemoveMedia}
                    className="absolute -top-2 -right-2 bg-text-primary text-bg-primary shadow-md hover:scale-110"
                    size="sm"
                    icon={<X size={12} />}
                  />
                </div>
              ) : null}
            </div>
          )}

          <div className="flex items-center justify-between mt-1 pt-1">
            <div className="flex items-center gap-1">
              <IconButton
                type="button"
                className="text-text-tertiary hover:text-green-500"
                onClick={() => fileInputRef.current?.click()}
                icon={<ImageIcon size={16} />}
                size="sm"
                title="Thêm ảnh"
                disabled={isSubmitting || isUploading}
              />
              <EmojiPicker
                onEmojiSelect={(emoji) => {
                  const start = textareaRef.current?.selectionStart || 0;
                  const end = textareaRef.current?.selectionEnd || 0;
                  const currentContent = formData.content || '';
                  const newText = currentContent.substring(0, start) + emoji + currentContent.substring(end);
                  setValue('content', newText, { shouldDirty: true });
                  setTimeout(() => {
                    textareaRef.current?.focus();
                    textareaRef.current?.setSelectionRange(start + emoji.length, start + emoji.length);
                  }, 0);
                }}
                size={16}
                disabled={isSubmitting || isUploading}
              />
            </div>
            <div className="flex items-center gap-1">
              {onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="!h-auto !py-1.5 !px-2.5 text-xs font-semibold"
                >
                  Hủy
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                disabled={!isDirty || isSubmitting || isUploading}
                isLoading={isSubmitting}
                className="w-9 h-9 rounded-full shadow-sm active:scale-90 p-0 flex-shrink-0"
                icon={<Send size={16} className="fill-current" />}
              />
            </div>
          </div>
        </form>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaUpload(e)} />
      </div>
    </div>
  );
};
