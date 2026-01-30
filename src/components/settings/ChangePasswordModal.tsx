import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Mật khẩu mới không được trùng với mật khẩu hiện tại.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới không khớp nhau.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Xác thực lại người dùng
      await authService.reauthenticate(currentPassword);
      
      // 2. Đổi mật khẩu
      await authService.changePassword(newPassword);
      
      setSuccess(true);
      toast.success("Mật khẩu đã được đổi. Vui lòng đăng nhập lại!");
      
      setTimeout(async () => {
        await logout();
        onClose();
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error("Lỗi đổi mật khẩu", err);
      if (err.code === 'auth/wrong-password') {
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
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
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-bg-secondary border border-border-light rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Nhập mật khẩu hiện tại"
                required
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
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-bg-secondary border border-border-light rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Nhập mật khẩu mới"
                required
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-bg-secondary border border-border-light rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Xác nhận mật khẩu mới"
                required
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
