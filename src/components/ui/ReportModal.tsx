import React, { useEffect } from 'react';
import { Flag, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from './Modal';
import { Button } from './Button';
import { TextArea } from './TextArea';
import { ReportReason } from '../../types';
import { useReportStore } from '../../store/reportStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { REPORT_CONFIG } from '../../constants';
import { reportSchema, ReportFormValues } from '../../utils/validation';

export const ReportModal: React.FC = () => {
  const { user } = useAuthStore();
  const { isOpen, isSubmitting, error, closeReportModal, submitReport } = useReportStore();
  const { addToast } = useToastStore();
  
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
      description: ''
    }
  });

  const formData = watch();

  useEffect(() => {
    if (isOpen) {
      reset({
        reason: '',
        description: ''
      });
    }
  }, [isOpen, reset]);

  const onFormSubmit = async (data: ReportFormValues) => {
    if (!user) return;

    const success = await submitReport(user.id, data.reason as ReportReason, data.description || undefined);
    
    if (success) {
      addToast('Đã gửi báo cáo thành công. Chúng tôi sẽ xem xét trong thời gian sớm nhất.', 'success');
      handleClose();
    }
  };

  const handleClose = () => {
    closeReportModal();
  };

  const reasonEntries = Object.entries(REPORT_CONFIG.REASONS) as [ReportReason, { label: string; description: string }][];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Báo cáo vi phạm"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col">
        {/* Scrollable Content Area */}
        <div className="overflow-y-auto max-h-[60vh] pr-2 -mr-2 space-y-4 p-1">
          {/* Header info */}
          <div className="flex items-center gap-2 text-text-secondary text-sm bg-warning/10 p-3 rounded-lg">
            <AlertTriangle size={16} className="text-warning flex-shrink-0" />
            <span>Chọn lý do phù hợp nhất để giúp chúng tôi xử lý nhanh hơn</span>
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

          {/* Mô tả thêm cho "Khác" hay các lý do cần thêm thông tin */}
          {(formData.reason === ReportReason.OTHER || formData.reason !== '') && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
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
          )}

          {/* Error message from store */}
          {error && (
            <div className="text-error text-sm bg-error/10 p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle size={14} />
              {error}
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
            Gửi báo cáo
          </Button>
        </div>
      </form>
    </Modal>
  );
};
