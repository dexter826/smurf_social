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

  const toggleFullyBlocked = () => {
    setOptions({
      isFullyBlocked: true,
      isMessageBlocked: true,
    });
  };

  const toggleMessageBlocked = () => {
    setOptions({
      isMessageBlocked: true,
      isFullyBlocked: false,
    });
  };

  const hasChanges = (options.isFullyBlocked !== (initialOptions?.isFullyBlocked ?? false)) || 
                    (options.isMessageBlocked !== (initialOptions?.isMessageBlocked ?? false));

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
        <div className="px-5 py-5 space-y-3">
          {/* Message Block Option */}
          <div 
            className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${options.isMessageBlocked && !options.isFullyBlocked ? 'bg-error/5 border-error/40 ring-1 ring-error/20' : 'border-bg-secondary hover:border-border-light'}`}
            onClick={toggleMessageBlocked}
          >
            <div className="pt-0.5">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${options.isMessageBlocked && !options.isFullyBlocked ? 'border-error bg-error' : 'border-border-strong'}`}>
                {(options.isMessageBlocked && !options.isFullyBlocked) && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-error font-bold text-sm">
                <MessageCircle size={15} />
                <span>Chặn tin nhắn & cuộc gọi</span>
              </div>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Vẫn xem được hồ sơ. Chỉ chặn việc gửi tin nhắn và gọi điện trên hệ thống.
              </p>
            </div>
          </div>

          {/* Fully Blocked Option */}
          <div 
            className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${options.isFullyBlocked ? 'bg-error/5 border-error/40 ring-1 ring-error/20' : 'border-bg-secondary hover:border-border-light'}`}
            onClick={toggleFullyBlocked}
          >
            <div className="pt-0.5">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${options.isFullyBlocked ? 'border-error bg-error' : 'border-border-strong'}`}>
                {options.isFullyBlocked && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-error font-bold text-sm">
                <Ban size={15} />
                <span>Chặn hoàn toàn</span>
              </div>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Tự động hủy kết bạn. Cả hai sẽ biến mất khỏi hệ thống của nhau, không thể tìm thấy hay xem hồ sơ.
              </p>
            </div>
          </div>

          {/* Unblock Option if previously blocked */}
          {isPreviouslyBlocked && (
            <div 
              className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${isNoneSelected ? 'bg-bg-secondary border-text-secondary' : 'border-dashed border-border-light hover:border-border-strong'}`}
              onClick={() => setOptions({ isFullyBlocked: false, isMessageBlocked: false })}
            >
              <div className="pt-0.5">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isNoneSelected ? 'border-text-secondary bg-text-secondary' : 'border-border-strong'}`}>
                  {isNoneSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 font-bold text-sm text-text-primary">
                  <X size={15} />
                  <span>Bỏ chặn</span>
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  Xóa bỏ mọi hạn chế và khôi phục khả năng tương tác bình thường.
                </p>
              </div>
            </div>
          )}
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
            disabled={!hasChanges && !isLoading}
            className="flex-1 font-bold h-11 shadow-sm transition-all"
          >
            {isNoneSelected && isPreviouslyBlocked ? 'Xác nhận Bỏ chặn' : 'Áp dụng ngay'}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
