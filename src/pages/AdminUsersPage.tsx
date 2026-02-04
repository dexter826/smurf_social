import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Shield, 
  Lock, 
  Unlock, 
  Eye,
  CheckCircle,
  XCircle,
  Filter
} from 'lucide-react';
import { User, UserStatus } from '../types';
import { userService } from '../services/userService';
import { useAuthStore } from '../store/authStore';
import { Button, UserAvatar, ConfirmDialog, Skeleton, IconButton } from '../components/ui';
import { CONFIRM_MESSAGES } from '../constants';
import { formatRelativeTime, formatDateTime } from '../utils/dateUtils';
import { toast } from '../store/toastStore';
import { collection, getDocs, query, orderBy, limit, startAfter, where, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

type StatusFilter = 'all' | 'active' | 'banned';

const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'ban' | 'unban' | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, banned: 0 });

  const isAdmin = currentUser?.role === 'admin';

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    
    setIsLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, limit(500));
      const snapshot = await getDocs(q);
      
      const usersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          lastSeen: data.lastSeen?.toDate ? data.lastSeen.toDate() : data.lastSeen,
        } as User;
      });

      // Sắp xếp client-side theo thời gian tạo mới nhất
      usersData.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return dateB - dateA;
      });

      setUsers(usersData);
      
      // Tính stats
      const bannedCount = usersData.filter(u => u.status === UserStatus.BANNED).length;
      setStats({
        total: usersData.length,
        active: usersData.length - bannedCount,
        banned: bannedCount
      });
    } catch (error) {
      console.error('Lỗi tải danh sách users:', error);
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [isAdmin, navigate, fetchUsers]);

  const handleAction = async () => {
    if (!selectedUser || !actionType) return;
    
    setIsProcessing(true);
    try {
      if (actionType === 'ban') {
        await userService.banUser(selectedUser.id);
        toast.success(`Đã khóa tài khoản ${selectedUser.name}`);
      } else {
        await userService.unbanUser(selectedUser.id);
        toast.success(`Đã mở khóa tài khoản ${selectedUser.name}`);
      }
      await fetchUsers();
    } catch (error) {
      toast.error('Lỗi thực hiện thao tác');
    } finally {
      setIsProcessing(false);
      setSelectedUser(null);
      setActionType(null);
    }
  };

  const openConfirmDialog = (user: User, action: 'ban' | 'unban') => {
    setSelectedUser(user);
    setActionType(action);
  };

  // Lọc users theo search và status
  const filteredUsers = users.filter(user => {
    const matchSearch = !searchTerm || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'banned' && user.status === UserStatus.BANNED) ||
      (statusFilter === 'active' && user.status !== UserStatus.BANNED);
    
    return matchSearch && matchStatus;
  });

  if (!isAdmin) return null;

  const tabs = [
    { label: 'Tất cả', value: 'all', icon: <Users size={16} />, count: stats.total },
    { label: 'Hoạt động', value: 'active', icon: <CheckCircle size={16} />, count: stats.active },
    { label: 'Đã khóa', value: 'banned', icon: <Lock size={16} />, count: stats.banned },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg-secondary">
      {/* Header */}
      <div className="bg-bg-primary border-b border-border-light sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Users size={22} className="text-primary md:w-6 md:h-6" />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-bold text-text-primary uppercase tracking-tight">
                  Quản lý người dùng
                </h1>
                <p className="hidden xs:block text-[10px] md:text-xs font-medium text-text-secondary">
                  Quản lý tài khoản và trạng thái người dùng
                </p>
              </div>
            </div>
            
            <div className="flex bg-bg-secondary p-1 rounded-lg border border-border-light w-full sm:w-auto overflow-x-auto no-scrollbar">
              {tabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value as StatusFilter)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center whitespace-nowrap px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all duration-150 outline-none ring-0 ${
                    statusFilter === tab.value 
                      ? `bg-bg-primary text-primary shadow-sm` 
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {isLoading ? (
            <div className="space-y-8">
              {/* Stat Cards Skeleton */}
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-bg-primary p-3 md:p-4 rounded-xl border border-border-light shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-6 w-10" />
                  </div>
                ))}
              </div>

              {/* List Skeleton */}
              <div className="space-y-4 pt-6 border-t border-border-light">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="bg-bg-primary rounded-xl p-4 border border-border-light flex items-center gap-4">
                    <Skeleton variant="circle" width={48} height={48} />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
                {tabs.map(tab => (
                  <div 
                    key={tab.value}
                    className="bg-bg-primary p-2.5 md:p-4 rounded-xl border border-border-light shadow-sm flex flex-col gap-0.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`p-1 rounded bg-bg-secondary ${
                        tab.value === 'banned' ? 'text-error' : 
                        tab.value === 'active' ? 'text-success' : 'text-primary'
                      } shrink-0`}>
                        {React.cloneElement(tab.icon as React.ReactElement, { size: 12, className: 'md:w-[14px] md:h-[14px]' })}
                      </div>
                      <span className="text-[8px] md:text-[10px] font-bold text-text-tertiary uppercase tracking-wider truncate">
                        {tab.label}
                      </span>
                    </div>
                    <div className="text-base md:text-xl font-bold text-text-primary">{tab.count}</div>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div className="mb-6 pt-6 border-t border-border-light">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên hoặc email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-primary border border-border-light rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* User List */}
              {filteredUsers.length === 0 ? (
                <div className="text-center py-20">
                  <Users size={48} className="text-text-tertiary mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">
                    Không tìm thấy người dùng
                  </h3>
                  <p className="text-text-secondary">
                    {searchTerm ? 'Thử tìm kiếm với từ khóa khác' : 'Chưa có người dùng nào'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map(user => {
                    const isBanned = user.status === UserStatus.BANNED;
                    const isCurrentUser = user.id === currentUser?.id;
                    
                    return (
                      <div 
                        key={user.id}
                        className={`bg-bg-primary rounded-xl p-4 border border-border-light shadow-sm transition-all hover:shadow-md ${
                          isBanned ? 'bg-error/5 border-error/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <UserAvatar 
                            src={user.avatar} 
                            name={user.name} 
                            size="lg" 
                            className="shrink-0 cursor-pointer"
                            onClick={() => navigate(`/profile/${user.id}`)}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span 
                                className="font-bold text-text-primary truncate cursor-pointer hover:underline"
                                onClick={() => navigate(`/profile/${user.id}`)}
                              >
                                {user.name}
                              </span>
                              {user.role === 'admin' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary flex items-center gap-1">
                                  <Shield size={10} /> Admin
                                </span>
                              )}
                              {isBanned && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error/10 text-error flex items-center gap-1">
                                  <Lock size={10} /> Đã khóa
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-text-tertiary truncate">{user.email}</div>
                            {user.lastSeen && (
                              <div className="text-[10px] text-text-tertiary mt-1">
                                Hoạt động: {formatRelativeTime(user.lastSeen)}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <IconButton
                              icon={<Eye size={16} />}
                              size="sm"
                              title="Xem trang cá nhân"
                              onClick={() => navigate(`/profile/${user.id}`)}
                            />
                            
                            {!isCurrentUser && user.role !== 'admin' && (
                              isBanned ? (
                                <Button
                                  variant="warning"
                                  size="sm"
                                  className="!h-8 !px-3 !rounded-lg font-bold text-xs"
                                  icon={<Unlock size={14} />}
                                  onClick={() => openConfirmDialog(user, 'unban')}
                                >
                                  <span className="hidden sm:inline">Mở khóa</span>
                                </Button>
                              ) : (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  className="!h-8 !px-3 !rounded-lg font-bold text-xs"
                                  icon={<Lock size={14} />}
                                  onClick={() => openConfirmDialog(user, 'ban')}
                                >
                                  <span className="hidden sm:inline">Khóa TK</span>
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!selectedUser && !!actionType}
        onClose={() => { setSelectedUser(null); setActionType(null); }}
        onConfirm={handleAction}
        title={actionType === 'ban' ? CONFIRM_MESSAGES.ADMIN.BAN_USER.TITLE : CONFIRM_MESSAGES.ADMIN.UNBAN_USER.TITLE}
        message={actionType === 'ban' ? CONFIRM_MESSAGES.ADMIN.BAN_USER.MESSAGE : CONFIRM_MESSAGES.ADMIN.UNBAN_USER.MESSAGE}
        confirmLabel={actionType === 'ban' ? CONFIRM_MESSAGES.ADMIN.BAN_USER.CONFIRM : CONFIRM_MESSAGES.ADMIN.UNBAN_USER.CONFIRM}
        variant={actionType === 'ban' ? 'danger' : 'warning'}
        isLoading={isProcessing}
      />
    </div>
  );
};

export default AdminUsersPage;
