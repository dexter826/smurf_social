import React, { useState, useEffect } from 'react';
import { ChevronLeft, Ban, UserCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services/userService';
import { User } from '../types';
import { UserAvatar, ConfirmDialog, Loading } from '../components/ui';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockUserId, setUnblockUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      if (!currentUser?.blockedUserIds?.length) {
        setBlockedUsers([]);
        setIsLoading(false);
        return;
      }

      try {
        const users = await Promise.all(
          currentUser.blockedUserIds.map(id => userService.getUserById(id))
        );
        setBlockedUsers(users.filter((u): u is User => u !== null));
      } catch (error) {
        console.error("Lỗi lấy danh sách chặn", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlockedUsers();
  }, [currentUser?.blockedUserIds]);

  const handleUnblock = async () => {
    if (!unblockUserId || !currentUser) return;
    
    try {
      await userService.unblockUser(currentUser.id, unblockUserId);
      setBlockedUsers(prev => prev.filter(u => u.id !== unblockUserId));
    } catch (error) {
      console.error("Lỗi bỏ chặn", error);
    } finally {
      setUnblockUserId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border-light bg-bg-primary">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-bg-hover rounded-full transition-colors md:hidden"
        >
          <ChevronLeft size={24} className="text-text-primary" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Cài đặt</h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Blocked Users Section */}
        <section className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Ban size={20} className="text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">
              Người dùng đã chặn
            </h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loading size={32} />
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              <Ban size={48} className="mx-auto mb-3 opacity-30" />
              <p>Chưa có người dùng nào bị chặn</p>
            </div>
          ) : (
            <div className="space-y-2">
              {blockedUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 bg-bg-secondary rounded-xl hover:bg-bg-hover transition-colors"
                >
                  <UserAvatar 
                    userId={user.id}
                    src={user.avatar} 
                    name={user.name} 
                    size="md" 
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text-primary truncate">
                      {user.name}
                    </h3>
                    <p className="text-sm text-text-tertiary truncate">
                      @{user.username || user.email?.split('@')[0]}
                    </p>
                  </div>
                  <button
                    onClick={() => setUnblockUserId(user.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary-light hover:bg-primary hover:text-white rounded-lg transition-colors"
                  >
                    <UserCheck size={16} />
                    <span className="hidden sm:inline">Bỏ chặn</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Unblock Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!unblockUserId}
        onClose={() => setUnblockUserId(null)}
        onConfirm={handleUnblock}
        title="Bỏ chặn người dùng"
        message="Bạn có chắc chắn muốn bỏ chặn người này? Họ sẽ có thể gửi tin nhắn cho bạn."
        confirmLabel="Bỏ chặn"
      />
    </div>
  );
};

export default SettingsPage;
