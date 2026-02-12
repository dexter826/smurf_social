import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal } from '../ui';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { TOAST_MESSAGES } from '../../constants';
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
      toast.success(TOAST_MESSAGES.AUTH.CHANGE_PASSWORD_SUCCESS);

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Đổi mật khẩu"
      maxWidth="md"
      footer={
        <div className="flex items-center gap-3 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            className="flex-1"
            isLoading={isLoading}
            disabled={success}
          >
            Lưu thay đổi
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-tertiary">
          Vui lòng nhập mật khẩu hiện tại và mật khẩu mới của bạn.
        </p>

        {(error || Object.keys(errors).length > 0) && (
          <div className="flex flex-col gap-1.5 p-3 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
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
          <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-xl text-success text-sm">
            <CheckCircle2 size={18} />
            <span>Đổi mật khẩu thành công!</span>
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Mật khẩu hiện tại"
            type={showPasswords ? "text" : "password"}
            {...register('currentPassword')}
            autoComplete="current-password"
            placeholder="Nhập mật khẩu hiện tại"
            icon={<Lock size={18} />}
            error={errors.currentPassword?.message}
            rightElement={
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPasswords(!showPasswords)}
                className="p-2 text-text-tertiary hover:text-text-primary transition-all duration-base"
              >
                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />

          <Input
            label="Mật khẩu mới"
            type={showPasswords ? "text" : "password"}
            {...register('newPassword')}
            autoComplete="new-password"
            placeholder="Nhập mật khẩu mới"
            icon={<Lock size={18} />}
            error={errors.newPassword?.message}
            rightElement={
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPasswords(!showPasswords)}
                className="p-2 text-text-tertiary hover:text-text-primary transition-all duration-base"
              >
                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />

          <Input
            label="Xác nhận mật khẩu mới"
            type={showPasswords ? "text" : "password"}
            {...register('confirmPassword')}
            autoComplete="new-password"
            placeholder="Xác nhận mật khẩu mới"
            icon={<Lock size={18} />}
            error={errors.confirmPassword?.message}
            rightElement={
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPasswords(!showPasswords)}
                className="p-2 text-text-tertiary hover:text-text-primary transition-all duration-base"
              >
                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
        </div>
      </div>
    </Modal>
  );
};

export default ChangePasswordModal;
