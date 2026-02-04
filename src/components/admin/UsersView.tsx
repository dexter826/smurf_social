import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Lock, 
  Unlock, 
  Eye,
  CheckCircle,
  Plus,
  Shield
} from 'lucide-react';
import { User, UserStatus } from '../../types';
import { userService } from '../../services/userService';
import { Button, UserAvatar, Skeleton, IconButton, Select, Input } from '../ui';
import { toast } from '../../store/toastStore';
import { useNavigate } from 'react-router-dom';

export const UsersView: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');

  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Đang hoạt động' },
    { value: 'banned', label: 'Đã khóa' },
  ];

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = userService.subscribeToAdminUsers(undefined, (fetchedUsers) => {
      setUsers(fetchedUsers);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchSearch = !searchTerm || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'banned' && user.status === UserStatus.BANNED) ||
      (statusFilter === 'active' && user.status !== UserStatus.BANNED);
    
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search & Stats Header */}
      <div className="bg-bg-primary p-4 border-b border-border-light space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Tìm kiếm tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={18} />}
              containerClassName="bg-bg-secondary border-border-light h-11"
              className="bg-transparent"
            />
          </div>
          
          <div className="flex-1 sm:flex-initial min-w-[160px]">
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              options={statusOptions}
            />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto bg-bg-secondary/30 p-4 md:p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isLoading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="bg-bg-primary p-4 rounded-2xl border border-border-light flex items-center gap-4">
                <Skeleton variant="circle" width={48} height={48} />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))
          ) : filteredUsers.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-bg-primary rounded-2xl border border-border-light border-dashed">
               <Users size={48} className="mx-auto text-text-tertiary opacity-20 mb-4" />
               <p className="text-text-secondary font-medium">Không tìm thấy người dùng</p>
            </div>
          ) : (
            filteredUsers.map(user => (
              <div 
                key={user.id}
                className="bg-bg-primary p-3 rounded-xl border border-border-light shadow-sm hover:border-primary/20 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <UserAvatar 
                    src={user.avatar} 
                    name={user.name} 
                    size="sm" 
                    className="shrink-0"
                    onClick={() => navigate(`/profile/${user.id}`)}
                  />
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-text-primary truncate">{user.name}</span>
                      {user.role === 'admin' && <Shield size={10} className="text-primary" />}
                    </div>
                    <div className="text-[10px] text-text-tertiary truncate">{user.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <IconButton
                    icon={<Eye size={14} />}
                    onClick={() => navigate(`/profile/${user.id}`)}
                    variant="ghost"
                    size="sm"
                  />
                  {user.status === UserStatus.BANNED ? (
                    <div className="p-1 text-error" title="Đã khóa">
                      <Lock size={14} />
                    </div>
                  ) : (
                    <div className="p-1 text-success" title="Hoạt động">
                      <CheckCircle size={14} />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
