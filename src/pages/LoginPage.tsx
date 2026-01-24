import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components/ui';
import { Mail, Lock } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login, register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
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

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setErrors({});
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="bg-primary-500 p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Smurfy</h1>
          <p className="text-primary-100">Đăng nhập tài khoản Smurfy <br/> để kết nối với ứng dụng Smurfy Web</p>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => handleTabChange('login')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'login' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            VỚI MẬT KHẨU
          </button>
          <button
            onClick={() => handleTabChange('register')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'register' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ĐĂNG KÝ
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.form && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                {errors.form}
              </div>
            )}

            {activeTab === 'register' && (
              <Input
                placeholder="Họ tên"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                error={errors.name}
                className="h-12"
              />
            )}
            
            <Input
              icon={<Mail size={18} />}
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              error={errors.email}
              className="h-12"
              autoComplete="email"
            />
            
            <Input
              icon={<Lock size={18} />}
              type="password"
              placeholder="Mật khẩu"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              error={errors.password}
              className="h-12"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full h-12 text-lg font-semibold shadow-md mt-6"
              disabled={isLoading}
            >
              {isLoading ? 'Đang xử lý...' : (activeTab === 'login' ? 'Đăng nhập với mật khẩu' : 'Đăng ký ngay')}
            </Button>

            {activeTab === 'login' && (
              <div className="text-center mt-4">
                <a href="#" className="text-sm text-primary-600 hover:underline">Quên mật khẩu?</a>
              </div>
            )}
          </form>
        </div>
        
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-500">
          Sử dụng ứng dụng này đồng nghĩa với việc bạn đồng ý với <a href="#" className="underline">Điều khoản sử dụng</a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;