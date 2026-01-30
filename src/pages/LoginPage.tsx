import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button, Input, Checkbox } from '../components/ui';
import { toast } from '../store/toastStore';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle } from 'lucide-react';


const LoginPage: React.FC = () => {
  const { login, register, resetPassword, sendVerificationEmail, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', name: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verificationSent, setVerificationSent] = useState(false);

  // Load email đã ghi nhớ
  React.useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

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
        
        // Lưu hoặc xóa email ghi nhớ
        if (rememberMe) {
          localStorage.setItem('remembered_email', formData.email);
        } else {
          localStorage.removeItem('remembered_email');
        }
        
        navigate('/');
      } else {
        await register(formData.email, formData.password, formData.name);
        setVerificationSent(true);
        toast.success("Đăng ký thành công! Vui lòng kiểm tra email để xác thực.");
        setActiveTab('login');
      }
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
        case 'auth/email-not-verified':
          message = "Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn.";
          break;
        default:
          message = error.message || "Thao tác thất bại.";
      }
      
      setErrors({ auth: message });
      toast.error(message);
    }
  };

  const handleResendEmail = async () => {
    try {
      await sendVerificationEmail();
      setErrors(prev => ({ ...prev, auth: undefined }));
      setVerificationSent(true);
      toast.success("Đã gửi lại email xác thực!");
    } catch (error: any) {
      toast.error("Không thể gửi email lúc này. Vui lòng thử lại sau.");
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
    <div className="flex min-h-[100dvh] bg-bg-primary overflow-hidden transition-theme">
      {/* Left Wall: Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-primary via-[#4b8df8] to-[#0047b3] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[300px] h-[300px] bg-[#000]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center">
          <img src="/logo_text_white.png" alt="Smurfy" className="h-12 object-contain" />
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-6xl font-bold text-white leading-[1.1]">
            Kết nối <br /> Mọi nơi.
          </h2>
          <p className="text-white/80 text-lg font-medium max-w-md">
            Trải nghiệm mạng xã hội thế hệ mới với Smurfy. Kết nối, chia sẻ và trò chuyện với bạn bè một cách an toàn và riêng tư.
          </p>
        </div>

        <div className="relative z-10 text-white/60 text-sm font-medium">
          © {new Date().getFullYear()} Smurfy Social. Bảo lưu mọi quyền.
        </div>
      </div>

      {/* Right Wall: Form Area */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-bg-primary transition-theme">
        <div className="w-full max-w-[420px] fade-in">
          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src="/logo_text_blue.png" alt="Smurfy" className="h-10 object-contain" />
          </div>

          <div className="mb-8 text-center sm:text-left">
            <h1 className="text-3xl font-extrabold text-text-primary mb-2">
              {activeTab === 'login' ? 'Chào mừng trở lại' : activeTab === 'register' ? 'Tham gia ngay' : 'Khôi phục mật khẩu'}
            </h1>
            <p className="text-text-tertiary text-sm font-medium">
              {activeTab === 'login' 
                ? "Đăng nhập để tiếp tục cuộc trò chuyện của bạn." 
                : activeTab === 'register' 
                  ? "Tạo tài khoản mới để bắt đầu kết nối." 
                  : "Nhập email của bạn để lấy lại mật khẩu."}
            </p>
          </div>

          {activeTab === 'forgot' ? (
            <form onSubmit={handleResetSubmit} className="space-y-5">
              {errors.success && (
                <div className="p-3 text-xs font-semibold text-success bg-success-light/30 border border-success/30 rounded-xl mb-4">
                  {errors.success}
                </div>
              )}
              
              <Input
                label="Địa chỉ Email"
                icon={<Mail size={18} />}
                type="email"
                placeholder="Nhập địa chỉ email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                error={errors.email}
                autoComplete="email"
                className="rounded-xl h-12"
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full h-12 text-sm font-bold rounded-xl shadow-md hover:shadow-primary/30 transition-all"
                disabled={isLoading}
              >
                {isLoading ? 'Đang gửi...' : 'Gửi mã khôi phục'}
              </Button>

              <div className="text-center pt-2">
                <Button 
                  variant="ghost"
                  type="button"
                  onClick={() => handleTabChange('login')}
                  className="text-sm text-text-secondary hover:text-primary font-semibold"
                >
                  Quay lại đăng nhập
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {errors.auth && (
                  <div className="p-3.5 bg-error/5 border border-error/20 rounded-xl flex items-start gap-3 animate-shake">
                    <AlertCircle size={18} className="text-error shrink-0 mt-0.5" />
                    <div className="space-y-1.5 text-xs text-error font-medium leading-[1.4]">
                      <p>{errors.auth}</p>
                      {errors.auth.includes('xác thực email') && (
                        <button 
                          type="button"
                          onClick={handleResendEmail}
                          className="text-primary hover:underline font-bold block"
                        >
                          Gửi lại email xác thực
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {verificationSent && !errors.auth && (
                  <div className="p-3.5 bg-success/5 border border-success/20 rounded-xl flex items-start gap-3">
                    <AlertCircle size={18} className="text-success shrink-0 mt-0.5" />
                    <div className="text-xs text-success font-medium leading-[1.4]">
                      Đã gửi link xác thực đến email của bạn. Vui lòng kiểm tra hộp thư (và cả thư rác).
                    </div>
                  </div>
                )}
                
                {activeTab === 'register' && (
                  <Input
                    label="Họ và Tên"
                    icon={<User size={18} />}
                    placeholder="Nhập họ tên của bạn"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    error={errors.name}
                    className="rounded-xl h-12"
                  />
                )}
                
                <Input
                  label="Email"
                  icon={<Mail size={18} />}
                  type="email"
                  placeholder="Nhập địa chỉ email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  error={errors.email}
                  autoComplete="email"
                  className="rounded-xl h-12"
                />
                
                <div className="space-y-1.5">
                  <Input
                    label="Mật khẩu"
                    icon={<Lock size={18} />}
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    error={errors.password}
                    className="rounded-xl h-12"
                    rightElement={
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2 text-text-tertiary hover:text-text-secondary transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />
                  {activeTab === 'login' && (
                    <div className="flex items-center justify-between mt-1">
                      <Checkbox 
                        label="Ghi nhớ đăng nhập" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <button 
                        type="button"
                        onClick={() => handleTabChange('forgot')}
                        className="text-xs text-primary hover:underline font-bold"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                  )}
                </div>

                {activeTab === 'register' && (
                  <Input
                    label="Xác nhận mật khẩu"
                    icon={<Lock size={18} />}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Xác nhận mật khẩu"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    error={errors.confirmPassword}
                    className="rounded-xl h-12"
                    rightElement={
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="p-2 text-text-tertiary hover:text-text-secondary transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full h-12 text-sm font-bold rounded-xl shadow-md hover:shadow-primary/30 transition-all mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Đang xử lý...' : (activeTab === 'login' ? 'Đăng nhập' : 'Đăng ký')}
                </Button>
              </form>

              <div className="text-center text-sm">
                <span className="text-text-tertiary">
                  {activeTab === 'login' ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
                </span>{' '}
                <button
                  onClick={() => handleTabChange(activeTab === 'login' ? 'register' : 'login')}
                  className="text-primary hover:underline font-bold transition-all"
                >
                  {activeTab === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
                </button>
              </div>
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-[11px] text-text-tertiary max-w-[300px] mx-auto leading-relaxed">
              Bằng cách tiếp tục, bạn đồng ý với <a href="#" className="font-semibold text-text-secondary hover:text-primary">Điều khoản dịch vụ</a> & <a href="#" className="font-semibold text-text-secondary hover:text-primary">Chính sách quyền riêng tư</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;