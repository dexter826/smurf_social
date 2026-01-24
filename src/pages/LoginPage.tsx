import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components/Shared';
import { Smartphone, Lock } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({ phone: '', password: '', name: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login();
    navigate('/');
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
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'login' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            VỚI MẬT KHẨU
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'register' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ĐĂNG KÝ
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'register' && (
              <Input
                placeholder="Họ tên"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="h-12"
              />
            )}
            
            <Input
              icon={<Smartphone size={18} />}
              placeholder="Số điện thoại"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="h-12"
            />
            
            <Input
              icon={<Lock size={18} />}
              type="password"
              placeholder="Mật khẩu"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="h-12"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full h-12 text-lg font-semibold shadow-md"
              disabled={isLoading}
            >
              {isLoading ? 'Đang xử lý...' : (activeTab === 'login' ? 'Đăng nhập với mật khẩu' : 'Đăng ký ngay')}
            </Button>

            {activeTab === 'login' && (
              <div className="text-center">
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