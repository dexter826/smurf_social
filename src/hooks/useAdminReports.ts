import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Report, ReportStatus, ReportType, User } from '../types';
import { reportService } from '../services/reportService';
import { useAuthStore } from '../store/authStore';
import { useUserCache } from '../store/userCacheStore';
import { toast } from '../store/toastStore';
import { PAGINATION } from '../constants';

interface Stats {
  pending: number;
  resolved: number;
  rejected: number;
  orphaned: number;
}

export function useAdminReports() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { users: userCache, fetchUsers } = useUserCache();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'pending'>('pending');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
  const [stats, setStats] = useState<Stats>({ pending: 0, resolved: 0, rejected: 0, orphaned: 0 });
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionType, setActionType] = useState<'resolve' | 'reject' | null>(null);

  // Chặn truy cập phi admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Bạn không có quyền truy cập trang này');
      navigate('/');
    }
  }, [user, navigate]);

  // Realtime subscription cho reports
  useEffect(() => {
    if (user?.role !== 'admin') return;
    
    setIsLoading(true);
    
    const unsubscribe = reportService.subscribeToReports(
      (allReports) => {
        // Tính stats từ tất cả reports
        setStats({
          pending: allReports.filter(r => r.status === ReportStatus.PENDING).length,
          resolved: allReports.filter(r => r.status === ReportStatus.RESOLVED).length,
          rejected: allReports.filter(r => r.status === ReportStatus.REJECTED).length,
          orphaned: allReports.filter(r => r.status === ReportStatus.ORPHANED).length
        });

        // Lọc theo status filter
        let filtered = statusFilter === 'pending'
          ? allReports.filter(r => r.status === ReportStatus.PENDING)
          : allReports.filter(r => r.status === statusFilter);

        // Lọc theo type filter
        if (typeFilter !== 'all') {
          filtered = filtered.filter(r => r.targetType === typeFilter);
        }

        setReports(filtered);
        setIsLoading(false);

        // Fetch user info từ cache
        const userIds = [...new Set([
          ...filtered.map(r => r.reporterId),
          ...filtered.map(r => r.targetOwnerId)
        ])];
        fetchUsers(userIds);
      },
      undefined,
      PAGINATION.ADMIN_REPORTS
    );

    return () => unsubscribe();
  }, [user, statusFilter, typeFilter, fetchUsers]);

  // Lấy user info từ cache
  const getUser = useCallback((id: string): User | undefined => {
    return userCache[id];
  }, [userCache]);

  // Xử lý action (resolve/reject)
  const handleAction = useCallback(async () => {
    if (!selectedReport || !actionType || !user) return;
    
    setIsProcessing(true);
    try {
      if (actionType === 'resolve') {
        await reportService.resolveReport(selectedReport.id, user.id);
        toast.success('Đã xử lý báo cáo và xóa nội dung vi phạm');
      } else {
        await reportService.rejectReport(selectedReport.id, user.id);
        toast.success('Đã từ chối báo cáo');
      }
    } catch (error) {
      toast.error('Lỗi xử lý báo cáo');
    } finally {
      setIsProcessing(false);
      setSelectedReport(null);
      setActionType(null);
    }
  }, [selectedReport, actionType, user]);

  // Open confirm dialog
  const openConfirmDialog = useCallback((report: Report, action: 'resolve' | 'reject') => {
    setSelectedReport(report);
    setActionType(action);
  }, []);

  // Close confirm dialog
  const closeConfirmDialog = useCallback(() => {
    setSelectedReport(null);
    setActionType(null);
  }, []);

  return {
    // State
    reports,
    stats,
    isLoading,
    isProcessing,
    statusFilter,
    typeFilter,
    selectedReport,
    actionType,
    isAdmin: user?.role === 'admin',
    
    // Actions
    setStatusFilter,
    setTypeFilter,
    getUser,
    handleAction,
    openConfirmDialog,
    closeConfirmDialog
  };
}
