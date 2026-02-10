import React, { useEffect, useState, useRef } from 'react';
import { Flag, AlertTriangle, Image as ImageIcon, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from './Modal';
import { Button } from './Button';
import { TextArea } from './TextArea';
import { Checkbox } from './Checkbox';
import { ReportReason, ReportType } from '../../types';
import { useReportStore } from '../../store/reportStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { REPORT_CONFIG, IMAGE_COMPRESSION } from '../../constants';
import { reportSchema, ReportFormValues } from '../../utils/validation';
import { compressImage } from '../../utils/imageUtils';
import { uploadWithProgress } from '../../utils/uploadUtils';

export const ReportModal: React.FC = () => {
  const { user } = useAuthStore();
  const { isOpen, data: reportContext, isSubmitting: isStoreSubmitting, closeReportModal, submitReport, error } = useReportStore();
  const { addToast } = useToastStore();
  
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [shouldBlock, setShouldBlock] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSubmitting = isStoreSubmitting || isUploading;
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reason: '',
      description: '',
      images: []
    }
  });

  const formData = watch();

  useEffect(() => {
    if (isOpen) {
      reset({
        reason: '',
        description: '',
        images: []
      });
      setSelectedImages([]);
      setPreviewUrls([]);
      setShouldBlock(reportContext?.type === ReportType.USER);
    }
  }, [isOpen, reset, reportContext?.type]);

  // Clean up preview URLs
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const totalImages = selectedImages.length + files.length;
      
      if (totalImages > REPORT_CONFIG.MAX_IMAGES_PER_REPORT) {
        addToast(`Chỉ được tải lên tối đa ${REPORT_CONFIG.MAX_IMAGES_PER_REPORT} ảnh`, 'error');
        return;
      }

      const newImages = [...selectedImages, ...files];
      setSelectedImages(newImages);
      
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]);
      return newPreviews.filter((_, i) => i !== index);
    });
  };

  const onFormSubmit = async (data: ReportFormValues) => {
    if (!user || !reportContext) return;

    try {
      setIsUploading(true);
      let imageUrls: string[] = [];

      // Upload images if any
      if (selectedImages.length > 0) {
        const uploadPromises = selectedImages.map(async (file) => {
          const compressed = await compressImage(file, IMAGE_COMPRESSION.REPORT);
          const path = `reports/${user.id}/${Date.now()}_${file.name}`;
          return await uploadWithProgress(path, compressed);
        });
        imageUrls = await Promise.all(uploadPromises);
      }

      const success = await submitReport(
        user.id, 
        data.reason as ReportReason, 
        data.description || undefined,
        imageUrls,
        shouldBlock
      );
      
      if (success) {
        addToast('Đã gửi báo cáo thành công. Chúng tôi sẽ xem xét trong thời gian sớm nhất.', 'success');
        handleClose();
      } else {
        const error = useReportStore.getState().error;
        if (error) addToast(error, 'error');
      }
    } catch (error: unknown) {
      console.error("Lỗi gửi báo cáo:", error);
      addToast('Có lỗi xảy ra khi gửi báo cáo', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    closeReportModal();
  };

  const reasonEntries = Object.entries(REPORT_CONFIG.REASONS) as [ReportReason, { label: string; description: string }][];
  const isUserReport = reportContext?.type === ReportType.USER;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={isUserReport ? "Báo cáo người dùng" : "Báo cáo vi phạm"}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col">
        {/* Scrollable Content Area */}
        <div className="overflow-y-auto max-h-[60vh] pr-2 -mr-2 space-y-4 p-1">
          {/* Header info */}
          <div className="flex items-center gap-2 text-text-secondary text-sm bg-warning/10 p-3 rounded-lg">
            <AlertTriangle size={16} className="text-warning flex-shrink-0" />
            <span>{isUserReport 
              ? "Hãy cho chúng tôi biết người dùng này đang vi phạm điều gì" 
              : "Chọn lý do phù hợp nhất để giúp chúng tôi xử lý nhanh hơn"}
            </span>
          </div>

          {/* Danh sách lý do */}
          <div className="space-y-2">
            {reasonEntries.map(([key, value]) => (
              <label
                key={key}
                className={`
                  flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all
                  border ${formData.reason === key 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'border-border-light hover:bg-bg-hover hover:border-border-medium'
                  }
                `}
              >
                <input
                  type="radio"
                  value={key}
                  {...register('reason')}
                  className="mt-0.5 accent-primary w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-primary text-sm">{value.label}</div>
                  <div className="text-xs text-text-secondary mt-0.5">{value.description}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Validation Error for Reason */}
          {errors.reason && (
            <p className="text-xs text-error mt-1">{errors.reason.message}</p>
          )}

          {/* Mô tả thêm */}
          {(formData.reason === ReportReason.OTHER || formData.reason !== '') && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  Mô tả chi tiết {formData.reason === ReportReason.OTHER && <span className="text-text-secondary">(bắt buộc)</span>}
                </label>
                <TextArea
                  placeholder="Vui lòng mô tả lý do báo cáo..."
                  {...register('description')}
                  error={errors.description?.message}
                  maxLength={REPORT_CONFIG.DESCRIPTION_MAX_LENGTH}
                  rows={3}
                  autoFocus
                />
              </div>

              {/* Upload Image Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-text-primary">
                    Hình ảnh bằng chứng (Tối đa {REPORT_CONFIG.MAX_IMAGES_PER_REPORT} ảnh)
                  </label>
                  <span className="text-xs text-text-tertiary">{selectedImages.length}/{REPORT_CONFIG.MAX_IMAGES_PER_REPORT}</span>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="aspect-square relative group rounded-lg overflow-hidden border border-border-light">
                      <img src={url} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  
                  {selectedImages.length < REPORT_CONFIG.MAX_IMAGES_PER_REPORT && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square flex flex-col items-center justify-center gap-1 border-2 border-dashed border-border-light rounded-lg hover:bg-bg-secondary/50 hover:border-primary/50 transition-colors text-text-tertiary hover:text-primary"
                    >
                      <ImageIcon size={20} />
                      <span className="text-[10px]">Thêm ảnh</span>
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Tùy chọn chặn người dùng */}
          {(formData.reason !== '') && (
            <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <Checkbox
                label="Chặn người dùng này để tránh các tương tác tiêu cực"
                checked={shouldBlock}
                onChange={(e) => setShouldBlock(e.target.checked)}
              />
            </div>
          )}

        </div>

        {/* Fixed Actions Footer */}
        <div className="flex gap-3 pt-4 mt-2 border-t border-border-light">
          <Button 
            type="button"
            variant="secondary" 
            onClick={handleClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            className="flex-1"
            icon={<Flag size={16} />}
          >
            {isUploading ? 'Đang tải ảnh...' : 'Gửi báo cáo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
