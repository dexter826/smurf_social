import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { changePasswordSchema, ChangePasswordFormValues } from '../../utils/validation';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  if (!isOpen) return null;

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setError(null);
    setIsLoading(true);
    try {
      // 1. Xác thực lại người dùng
      await authService.reauthenticate(data.currentPassword);
      
      // 2. Đổi mật khẩu
      await authService.changePassword(data.newPassword);
      
      setSuccess(true);
      toast.success("Mật khẩu đã được đổi. Vui lòng đăng nhập lại!");
      
      setTimeout(async () => {
        await logout();
        onClose();
        navigate('/login');
      }, 2000);
    } catch (err: unknown) {
      console.error("Lỗi đổi mật khẩu", err);
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/wrong-password') {
        setError("Mật khẩu hiện tại không chính xác.");
      } else {
        setError("Có lỗi xảy ra. Vui lòng thử lại sau.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay backdrop-blur-sm">
      <div className="w-full max-w-md bg-bg-primary rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-border-light">
          <h2 className="text-xl font-bold text-text-primary">Đổi mật khẩu</h2>
          <p className="text-sm text-text-tertiary mt-1">
            Vui lòng nhập mật khẩu hiện tại và mật khẩu mới của bạn.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {(error || Object.keys(errors).length > 0) && (
            <div className="flex flex-col gap-1.5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} />
                <span>{error || "Vui lòng kiểm tra lại thông tin:"}</span>
              </div>
              {Object.values(errors).map((err, i) => (
                <p key={i} className="pl-7 text-xs">• {err?.message}</p>
              ))}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm">
              <CheckCircle2 size={18} />
              <span>Đổi mật khẩu thành công!</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary px-1">Mật khẩu hiện tại</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
              <input
                type={showPasswords ? "text" : "password"}
                {...register('currentPassword')}
                className={`w-full pl-10 pr-10 py-2.5 bg-bg-secondary border rounded-xl text-text-primary focus:outline-none focus:ring-2 transition-all ${
                  errors.currentPassword ? 'border-red-500 focus:ring-red-500/50' : 'border-border-light focus:ring-primary/50'
                }`}
                placeholder="Nhập mật khẩu hiện tại"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
              >
                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary px-1">Mật khẩu mới</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
              <input
                type={showPasswords ? "text" : "password"}
                {...register('newPassword')}
                className={`w-full pl-10 pr-10 py-2.5 bg-bg-secondary border rounded-xl text-text-primary focus:outline-none focus:ring-2 transition-all ${
                  errors.newPassword ? 'border-red-500 focus:ring-red-500/50' : 'border-border-light focus:ring-primary/50'
                }`}
                placeholder="Nhập mật khẩu mới"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
              >
                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary px-1">Xác nhận mật khẩu mới</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
              <input
                type={showPasswords ? "text" : "password"}
                {...register('confirmPassword')}
                className={`w-full pl-10 pr-10 py-2.5 bg-bg-secondary border rounded-xl text-text-primary focus:outline-none focus:ring-2 transition-all ${
                  errors.confirmPassword ? 'border-red-500 focus:ring-red-500/50' : 'border-border-light focus:ring-primary/50'
                }`}
                placeholder="Xác nhận mật khẩu mới"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
              >
                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isLoading}
              disabled={success}
            >
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
