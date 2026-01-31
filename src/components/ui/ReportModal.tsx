import React, { useState } from 'react';
import { Flag, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { TextArea } from './TextArea';
import { ReportReason } from '../../types';
import { useReportStore } from '../../store/reportStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { REPORT_CONFIG } from '../../constants';

export const ReportModal: React.FC = () => {
  const { user } = useAuthStore();
  const { isOpen, isSubmitting, error, closeReportModal, submitReport } = useReportStore();
  const { addToast } = useToastStore();
  
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!selectedReason || !user) return;

    const success = await submitReport(user.id, selectedReason, description || undefined);
    
    if (success) {
      addToast('Đã gửi báo cáo thành công. Chúng tôi sẽ xem xét trong thời gian sớm nhất.', 'success');
      setSelectedReason(null);
      setDescription('');
    }
  };

  const handleClose = () => {
    closeReportModal();
    setSelectedReason(null);
    setDescription('');
  };

  const reasonEntries = Object.entries(REPORT_CONFIG.REASONS) as [ReportReason, { label: string; description: string }][];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Báo cáo vi phạm"
      maxWidth="sm"
    >
      <div className="space-y-4">
        {/* Header info */}
        <div className="flex items-center gap-2 text-text-secondary text-sm bg-warning/10 p-3 rounded-lg">
          <AlertTriangle size={16} className="text-warning flex-shrink-0" />
          <span>Chọn lý do phù hợp nhất để giúp chúng tôi xử lý nhanh hơn</span>
        </div>

        {/* Danh sách lý do */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {reasonEntries.map(([key, value]) => (
            <label
              key={key}
              className={`
                flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all
                border ${selectedReason === key 
                  ? 'border-primary bg-primary/5 shadow-sm' 
                  : 'border-border-light hover:bg-bg-hover hover:border-border-medium'
                }
              `}
            >
              <input
                type="radio"
                name="reason"
                value={key}
                checked={selectedReason === key}
                onChange={() => setSelectedReason(key)}
                className="mt-0.5 accent-primary w-4 h-4"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text-primary text-sm">{value.label}</div>
                <div className="text-xs text-text-secondary mt-0.5">{value.description}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Mô tả thêm cho "Khác" */}
        {selectedReason === ReportReason.OTHER && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Mô tả chi tiết <span className="text-text-secondary">(bắt buộc)</span>
            </label>
            <TextArea
              placeholder="Vui lòng mô tả lý do báo cáo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={REPORT_CONFIG.DESCRIPTION_MAX_LENGTH}
              rows={3}
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="text-error text-sm bg-error/10 p-3 rounded-lg flex items-center gap-2">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button 
            variant="secondary" 
            onClick={handleClose}
            className="flex-1"
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting || (selectedReason === ReportReason.OTHER && !description.trim())}
            isLoading={isSubmitting}
            className="flex-1"
            icon={<Flag size={16} />}
          >
            Gửi báo cáo
          </Button>
        </div>
      </div>
    </Modal>
  );
};
