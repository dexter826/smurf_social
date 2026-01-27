import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md'
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-hidden">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className={`
        relative bg-bg-primary w-full rounded-2xl shadow-2xl transition-theme overflow-hidden flex flex-col animate-in zoom-in-95 duration-200
        ${maxWidthClasses[maxWidth]}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-light">
          <h3 className="text-lg font-bold text-text-primary px-1">
            {title || ''}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-hover rounded-full transition-colors text-text-secondary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-border-light bg-bg-secondary/30 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận',
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'primary'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      document.body.style.overflow = 'unset';
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const dialogContent = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className={`
        relative bg-bg-primary w-full max-w-[320px] rounded-xl shadow-2xl p-5 transition-all duration-200
        ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}>
        {/* Icon + Title + Message */}
        <div className="flex flex-col items-center text-center mb-5">
          {variant === 'danger' && (
            <div className="w-11 h-11 bg-error/10 text-error rounded-full flex items-center justify-center mb-3">
              <AlertTriangle size={22} />
            </div>
          )}
          <h3 className="text-base font-bold text-text-primary mb-1.5">
            {title}
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 text-sm font-medium text-text-secondary bg-bg-secondary hover:bg-bg-hover rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={`
              flex-1 py-2.5 px-4 text-sm font-medium text-white rounded-lg transition-colors
              ${variant === 'danger' 
                ? 'bg-error hover:bg-error/90' 
                : 'bg-primary hover:bg-primary/90'
              }
            `}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};
