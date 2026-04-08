import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Ban, MessageCircle, X } from 'lucide-react';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Checkbox } from './Checkbox';
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

  const toggleFullyBlocked = (val: boolean) => {
    setOptions(prev => ({
      isFullyBlocked: val,
      isMessageBlocked: val ? true : prev.isMessageBlocked
    }));
  };

  const toggleMessageBlocked = (val: boolean) => {
    setOptions(prev => ({
      isMessageBlocked: val,
      isFullyBlocked: !val ? false : prev.isFullyBlocked
    }));
  };

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
        <div className="px-5 py-5 space-y-4">
          {/* Fully Blocked Option */}
          <div 
            className={`flex items-start gap-3.5 p-4 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${options.isFullyBlocked ? 'bg-error/5 border-error/20 ring-1 ring-error/10' : 'border-bg-secondary hover:border-border-light hover:bg-bg-hover'}`}
            onClick={() => toggleFullyBlocked(!options.isFullyBlocked)}
          >
            <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
              <Checkbox 
                className="checked:bg-error checked:border-error"
                checked={options.isFullyBlocked} 
                onChange={(e) => toggleFullyBlocked(e.target.checked)}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Ban size={16} className={options.isFullyBlocked ? 'text-error' : 'text-text-secondary'} />
                <span className={`font-bold text-sm ${options.isFullyBlocked ? 'text-error' : 'text-text-primary'}`}>Chặn hoàn toàn</span>
              </div>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Tự động huỷ kết bạn và cấm mọi liên hệ. Cả hai sẽ không thể tìm thấy nhau hay xem tường của nhau.
              </p>
            </div>
          </div>

          {/* Message Block Option */}
          <div 
            className={`flex items-start gap-3.5 p-4 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${options.isMessageBlocked ? 'bg-error/5 border-error/20 ring-1 ring-error/10' : 'border-bg-secondary hover:border-border-light hover:bg-bg-hover'}`}
            onClick={() => toggleMessageBlocked(!options.isMessageBlocked)}
          >
            <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
              <Checkbox 
                className="checked:bg-error checked:border-error"
                checked={options.isMessageBlocked} 
                onChange={(e) => toggleMessageBlocked(e.target.checked)}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className={options.isMessageBlocked ? 'text-error' : 'text-text-secondary'} />
                <span className={`font-bold text-sm ${options.isMessageBlocked ? 'text-error' : 'text-text-primary'}`}>Chặn tin nhắn & cuộc gọi</span>
              </div>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Vẫn xem được hồ sơ trên tường của nhau. Chỉ chặn việc gửi tin nhắn và gọi điện trên hệ thống.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-divider flex gap-3 pb-[calc(20px+env(safe-area-inset-bottom))] sm:pb-6">
          <Button variant="secondary" onClick={onClose} className="flex-1 font-semibold h-11">
            Hủy
          </Button>
          <Button
            variant={isNoneSelected && isPreviouslyBlocked ? 'primary' : 'danger'}
            onClick={handleApply}
            isLoading={isLoading}
            className="flex-1 font-bold h-11 shadow-sm"
          >
            {isNoneSelected && isPreviouslyBlocked ? 'Xác nhận Bỏ chặn' : 'Áp dụng ngay'}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
