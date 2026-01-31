import React, { useState, useEffect } from 'react';
import { Shield, Flag, CheckCircle, XCircle, Clock, Eye, AlertTriangle, FileText, MessageSquare, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Report, ReportStatus, ReportType, User } from '../types';
import { reportService } from '../services/reportService';
import { userService } from '../services/userService';
import { Button, UserAvatar, ConfirmDialog, Skeleton } from '../components/ui';
import { REPORT_CONFIG } from '../constants';
import { formatRelativeTime, formatDateTime } from '../utils/dateUtils';
import { toast } from '../store/toastStore';

const AdminReportsPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionType, setActionType] = useState<'resolve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    resolved: 0,
    rejected: 0
  });

  // Chặn truy cập phi admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Bạn không có quyền truy cập trang này');
      navigate('/');
    }
  }, [user, navigate]);

  // Đồng bộ dữ liệu báo cáo
  useEffect(() => {
    if (user?.role !== 'admin') return;
    
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const data = statusFilter === 'all' 
          ? await reportService.getAllReports()
          : await reportService.getPendingReports();
        
        // Tính toán thống kê từ dữ liệu gốc trước khi lọc type
        const allReports = statusFilter === 'all' ? data : await reportService.getAllReports(200);
        setStats({
          pending: allReports.filter(r => r.status === ReportStatus.PENDING).length,
          resolved: allReports.filter(r => r.status === ReportStatus.RESOLVED).length,
          rejected: allReports.filter(r => r.status === ReportStatus.REJECTED).length
        });

        // Lọc theo type nếu cần
        const filteredData = typeFilter === 'all' 
          ? data 
          : data.filter(r => r.targetType === typeFilter);

        setReports(filteredData);

        // Fetch thông tin users
        const userIds = [...new Set([
          ...filteredData.map(r => r.reporterId),
          ...filteredData.map(r => r.targetOwnerId)
        ])];
        const usersData: Record<string, User> = {};
        await Promise.all(userIds.map(async (id) => {
          const userData = await userService.getUserById(id);
          if (userData) usersData[id] = userData;
        }));
        setUsers(usersData);
      } catch (error) {
        toast.error('Lỗi tải danh sách báo cáo');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [user, statusFilter, typeFilter]);

  const handleAction = async () => {
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
      
      // Cập nhật local state
      setReports(prev => prev.map(r => 
        r.id === selectedReport.id 
          ? { ...r, status: actionType === 'resolve' ? ReportStatus.RESOLVED : ReportStatus.REJECTED }
          : r
      ));
    } catch (error) {
      toast.error('Lỗi xử lý báo cáo');
    } finally {
      setIsProcessing(false);
      setSelectedReport(null);
      setActionType(null);
    }
  };

  const getTypeIcon = (type: ReportType) => {
    switch (type) {
      case ReportType.POST: return <FileText size={14} />;
      case ReportType.COMMENT: return <MessageSquare size={14} />;
      default: return <Flag size={14} />;
    }
  };

  const getTypeLabel = (type: ReportType) => {
    switch (type) {
      case ReportType.POST: return 'Bài viết';
      case ReportType.COMMENT: return 'Bình luận';
      default: return 'Khác';
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.PENDING:
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning flex items-center gap-1"><Clock size={10} /> Chờ xử lý</span>;
      case ReportStatus.RESOLVED:
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success flex items-center gap-1"><CheckCircle size={10} /> Đã xử lý</span>;
      case ReportStatus.REJECTED:
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-text-secondary/10 text-text-secondary flex items-center gap-1"><XCircle size={10} /> Từ chối</span>;
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  const tabs = [
    { label: 'Chờ xử lý', value: 'pending', color: 'warning', icon: <Clock size={16} />, count: stats.pending },
    { label: 'Đã xử lý', value: ReportStatus.RESOLVED, color: 'success', icon: <CheckCircle size={16} />, count: stats.resolved },
    { label: 'Từ chối', value: ReportStatus.REJECTED, color: 'error', icon: <XCircle size={16} />, count: stats.rejected }
  ];

  const pendingCount = reports.filter(r => r.status === ReportStatus.PENDING).length;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg-secondary">
      {/* Header */}
      <div className="bg-bg-primary border-b border-border-light sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield size={24} className="text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-text-primary uppercase tracking-tight">Hệ thống báo cáo</h1>
                <p className="text-xs font-medium text-text-secondary">
                  Quản lý nội dung vi phạm cộng đồng
                </p>
              </div>
            </div>
            
            <div className="flex bg-bg-secondary p-1 rounded-lg border border-border-light">
              {tabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value as any)}
                  className={`flex items-center px-4 py-1.5 rounded-md text-sm font-bold transition-colors duration-150 outline-none ring-0 ${
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-bg-primary p-6 rounded-xl border border-border-light shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-8 w-12" />
                </div>
              ))}
            </div>

            {/* List Skeleton */}
            <div className="space-y-4 pt-6 border-t border-border-light">
              <Skeleton className="h-6 w-40 mb-6" />
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-bg-primary rounded-xl p-5 border border-border-light space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <Skeleton variant="circle" width={40} height={40} />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Stat Cards - Static Display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              {tabs.map(tab => (
                <div 
                  key={tab.value}
                  className="bg-bg-primary p-6 rounded-xl border border-border-light shadow-sm flex flex-col gap-1"
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded bg-bg-secondary text-${tab.color}`}>
                      {tab.icon}
                    </div>
                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{tab.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-text-primary">{tab.count}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-6 border-t border-border-light">
              <h2 className="text-base font-bold text-text-primary">
                Danh sách báo cáo
              </h2>

              <div className="flex items-center gap-1 bg-bg-secondary p-1 rounded-lg border border-border-light">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all outline-none ring-0 ${
                    typeFilter === 'all' ? 'bg-bg-primary text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setTypeFilter(ReportType.POST)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all outline-none ring-0 ${
                    typeFilter === ReportType.POST ? 'bg-bg-primary text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Bài viết
                </button>
                <button
                  onClick={() => setTypeFilter(ReportType.COMMENT)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all outline-none ring-0 ${
                    typeFilter === ReportType.COMMENT ? 'bg-bg-primary text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Bình luận
                </button>
              </div>
            </div>

            {reports.length === 0 ? (
          <div className="text-center py-20">
            <Flag size={48} className="text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Không có báo cáo</h3>
            <p className="text-text-secondary">Chưa có báo cáo nào {statusFilter === 'pending' ? 'đang chờ xử lý' : ''}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => {
              const reporter = users[report.reporterId];
              const target = users[report.targetOwnerId];
              const reasonConfig = REPORT_CONFIG.REASONS[report.reason as keyof typeof REPORT_CONFIG.REASONS];
              
              return (
                <div 
                  key={report.id}
                  className="bg-bg-primary rounded-xl p-5 border border-border-light shadow-sm transition-all duration-200"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(report.status)}
                      <span className="flex items-center gap-1 text-xs text-text-secondary bg-bg-secondary px-2 py-0.5 rounded-full">
                        {getTypeIcon(report.targetType)}
                        {getTypeLabel(report.targetType)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 select-none">
                      <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-tight">
                        {formatRelativeTime(report.createdAt)}
                      </span>
                      <span className="text-[10px] text-text-tertiary opacity-60">
                        {formatDateTime(report.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="flex items-center gap-2 mb-3 p-2 bg-bg-secondary rounded-lg border border-border-light">
                    <AlertTriangle size={14} className="text-error" />
                    <span className="text-xs font-bold text-error">{reasonConfig?.label}</span>
                    <span className="text-[11px] text-text-secondary"> - {reasonConfig?.description}</span>
                  </div>

                  {/* Description */}
                  {report.description && (
                    <p className="text-sm text-text-secondary mb-3 p-2 bg-bg-secondary rounded-lg italic">
                      "{report.description}"
                    </p>
                  )}

                  {/* Users info */}
                  <div className="flex items-center gap-4 text-xs text-text-secondary mb-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar size="xs" src={reporter?.avatar} name={reporter?.name} />
                      <span><strong>{reporter?.name || 'Unknown'}</strong> báo cáo</span>
                    </div>
                    <span>→</span>
                    <div className="flex items-center gap-2">
                      <UserAvatar size="xs" src={target?.avatar} name={target?.name} />
                      <span><strong>{target?.name || 'Unknown'}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  {report.status === ReportStatus.PENDING && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-border-light">
                      <Button
                        variant="primary"
                        size="sm"
                        className="!rounded-lg font-bold"
                        icon={<CheckCircle size={14} />}
                        onClick={() => {
                          setSelectedReport(report);
                          setActionType('resolve');
                        }}
                      >
                        Xử lý
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="!rounded-lg font-bold"
                        icon={<XCircle size={14} />}
                        onClick={() => {
                          setSelectedReport(report);
                          setActionType('reject');
                        }}
                      >
                        Từ chối
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Eye size={14} />}
                        className="ml-auto !rounded-lg"
                        onClick={() => navigate(`/admin/reports/${report.id}`)}
                      >
                        Chi tiết
                      </Button>
                    </div>
                  )}
                  {report.status !== ReportStatus.PENDING && (
                    <div className="flex justify-end pt-4 border-t border-border-light">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="!rounded-lg"
                        icon={<Eye size={14} />}
                        onClick={() => navigate(`/admin/reports/${report.id}`)}
                      >
                        Xem chi tiết
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </>
      )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!selectedReport && !!actionType}
        onClose={() => {
          setSelectedReport(null);
          setActionType(null);
        }}
        onConfirm={handleAction}
        title={actionType === 'resolve' ? 'Xử lý báo cáo' : 'Từ chối báo cáo'}
        message={
          actionType === 'resolve'
            ? 'Xác nhận xử lý? Nội dung vi phạm sẽ bị XÓA và người dùng sẽ nhận được cảnh cáo.'
            : 'Xác nhận từ chối? Nội dung sẽ được giữ nguyên.'
        }
        confirmLabel={actionType === 'resolve' ? 'Xử lý' : 'Từ chối'}
        variant={actionType === 'resolve' ? 'danger' : 'primary'}
      />
    </div>
  );
};

export default AdminReportsPage;
