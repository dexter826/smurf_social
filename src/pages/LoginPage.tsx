import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button, Input } from '../components/ui';
import { Mail, Lock } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login, register, resetPassword, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
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
      setErrors({ form: error.message || "Thao tác thất bại" });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      setErrors({ email: 'Vui lòng nhập email để khôi phục mật khẩu' });
      return;
    }
    
    try {
      await resetPassword(formData.email);
       
      alert('Email khôi phục mật khẩu đã được gửi!');
      setActiveTab('login');
      setErrors({});
    } catch (error: any) {
      setErrors({ form: error.message || "Không thể gửi email khôi phục" });
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
    } catch (error: any) {
      setErrors({ form: "Không tìm thấy email hoặc có lỗi xảy ra." });
    }
  };

  const handleTabChange = (tab: 'login' | 'register' | 'forgot') => {
    setActiveTab(tab);
    setErrors({});
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary-50 p-4">
      <div className="w-full max-w-[400px] bg-white rounded-xl shadow-[0_15px_30px_rgba(8,_112,_184,_0.1)] overflow-hidden transition-all">
        <div className="bg-primary-500 p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Smurfy</h1>
          <p className="text-white/80 text-xs leading-relaxed">
            {activeTab === 'forgot' 
              ? 'Nhập email để lấy lại mật khẩu'
              : <>Kết nối cùng Smurfy Web <br/> Trò chuyện & sẻ chia mọi lúc</>
            }
          </p>
        </div>

        {activeTab !== 'forgot' && (
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                activeTab === 'login' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => handleTabChange('register')}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                activeTab === 'register' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400 hover:text-gray-600'
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
                  <div className="p-2 text-xs text-green-600 bg-green-50 rounded border border-green-100 mb-2">
                    {errors.success}
                  </div>
                )}
                {errors.form && (
                  <div className="p-2 text-xs text-red-600 bg-red-50 rounded border border-red-100 mb-2">
                    {errors.form}
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 ml-1">Email đã đăng ký</label>
                  <Input
                    icon={<Mail size={16} />}
                    type="email"
                    placeholder="Nhập email của bạn"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    error={errors.email}
                    className="h-10 !ring-0 !border-gray-200 focus:!border-primary-500 shadow-sm"
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
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                  >
                    Quay lại đăng nhập
                  </button>
                </div>
             </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {errors.form && (
                <div className="p-2 text-xs text-red-600 bg-red-50 rounded border border-red-100 mb-2">
                  {errors.form}
                </div>
              )}

              {activeTab === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 ml-1">Họ tên</label>
                  <Input
                    placeholder="Nhập họ tên của bạn"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    error={errors.name}
                    className="h-10 !ring-0 !border-gray-200 focus:!border-primary-500 shadow-sm"
                  />
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 ml-1">Email</label>
                <Input
                  icon={<Mail size={16} />}
                  type="email"
                  placeholder="Nhập email của bạn"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  error={errors.email}
                  className="h-10 !ring-0 !border-gray-200 focus:!border-primary-500 shadow-sm"
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 ml-1">Mật khẩu</label>
                <Input
                  icon={<Lock size={16} />}
                  type="password"
                  placeholder="Nhập mật khẩu của bạn"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  error={errors.password}
                  className="h-10 !ring-0 !border-gray-200 focus:!border-primary-500 shadow-sm"
                />
              </div>

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
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
        
        <div className="bg-gray-50 p-3 text-center text-[10px] text-gray-400 border-t border-gray-100">
          Chấp nhận <a href="#" className="text-primary-500 hover:underline">Điều khoản & Bảo mật</a> khi sử dụng Smurfy.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;