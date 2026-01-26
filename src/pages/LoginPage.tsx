import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button, Input } from '../components/ui';
import { toast } from '../store/toastStore';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login, register, resetPassword, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', name: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (activeTab === 'register' && !formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập họ tên';
    }

    if (!formData.email) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (activeTab === 'register') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (activeTab === 'login') {
        await login(formData.email, formData.password);
      } else {
        await register(formData.email, formData.password, formData.name);
      }
      navigate('/');
    } catch (error: any) {
      const errorCode = error.code;
      let message = "Đã có lỗi xảy ra. Vui lòng thử lại.";
      
      switch (errorCode) {
        case 'auth/invalid-email':
          message = "Email không hợp lệ.";
          break;
        case 'auth/user-disabled':
          message = "Tài khoản này đã bị khóa.";
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = "Email hoặc mật khẩu không chính xác.";
          break;
        case 'auth/email-already-in-use':
          message = "Email này đã được sử dụng cho tài khoản khác.";
          break;
        case 'auth/weak-password':
          message = "Mật khẩu quá yếu.";
          break;
        default:
          message = error.message || "Thao tác thất bại.";
      }
      
      toast.error(message);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      setErrors({ email: 'Vui lòng nhập email' });
      return;
    }

    try {
      await resetPassword(formData.email);
      setErrors({ success: 'Email đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư.' });
      toast.success('Đã gửi email khôi phục!');
    } catch (error: any) {
      let message = "Không tìm thấy email hoặc có lỗi xảy ra.";
      if (error.code === 'auth/invalid-email') message = "Email không hợp lệ.";
      if (error.code === 'auth/user-not-found') message = "Email này chưa được đăng ký.";
      
      toast.error(message);
    }
  };

  const handleTabChange = (tab: 'login' | 'register' | 'forgot') => {
    setActiveTab(tab);
    setErrors({});
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary-light p-4 transition-theme">
      <div className="w-full max-w-[400px] bg-bg-primary rounded-xl shadow-dropdown overflow-hidden transition-all">
        <div className="bg-primary p-6 text-center">
          <h1 className="text-2xl font-bold text-text-on-primary mb-2">Smurfy</h1>
          <p className="text-text-on-primary/80 text-xs leading-relaxed">
            {activeTab === 'forgot' 
              ? 'Nhập email để lấy lại mật khẩu'
              : <>Kết nối cùng Smurfy Web <br/> Trò chuyện & sẻ chia mọi lúc</>
            }
          </p>
        </div>

        {activeTab !== 'forgot' && (
          <div className="flex border-b border-border-light">
            <button
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                activeTab === 'login' ? 'text-primary border-b-2 border-primary' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => handleTabChange('register')}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                activeTab === 'register' ? 'text-primary border-b-2 border-primary' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Đăng ký
            </button>
          </div>
        )}

        <div className="p-6">
          {activeTab === 'forgot' ? (
             <form onSubmit={handleResetSubmit} className="space-y-4">
                {errors.success && (
                  <div className="p-2 text-xs text-success bg-success-light rounded border border-success mb-2">
                    {errors.success}
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary ml-1">Email đã đăng ký</label>
                  <Input
                    icon={<Mail size={16} />}
                    type="email"
                    placeholder="Nhập email của bạn"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    error={errors.email}
                    className="h-10 !ring-0 !border-border-light focus:!border-primary shadow-sm"
                    autoComplete="email"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full h-10 text-sm font-bold shadow-md hover:shadow-lg transition-all mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Đang gửi...' : 'Gửi link khôi phục'}
                </Button>

                <div className="text-center mt-3">
                  <button 
                    type="button"
                    onClick={() => handleTabChange('login')}
                    className="text-xs text-text-secondary hover:text-text-primary font-medium transition-colors"
                  >
                    Quay lại đăng nhập
                  </button>
                </div>
             </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Bỏ hiển thị errors.form để tránh lặp với Toast */}

              {activeTab === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary ml-1">Họ tên</label>
                  <Input
                    placeholder="Nhập họ tên của bạn"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    error={errors.name}
                    className="h-10 !ring-0 !border-border-light focus:!border-primary shadow-sm"
                  />
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary ml-1">Email</label>
                <Input
                  icon={<Mail size={16} />}
                  type="email"
                  placeholder="Nhập email của bạn"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  error={errors.email}
                  className="h-10 !ring-0 !border-border-light focus:!border-primary shadow-sm"
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary ml-1">Mật khẩu</label>
                <Input
                  icon={<Lock size={16} />}
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu của bạn"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  error={errors.password}
                  className="h-10 !ring-0 !border-border-light focus:!border-primary shadow-sm"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-text-tertiary hover:text-text-secondary"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </div>

              {activeTab === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary ml-1">Xác nhận mật khẩu</label>
                  <Input
                    icon={<Lock size={16} />}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    error={errors.confirmPassword}
                    className="h-10 !ring-0 !border-border-light focus:!border-primary shadow-sm"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-text-tertiary hover:text-text-secondary"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full h-10 text-sm font-bold shadow-md hover:shadow-lg transition-all mt-2"
                disabled={isLoading}
              >
                {isLoading ? 'Đang xử lý...' : (activeTab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản')}
              </Button>

              {activeTab === 'login' && (
                <div className="text-center mt-3">
                  <button 
                    type="button"
                    onClick={() => handleTabChange('forgot')}
                    className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
        
        <div className="bg-bg-secondary p-3 text-center text-[10px] text-text-tertiary border-t border-border-light transition-theme">
          Chấp nhận <a href="#" className="text-primary hover:underline">Diều khoản & Bảo mật</a> khi sử dụng Smurfy.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;