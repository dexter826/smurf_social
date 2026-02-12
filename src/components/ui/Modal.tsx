import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Info } from 'lucide-react';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { useScrollLock } from '../../hooks/utils/useScrollLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  showHeader?: boolean;
  showCloseButton?: boolean;
  className?: string;
  bodyClassName?: string;
  fullScreen?: boolean | 'mobile';
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
  'full': 'max-w-full',
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
  className = '',
  bodyClassName = '',
  fullScreen = false
}) => {
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const isFullScreenAlways = typeof fullScreen === 'boolean' && fullScreen === true;
  const isFullScreenMobile = typeof fullScreen === 'string' && fullScreen === 'mobile';

  const modalContent = (
    <div className={`fixed inset-0 z-[var(--z-modal)] flex items-center justify-center ${isFullScreenAlways ? 'p-0' : (isFullScreenMobile ? 'max-md:p-0 p-4' : 'p-4')} overflow-hidden`}>
      <div
        className="fixed inset-0 bg-bg-overlay backdrop-blur-sm animate-in fade-in duration-base"
        onClick={onClose}
      />

      <div className={`
        relative bg-bg-primary w-full shadow-2xl transition-theme overflow-hidden flex flex-col justify-between md:justify-start 
        ${isFullScreenAlways
          ? 'h-full max-h-screen rounded-none'
          : (isFullScreenMobile
            ? 'h-full md:h-auto max-md:max-h-screen md:max-h-[90vh] rounded-none md:rounded-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-slow'
            : 'rounded-2xl h-auto md:h-auto md:max-h-[90vh] animate-in slide-in-from-bottom md:zoom-in-95 duration-base'
          )}
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
        <div className={`overflow-y-auto flex-1 min-h-0 ${paddingClasses[padding]} ${bodyClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-border-light bg-bg-secondary/30 flex justify-end gap-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
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
  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  if (!isVisible) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const dialogContent = (
    <div className="fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-bg-overlay backdrop-blur-sm transition-all duration-base ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Dialog */}
      <div className={`
        relative bg-bg-primary w-full max-w-[320px] rounded-xl shadow-2xl p-5 transition-all duration-base
        ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}>
        {/* Icon + Title + Message */}
        <div className="flex flex-col items-center text-center mb-5">
          {variant === 'danger' && (
            <div className="w-12 h-12 bg-error-light text-error rounded-full flex items-center justify-center mb-3">
              <AlertTriangle size={24} />
            </div>
          )}

          {variant === 'primary' && (
            <div className="w-12 h-12 bg-primary-light text-primary rounded-full flex items-center justify-center mb-3">
              <Info size={24} />
            </div>
          )}
          <h3 className="text-lg font-bold text-text-primary mb-2">
            {title}
          </h3>
          <p className="text-[15px] text-text-secondary leading-relaxed">
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={onClose}
            variant="secondary"
            className="w-full text-text-secondary font-medium"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            variant={variant}
            className="w-full font-bold shadow-sm"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};
