import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToastStore, ToastType } from '../../store/toastStore';
import { IconButton } from './IconButton';

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="text-status-online" size={20} />,
  error: <AlertCircle className="text-badge-bg" size={20} />,
  info: <Info className="text-color-info" size={20} />,
  warning: <AlertTriangle className="text-color-warning" size={20} />,
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[var(--z-toast)] flex flex-col items-center gap-3 pointer-events-none w-full px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 bg-bg-primary border border-border-light px-4 py-3 rounded-xl shadow-dropdown animate-in fade-in slide-in-from-top-2 duration-300 w-full max-w-md transition-theme"
          role="alert"
        >
          <div className="shrink-0">
            {toastIcons[toast.type]}
          </div>
          <p className="flex-1 text-sm font-medium text-text-primary">
            {toast.message}
          </p>
          <IconButton
            onClick={() => removeToast(toast.id)}
            className="shrink-0"
            icon={<X size={16} />}
            size="sm"
          />
        </div>
      ))}
    </div>
  );
};
