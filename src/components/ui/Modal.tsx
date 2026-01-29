import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { IconButton } from './IconButton';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl' | '7xl';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  showHeader?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
  padding = 'lg',
  showHeader = true,
  showCloseButton = true,
  className = ''
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-4 overflow-hidden">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className={`
        relative bg-bg-primary w-full md:rounded-2xl shadow-2xl transition-theme overflow-hidden flex flex-col justify-between md:justify-start 
        h-full md:h-auto md:max-h-[90vh] rounded-none animate-in slide-in-from-bottom md:zoom-in-95 duration-200
        ${maxWidthClasses[maxWidth]} ${className}
      `}>
        {/* Header */}
        {showHeader && (
          <div className="flex items-center justify-between p-4 border-b border-border-light">
            <h3 className="text-lg font-bold text-text-primary px-1">
              {title || ''}
            </h3>
            {showCloseButton && (
              <IconButton
                onClick={onClose}
                icon={<X size={20} />}
                size="lg"
              />
            )}
          </div>
        )}

        {/* Body */}
        <div className={`overflow-y-auto flex-1 md:flex-none ${paddingClasses[padding]}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-border-light bg-bg-secondary/30 flex justify-end gap-3 pb-safe md:pb-4">
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
          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            variant={variant === 'danger' ? 'danger' : 'primary'}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};
