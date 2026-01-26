import React, { useEffect, useState } from 'react';
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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'primary' : 'primary'} // Currently primary is the main color
            className={variant === 'danger' ? 'bg-error hover:bg-error/90 border-none' : ''}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        {variant === 'danger' && (
          <div className="w-12 h-12 bg-error/10 text-error rounded-full flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        )}
        <p className="text-text-primary">
          {message}
        </p>
      </div>
    </Modal>
  );
};
