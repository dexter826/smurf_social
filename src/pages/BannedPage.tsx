import React from 'react';
import { Lock, Mail, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui';

const BannedPage: React.FC = () => {
  const logout = useAuthStore(state => state.logout);

  const handleLogout = async () => {
    await logout();
    window.location.href = '#/login';
  };

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
      <div className="bg-bg-primary rounded-2xl shadow-lg border border-border-light max-w-md w-full p-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={40} className="text-error" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-text-primary mb-3">
          TÀI KHOẢN ĐÃ BỊ KHÓA
        </h1>

        {/* Description */}
        <p className="text-text-secondary mb-6">
          Tài khoản của bạn đã bị khóa do vi phạm quy tắc cộng đồng của Smurfy.
        </p>

        {/* Divider */}
        <div className="border-t border-border-light my-6" />

        {/* Appeal Section */}
        <div className="text-left bg-bg-secondary rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
            <Mail size={18} className="text-primary" />
            Khiếu nại quyết định
          </h3>
          <p className="text-sm text-text-secondary mb-3">
            Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ với chúng tôi:
          </p>
          <a 
            href="mailto:support@smurfy.com"
            className="text-primary font-medium hover:underline text-sm flex items-center gap-1.5"
          >
            <Mail size={14} />
            support@smurfy.com
          </a>
        </div>

        {/* Logout Button */}
        <Button
          variant="danger"
          className="w-full"
          icon={<LogOut size={18} />}
          onClick={handleLogout}
        >
          Đăng xuất
        </Button>
      </div>
    </div>
  );
};

export default BannedPage;
