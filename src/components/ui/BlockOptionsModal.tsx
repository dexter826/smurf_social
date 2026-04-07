import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Ban, MessageCircle, X, ShieldCheck } from 'lucide-react';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { BlockOptions } from '../../../shared/types';
import { useScrollLock } from '../../hooks/utils/useScrollLock';

interface BlockOptionsModalProps {
  isOpen: boolean;
  targetName: string;
  initialOptions?: Partial<BlockOptions>;
  onApply: (options: BlockOptions) => Promise<void>;
  onUnblock?: () => Promise<void>;
  onClose: () => void;
}

const DEFAULT_OPTIONS: BlockOptions = {
  isFullyBlocked: false,
  isMessageBlocked: false,
};

export const BlockOptionsModal: React.FC<BlockOptionsModalProps> = ({
  isOpen,
  targetName,
  initialOptions,
  onApply,
  onUnblock,
  onClose,
}) => {
  const [options, setOptions] = useState<BlockOptions>(DEFAULT_OPTIONS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOptions({
        isFullyBlocked: initialOptions?.isFullyBlocked ?? false,
        isMessageBlocked: initialOptions?.isMessageBlocked ?? false,
      });
    }
  }, [isOpen, initialOptions]);

  useScrollLock(isOpen);

  if (!isOpen) return null;

  const handleApply = async () => {
    setIsLoading(true);
    try {
      const hasAnyOption = options.isFullyBlocked || options.isMessageBlocked;

      if (!hasAnyOption && onUnblock) {
        await onUnblock();
      } else {
        await onApply(options);
      }
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const isNoneSelected = !options.isFullyBlocked && !options.isMessageBlocked;
  const isPreviouslyBlocked = initialOptions?.isFullyBlocked || initialOptions?.isMessageBlocked;

  const content = (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center sm:p-4"
      style={{ zIndex: 'var(--z-modal)' }}
    >
      <div
        className="fixed inset-0 bg-bg-overlay backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-bg-primary w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center flex-shrink-0">
              <Ban size={18} className="text-error" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-base">Quản lý chặn {targetName}</h3>
              <p className="text-xs text-text-tertiary">Chọn mức độ hạn chế tương tác</p>
            </div>
          </div>
          <IconButton icon={<X size={20} />} onClick={onClose} size="lg" />
        </div>

        {/* Options */}
        <div className="px-5 py-4 space-y-3">
          {/* Fully Blocked Option */}
          <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors duration-200 border ${options.isFullyBlocked ? 'bg-error/5 border-error/30' : 'border-border-light hover:bg-bg-hover'}`}>
            <div className="pt-0.5 flex-shrink-0">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${options.isFullyBlocked ? 'border-error bg-error' : 'border-border-medium bg-bg-primary'}`}>
                {options.isFullyBlocked && <div className="w-2h-2 rounded-full bg-white" style={{ width: '8px', height: '8px' }} />}
              </div>
            </div>
            <div className="flex-1 min-w-0" onClick={() => setOptions({ isFullyBlocked: true, isMessageBlocked: false })}>
              <div className="flex items-center gap-2">
                <Ban size={16} className={options.isFullyBlocked ? 'text-error' : 'text-text-secondary'} />
                <span className={`font-medium text-sm ${options.isFullyBlocked ? 'text-error' : 'text-text-primary'}`}>Chặn hoàn toàn</span>
              </div>
              <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
                Tự động huỷ kết bạn và cấm mọi liên hệ. Cả hai sẽ không thể tìm thấy nhau hay xem tường của nhau.
              </p>
            </div>
          </label>

          {/* Message Block Option */}
          <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors duration-200 border ${options.isMessageBlocked && !options.isFullyBlocked ? 'bg-warning/5 border-warning/30' : 'border-border-light hover:bg-bg-hover'}`}>
            <div className="pt-0.5 flex-shrink-0">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${options.isMessageBlocked && !options.isFullyBlocked ? 'border-warning bg-warning' : 'border-border-medium bg-bg-primary'}`}>
                {options.isMessageBlocked && !options.isFullyBlocked && <div className="w-2 h-2 rounded-full bg-white" style={{ width: '8px', height: '8px' }} />}
              </div>
            </div>
            <div className="flex-1 min-w-0" onClick={() => setOptions({ isFullyBlocked: false, isMessageBlocked: true })}>
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className={options.isMessageBlocked && !options.isFullyBlocked ? 'text-warning' : 'text-text-secondary'} />
                <span className={`font-medium text-sm ${options.isMessageBlocked && !options.isFullyBlocked ? 'text-warning' : 'text-text-primary'}`}>Chỉ chặn liên lạc</span>
              </div>
              <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
                Vẫn xem được hồ sơ trên tường của nhau. Chỉ chặn việc gửi tin nhắn và gọi điện trên hệ thống.
              </p>
            </div>
          </label>

          {/* Unblock Option (Only show if previously blocked) */}
          {isPreviouslyBlocked && (
            <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors duration-200 border ${isNoneSelected ? 'bg-success/5 border-success/30' : 'border-border-light hover:bg-bg-hover'}`}>
              <div className="pt-0.5 flex-shrink-0">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isNoneSelected ? 'border-success bg-success' : 'border-border-medium bg-bg-primary'}`}>
                  {isNoneSelected && <div className="w-2 h-2 rounded-full bg-white" style={{ width: '8px', height: '8px' }} />}
                </div>
              </div>
              <div className="flex-1 min-w-0" onClick={() => setOptions({ isFullyBlocked: false, isMessageBlocked: false })}>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className={isNoneSelected ? 'text-success' : 'text-text-secondary'} />
                  <span className={`font-medium text-sm ${isNoneSelected ? 'text-success' : 'text-text-primary'}`}>Bỏ chặn (Khôi phục bình thường)</span>
                </div>
                <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
                  Huỷ mọi hạn chế đối với người này. Hai bạn có thể tương tác bình thường trở lại.
                </p>
              </div>
            </label>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border-light flex gap-3 pb-[calc(16px+env(safe-area-inset-bottom))] sm:pb-4">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Hủy
          </Button>
          <Button
            variant={isNoneSelected && isPreviouslyBlocked ? 'primary' : 'danger'}
            onClick={handleApply}
            isLoading={isLoading}
            className="flex-1 font-semibold"
          >
            {isNoneSelected && isPreviouslyBlocked ? 'Xác nhận Bỏ chặn' : 'Áp dụng chặn'}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
