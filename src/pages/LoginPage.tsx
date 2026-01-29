import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button, Input } from '../components/ui';
import { toast } from '../store/toastStore';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';


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
      if (error.code === 'auth/invalid-email') message = 'Email không hợp lệ';
      if (error.code === 'auth/user-not-found') message = "Email này chưa được đăng ký.";
      
      toast.error(message);
    }
  };

  const handleTabChange = (tab: 'login' | 'register' | 'forgot') => {
    setActiveTab(tab);
    setErrors({});
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 p-4 transition-theme selection:bg-primary-light selection:text-primary">
      <div className="w-full max-w-[400px] bg-bg-primary rounded-2xl shadow-dropdown overflow-hidden transition-all ring-1 ring-black/5">
        <div className="bg-bg-primary p-10 text-center relative">
          <img 
             src="/logo.svg" 
             alt="Smurfy Logo" 
             className="mx-auto w-20 h-20 drop-shadow-sm mb-4" 
          />
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Smurfy</h1>
          {activeTab === 'forgot' && (
            <p className="text-text-tertiary text-sm font-medium mt-2">
              Nhập email để lấy lại mật khẩu
            </p>
          )}
        </div>

        {activeTab !== 'forgot' && (
          <div className="flex border-b border-border-light relative">
            <Button
              variant="ghost"
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all rounded-none focus:!ring-0 focus:!ring-offset-0 !outline-none hover:!bg-transparent ${
                activeTab === 'login' ? 'text-primary' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Đăng nhập
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleTabChange('register')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all rounded-none focus:!ring-0 focus:!ring-offset-0 !outline-none hover:!bg-transparent ${
                activeTab === 'register' ? 'text-primary' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Đăng ký
            </Button>
            
            {/* Animated Indicator */}
            <div 
                className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-spring"
                style={{ 
                    left: activeTab === 'login' ? '0%' : '50%', 
                    width: '50%' 
                }}
            />
          </div>
        )}

        <div className="p-6 md:p-8">
          {activeTab === 'forgot' ? (
             <form onSubmit={handleResetSubmit} className="space-y-4">
                {errors.success && (
                  <div className="p-2 text-xs text-success bg-success-light rounded border border-success mb-2">
                    {errors.success}
                  </div>
                )}
                
                  <Input
                    label="Email đã đăng ký"
                    icon={<Mail size={16} />}
                    type="email"
                    placeholder="Nhập email của bạn"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    error={errors.email}
                    autoComplete="email"
                  />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full h-10 text-sm font-bold shadow-md hover:shadow-lg transition-all mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Đang gửi...' : 'Gửi link khôi phục'}
                </Button>

                <div className="text-center mt-3">
                  <Button 
                    variant="ghost"
                    type="button"
                    size="sm"
                    onClick={() => handleTabChange('login')}
                    className="text-xs text-text-secondary hover:text-text-primary font-medium"
                  >
                    Quay lại đăng nhập
                  </Button>
                </div>
             </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Bỏ hiển thị errors.form để tránh lặp với Toast */}

              {activeTab === 'register' && (
                <Input
                  label="Họ tên"
                  icon={<User size={16} />}
                  placeholder="Nhập họ tên của bạn"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  error={errors.name}
                />
              )}
              
              <Input
                label="Email"
                icon={<Mail size={16} />}
                type="email"
                placeholder="Nhập email của bạn"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                error={errors.email}
                autoComplete="email"
              />
              
              <Input
                label="Mật khẩu"
                icon={<Lock size={16} />}
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu của bạn"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                error={errors.password}
                rightElement={
                  <Button
                    variant="ghost"
                    type="button"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-text-tertiary hover:text-text-secondary"
                    icon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  />
                }
              />

              {activeTab === 'register' && (
                <Input
                  label="Xác nhận mật khẩu"
                  icon={<Lock size={16} />}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  error={errors.confirmPassword}
                  rightElement={
                    <Button
                      variant="ghost"
                      type="button"
                      size="sm"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-text-tertiary hover:text-text-secondary"
                      icon={showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    />
                  }
                />
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full h-10 text-sm font-bold shadow-md hover:shadow-lg transition-all mt-2"
                disabled={isLoading}
              >
                {isLoading ? 'Đang xử lý...' : (activeTab === 'login' ? 'Đăng nhập' : 'Đăng ký')}
              </Button>

              {activeTab === 'login' && (
                <div className="text-center mt-3">
                  <Button 
                    variant="ghost"
                    type="button"
                    size="sm"
                    onClick={() => handleTabChange('forgot')}
                    className="text-xs text-primary hover:text-primary-hover font-medium"
                  >
                    Quên mật khẩu?
                  </Button>
                </div>
              )}
            </form>
          )}
        </div>
        
        <div className="bg-bg-secondary/50 p-4 text-center border-t border-border-light transition-theme">
          <p className="text-[11px] text-text-tertiary">
            Bằng việc tiếp tục, bạn đồng ý với <a href="#" className="font-medium text-primary hover:underline transition-all">Điều khoản</a> & <a href="#" className="font-medium text-primary hover:underline transition-all">Chính sách bảo mật</a> của Smurfy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;