import React from 'react';
import { Shield, Flag, CheckCircle, XCircle, Clock, Eye, AlertTriangle, FileText, MessageSquare, FileX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ReportStatus, ReportType } from '../types';
import { Button, UserAvatar, ConfirmDialog, Skeleton } from '../components/ui';
import { REPORT_CONFIG } from '../constants';
import { formatRelativeTime, formatDateTime } from '../utils/dateUtils';
import { useAdminReports } from '../hooks/useAdminReports';

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
    case ReportStatus.ORPHANED:
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-text-tertiary/10 text-text-tertiary flex items-center gap-1"><FileX size={10} /> Đã xóa</span>;
  }
};

const AdminReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    reports,
    stats,
    isLoading,
    isProcessing,
    statusFilter,
    typeFilter,
    selectedReport,
    actionType,
    isAdmin,
    setStatusFilter,
    setTypeFilter,
    getUser,
    handleAction,
    openConfirmDialog,
    closeConfirmDialog
  } = useAdminReports();

  if (!isAdmin) return null;

  const tabs = [
    { label: 'Chờ xử lý', value: 'pending', color: 'warning', icon: <Clock size={16} />, count: stats.pending },
    { label: 'Đã xử lý', value: ReportStatus.RESOLVED, color: 'success', icon: <CheckCircle size={16} />, count: stats.resolved },
    { label: 'Từ chối', value: ReportStatus.REJECTED, color: 'error', icon: <XCircle size={16} />, count: stats.rejected },
    { label: 'Đã xóa', value: ReportStatus.ORPHANED, color: 'tertiary', icon: <FileX size={16} />, count: stats.orphaned || 0 }
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg-secondary">
      {/* Header */}
      <div className="bg-bg-primary border-b border-border-light sticky top-0 z-10 transition-all duration-200">
        <div className="max-w-4xl mx-auto px-4 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Shield size={22} className="text-primary md:w-6 md:h-6" />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-bold text-text-primary uppercase tracking-tight">Quản trị báo cáo</h1>
                <p className="hidden xs:block text-[10px] md:text-xs font-medium text-text-secondary">
                  Kiểm duyệt nội dung vi phạm cộng đồng
                </p>
              </div>
            </div>
            
            <div className="flex bg-bg-secondary p-1 rounded-lg border border-border-light w-full sm:w-auto overflow-x-auto no-scrollbar">
              {tabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value as any)}
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
            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
              {tabs.map(tab => (
                <div 
                  key={tab.value}
                  className="bg-bg-primary p-3 md:p-6 rounded-xl border border-border-light shadow-sm flex flex-col gap-0.5 md:gap-1"
                >
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <div className={`p-1 rounded bg-bg-secondary text-${tab.color} shrink-0`}>
                      {React.cloneElement(tab.icon as React.ReactElement, { size: 14 })}
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold text-text-tertiary uppercase tracking-wider truncate">{tab.label}</span>
                  </div>
                  <div className="text-lg md:text-2xl font-bold text-text-primary">{tab.count}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pt-6 border-t border-border-light">
              <h2 className="text-sm md:text-base font-bold text-text-primary">
                Danh sách báo cáo
              </h2>

              <div className="flex items-center gap-1 bg-bg-secondary p-1 rounded-lg border border-border-light overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`flex-1 md:flex-initial px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-bold rounded-md whitespace-nowrap transition-all outline-none ring-0 ${
                    typeFilter === 'all' ? 'bg-bg-primary text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setTypeFilter(ReportType.POST)}
                  className={`flex-1 md:flex-initial px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-bold rounded-md whitespace-nowrap transition-all outline-none ring-0 ${
                    typeFilter === ReportType.POST ? 'bg-bg-primary text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Bài viết
                </button>
                <button
                  onClick={() => setTypeFilter(ReportType.COMMENT)}
                  className={`flex-1 md:flex-initial px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-bold rounded-md whitespace-nowrap transition-all outline-none ring-0 ${
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
              const reporter = getUser(report.reporterId);
              const target = getUser(report.targetOwnerId);
              const reasonConfig = REPORT_CONFIG.REASONS[report.reason as keyof typeof REPORT_CONFIG.REASONS];
              
              return (
                <div 
                  key={report.id}
                  className="bg-bg-primary rounded-xl p-5 border border-border-light shadow-sm transition-all duration-200"
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(report.status)}
                      <span className="flex items-center gap-1 text-[10px] md:text-xs text-text-secondary bg-bg-secondary px-2 py-0.5 rounded-full border border-border-light">
                        {getTypeIcon(report.targetType)}
                        {getTypeLabel(report.targetType)}
                      </span>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5 select-none text-text-tertiary">
                      <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-tight">
                        {formatRelativeTime(report.createdAt)}
                      </span>
                      <span className="hidden sm:block text-[9px] md:text-[10px] opacity-60">
                        {formatDateTime(report.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="mb-3 p-2.5 md:p-3 bg-bg-secondary/50 rounded-lg border border-border-light flex items-start gap-2.5">
                    <AlertTriangle size={14} className="text-error shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5 md:flex-row md:items-baseline md:gap-2">
                      <span className="text-xs font-bold text-error whitespace-nowrap">{reasonConfig?.label}</span>
                      <span className="text-[10px] md:text-[11px] text-text-secondary">{reasonConfig?.description}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {report.description && (
                    <p className="text-xs md:text-sm text-text-secondary mb-4 p-3 bg-bg-secondary/30 rounded-lg italic border border-dashed border-border-light">
                      "{report.description}"
                    </p>
                  )}

                  {/* Users info */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-[11px] md:text-xs text-text-secondary mb-4 p-2 bg-bg-secondary/20 rounded-lg">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <UserAvatar size="xs" src={reporter?.avatar} name={reporter?.name} />
                      <span className="truncate"><strong>{reporter?.name || 'Unknown'}</strong> báo cáo</span>
                    </div>
                    <span className="hidden sm:block opacity-40">→</span>
                    <div className="flex items-center gap-2 overflow-hidden border-t sm:border-t-0 pt-2 sm:pt-0 border-border-light/10">
                      <UserAvatar size="xs" src={target?.avatar} name={target?.name} />
                      <span className="truncate"><strong>{target?.name || 'Unknown'}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  {report.status === ReportStatus.PENDING && (
                    <div className="flex flex-row items-center gap-2 pt-4 border-t border-border-light">
                      <div className="flex gap-2 mr-auto">
                        <Button
                          variant="primary"
                          size="sm"
                          className="!h-9 !rounded-lg font-bold text-xs !gap-0 sm:!gap-2"
                          icon={<CheckCircle size={14} />}
                          onClick={() => openConfirmDialog(report, 'resolve')}
                        >
                          <span className="hidden sm:inline">Xử lý</span>
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="!h-9 !rounded-lg font-bold text-xs !gap-0 sm:!gap-2"
                          icon={<XCircle size={14} />}
                          onClick={() => openConfirmDialog(report, 'reject')}
                        >
                          <span className="hidden sm:inline">Từ chối</span>
                        </Button>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Eye size={14} />}
                        className="!h-9 !rounded-lg text-xs"
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
                        className="!h-9 !rounded-lg text-xs font-bold"
                        icon={<Eye size={14} />}
                        onClick={() => navigate(`/admin/reports/${report.id}`)}
                      >
                        Chi tiết báo cáo
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
        onClose={closeConfirmDialog}
        onConfirm={handleAction}
        title={actionType === 'resolve' ? 'Xử lý báo cáo' : 'Từ chối báo cáo'}
        message={
          actionType === 'resolve'
            ? 'Xác nhận xử lý? Nội dung vi phạm sẽ bị XÓA và người dùng sẽ nhận được cảnh cáo.'
            : 'Xác nhận từ chối? Nội dung sẽ được giữ nguyên.'
        }
        confirmLabel={actionType === 'resolve' ? 'Xử lý' : 'Từ chối'}
        variant={actionType === 'resolve' ? 'danger' : 'primary'}
        isLoading={isProcessing}
      />
    </div>
  );
};

export default AdminReportsPage;
