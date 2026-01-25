import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '../ui';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  onSubmit: (content: string) => Promise<void>;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  isOpen,
  onClose,
  initialContent,
  onSubmit
}) => {
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!content.trim() || content === initialContent) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      onClose();
    } catch (error) {
      console.error('Lỗi cập nhật bài viết:', error);
      alert('Lỗi cập nhật bài viết. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Chỉnh sửa bài viết</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[200px] text-[15px] text-gray-900 placeholder-gray-400 resize-none outline-none border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!content.trim() || content === initialContent || isSubmitting}
            isLoading={isSubmitting}
          >
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  );
};
