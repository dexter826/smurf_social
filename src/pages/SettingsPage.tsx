import React, { useState, useEffect } from 'react';
import { ChevronLeft, Ban, UserCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services/userService';
import { User } from '../types';
import { UserAvatar, ConfirmDialog, Loading, Button, Skeleton } from '../components/ui';

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
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="-ml-2 md:hidden rounded-full"
          icon={<ChevronLeft size={24} className="text-text-primary" />}
        />
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
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-bg-secondary rounded-xl">
                  <Skeleton variant="circle" width={40} height={40} />
                  <div className="flex-1 space-y-2">
                    <Skeleton width={120} height={16} />
                    <Skeleton width={80} height={12} className="opacity-50" />
                  </div>
                  <Skeleton width={80} height={32} className="rounded-lg" />
                </div>
              ))}
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
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setUnblockUserId(user.id)}
                    className="gap-2 px-3 py-2 text-primary hover:bg-primary-hover hover:text-white"
                    icon={<UserCheck size={16} />}
                  >
                    <span className="hidden sm:inline">Bỏ chặn</span>
                  </Button>
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
