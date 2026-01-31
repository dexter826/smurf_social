import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User as UserIcon, 
  FileText, 
  MessageSquare,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Report, ReportStatus, ReportType, User, Post, Comment } from '../types';
import { reportService } from '../services/reportService';
import { userService } from '../services/userService';
import { postService } from '../services/postService';
import { commentService } from '../services/commentService';
import { Button, UserAvatar, ConfirmDialog, Skeleton } from '../components/ui';
import { REPORT_CONFIG } from '../constants';
import { formatRelativeTime, formatDateTime } from '../utils/dateUtils';
import { toast } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';

const ReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const [report, setReport] = useState<Report | null>(null);
  const [reporter, setReporter] = useState<User | null>(null);
  const [targetOwner, setTargetOwner] = useState<User | null>(null);
  const [content, setContent] = useState<Post | Comment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionType, setActionType] = useState<'resolve' | 'reject' | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchDetail = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const reportData = await reportService.getReportById(id);
        if (!reportData) {
          toast.error('Không tìm thấy báo cáo');
          navigate('/admin/reports');
          return;
        }
        setReport(reportData);

        const [reporterData, ownerData] = await Promise.all([
          userService.getUserById(reportData.reporterId),
          userService.getUserById(reportData.targetOwnerId)
        ]);
        setReporter(reporterData);
        setTargetOwner(ownerData);

        if (reportData.targetType === ReportType.POST) {
          const postData = await postService.getPostByIdForAdmin(reportData.targetId);
          setContent(postData);
        } else {
          const commentData = await commentService.getCommentById(reportData.targetId);
          setContent(commentData);
        }
      } catch (error) {
        toast.error('Lỗi tải thông tin chi tiết');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [id, currentUser, navigate]);

  const handleAction = async () => {
    if (!report || !actionType || !currentUser) return;
    
    setIsProcessing(true);
    try {
      if (actionType === 'resolve') {
        await reportService.resolveReport(report.id, currentUser.id);
        toast.success('Đã xử lý và xóa nội dung vi phạm');
      } else {
        await reportService.rejectReport(report.id, currentUser.id);
        toast.success('Đã từ chối báo cáo');
      }
      navigate('/admin/reports');
    } catch (error) {
      toast.error('Lỗi thực hiện thao tác');
    } finally {
      setIsProcessing(false);
      setShowConfirm(false);
    }
  };

  const getStatusLabel = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.PENDING: return 'Chờ xử lý';
      case ReportStatus.RESOLVED: return 'Đã xử lý';
      case ReportStatus.REJECTED: return 'Đã từ chối';
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    const label = getStatusLabel(status);
    switch (status) {
      case ReportStatus.PENDING:
        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-warning/5 text-warning outline-none ring-0">{label}</span>;
      case ReportStatus.RESOLVED:
        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-success/5 text-success outline-none ring-0">{label}</span>;
      case ReportStatus.REJECTED:
        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-text-secondary/5 text-text-secondary outline-none ring-0">{label}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-bg-secondary overflow-hidden">
        {/* Sticky Header Skeleton */}
        <div className="bg-bg-primary border-b border-border-light h-16 flex items-center shrink-0">
          <div className="max-w-4xl mx-auto w-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
            {/* Profiles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-bg-primary p-5 rounded-xl border border-border-light shadow-sm flex items-center gap-3">
                <Skeleton variant="circle" width={48} height={48} />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="bg-bg-primary p-5 rounded-xl border border-border-light shadow-sm flex items-center gap-3">
                <Skeleton variant="circle" width={48} height={48} />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>

            {/* Main Content Box Skeleton */}
            <div className="bg-bg-primary rounded-xl border border-border-light shadow-sm overflow-hidden divide-y divide-border-light">
              <div className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20 rounded" />
                    <Skeleton className="h-5 w-32 rounded" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                <Skeleton className="h-4 w-24 pt-1" />
              </div>
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <Skeleton variant="circle" width={40} height={40} />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-[90%]" />
                  <Skeleton className="h-6 w-[70%]" />
                </div>
                <Skeleton className="aspect-video w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const reasonConfig = REPORT_CONFIG.REASONS[report.reason as keyof typeof REPORT_CONFIG.REASONS];

  return (
    <div className="h-full flex flex-col bg-bg-secondary overflow-y-auto">
      {/* Header */}
      <div className="bg-bg-primary border-b border-border-light sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/admin/reports')}
              className="p-2 hover:bg-bg-secondary rounded-lg transition-colors border border-transparent hover:border-border-light focus:outline-none ring-0"
            >
              <ArrowLeft size={20} className="text-text-secondary" />
            </button>
            <div>
              <h1 className="text-base font-bold text-text-primary">
                Chi tiết báo cáo
              </h1>
            </div>
          </div>

          <div className="flex gap-2">
            {report.status === ReportStatus.PENDING && (
              <>
                <Button
                  variant="danger"
                  size="sm"
                  className="!rounded-lg font-bold focus:outline-none ring-0"
                  icon={<XCircle size={14} />}
                  onClick={() => { setActionType('reject'); setShowConfirm(true); }}
                >
                  Từ chối
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="!rounded-lg font-bold focus:outline-none ring-0"
                  icon={<CheckCircle size={14} />}
                  onClick={() => { setActionType('resolve'); setShowConfirm(true); }}
                >
                  Xử lý
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 py-8">
        <div className="space-y-6">
          
          {/* Ưu tiên hiển thị thông tin đối tượng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Reporter Profile */}
            <div 
              onClick={() => reporter && navigate(`/profile/${reporter.id}`)}
              className="bg-bg-primary p-5 rounded-xl border border-border-light shadow-sm space-y-4 cursor-pointer hover:bg-bg-secondary/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Người báo cáo</h4>
                <ExternalLink size={14} className="text-text-tertiary group-hover:text-primary transition-colors" />
              </div>
              <div className="flex items-center gap-3">
                <UserAvatar src={reporter?.avatar} name={reporter?.name} size="md" />
                <div className="overflow-hidden">
                  <div className="text-sm font-bold text-text-primary truncate">{reporter?.name}</div>
                  <div className="text-xs text-text-tertiary truncate">{reporter?.email}</div>
                </div>
              </div>
            </div>

            {/* Target Owner Profile */}
            <div 
              onClick={() => targetOwner && navigate(`/profile/${targetOwner.id}`)}
              className="bg-bg-primary p-5 rounded-xl border border-border-light shadow-sm space-y-4 cursor-pointer hover:bg-bg-secondary/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Người bị báo cáo</h4>
                <ExternalLink size={14} className="text-text-tertiary group-hover:text-primary transition-colors" />
              </div>
              <div className="flex items-center gap-3">
                <UserAvatar src={targetOwner?.avatar} name={targetOwner?.name} size="md" />
                <div className="overflow-hidden">
                  <div className="text-sm font-bold text-text-primary truncate">{targetOwner?.name}</div>
                  <div className="text-xs text-text-tertiary truncate">{targetOwner?.email}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Info Box */}
          <div className="bg-bg-primary rounded-xl border border-border-light shadow-sm divide-y divide-border-light overflow-hidden">
            {/* Chi tiết nội dung báo cáo */}
            <div className="px-6 py-4 bg-bg-secondary/20 flex items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  {getStatusBadge(report.status)}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-error bg-bg-secondary px-2 py-0.5 rounded border border-border-light">
                    <AlertTriangle size={14} />
                    {reasonConfig?.label}
                  </div>
                </div>
                {report.description && (
                  <div className="text-sm text-text-secondary bg-bg-secondary/30 p-3 rounded-lg border border-border-light italic">
                    "{report.description}"
                  </div>
                )}
              </div>
              <div className="text-[10px] font-bold text-text-tertiary flex flex-col items-end gap-0.5 pt-1 uppercase tracking-wider">
                <span>{formatRelativeTime(report.createdAt)}</span>
                <span className="opacity-70">{formatDateTime(report.createdAt)}</span>
              </div>
            </div>

            <div className="p-8">
              {!content ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-border-light bg-bg-secondary/10">
                  <Trash2 size={40} className="mx-auto text-text-tertiary opacity-30 mb-3" />
                  <p className="text-sm font-bold text-text-secondary">Nội dung này không còn tồn tại</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Author Header */}
                  <div className="flex items-center gap-3">
                    <UserAvatar src={targetOwner?.avatar} name={targetOwner?.name} size="md" />
                    <div>
                      <div className="text-sm font-bold text-text-primary">{targetOwner?.name}</div>
                      <div className="text-xs text-text-tertiary">{formatRelativeTime((content as any).timestamp)} ({formatDateTime((content as any).timestamp)})</div>
                    </div>
                  </div>

                  {/* Body Text */}
                  <div className="text-lg text-text-primary leading-relaxed font-medium whitespace-pre-wrap">
                    {content.content}
                  </div>

                  {/* Media Carousel */}
                  {(() => {
                    let allMedia: { url: string; type: string }[] = [];
                    
                    if (report.targetType === ReportType.POST) {
                      const post = content as Post;
                      allMedia = [
                        ...(post.images || []).map(url => ({ url, type: 'image' })),
                        ...(post.videos || []).map(url => ({ url, type: 'video' }))
                      ];
                    } else if (report.targetType === ReportType.COMMENT) {
                      const comment = content as Comment;
                      if (comment.image) allMedia.push({ url: comment.image, type: 'image' });
                      if (comment.video) allMedia.push({ url: comment.video, type: 'video' });
                    }

                    if (allMedia.length === 0) return null;

                    return (
                      <div className="relative group rounded-xl overflow-hidden border border-border-light bg-bg-secondary select-none">
                        <div className="aspect-video flex items-center justify-center bg-black">
                          {allMedia[mediaIndex].type === 'video' ? (
                            <video src={allMedia[mediaIndex].url} controls className="max-w-full max-h-full" />
                          ) : (
                            <img src={allMedia[mediaIndex].url} alt="" className="max-w-full max-h-full object-contain" />
                          )}
                        </div>

                        {allMedia.length > 1 && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); setMediaIndex(Math.max(0, mediaIndex - 1)); }}
                              className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors ${mediaIndex === 0 ? 'invisible' : ''}`}
                            >
                              <ChevronLeft size={20} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setMediaIndex(Math.min(allMedia.length - 1, mediaIndex + 1)); }}
                              className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors ${mediaIndex === allMedia.length - 1 ? 'invisible' : ''}`}
                            >
                              <ChevronRight size={20} />
                            </button>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                              {mediaIndex + 1} / {allMedia.length}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Lịch sử xử lý cho báo cáo đã đóng */}
          {report.status !== ReportStatus.PENDING && (
            <div className="bg-bg-primary rounded-xl p-6 border border-border-light shadow-sm flex items-center gap-4">
              <div className={`p-2 rounded-lg ${report.status === ReportStatus.RESOLVED ? 'bg-success/10 text-success' : 'bg-text-secondary/10 text-text-secondary'}`}>
                {report.status === ReportStatus.RESOLVED ? <CheckCircle size={20} /> : <XCircle size={20} />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary">
                  {report.status === ReportStatus.RESOLVED ? 'Báo cáo đã chấp thuận và gỡ bỏ' : 'Báo cáo đã bị từ chối'}
                </h4>
                <p className="text-xs text-text-tertiary">Thời gian xử lý: {report.resolvedAt ? `${formatRelativeTime(report.resolvedAt)} (${formatDateTime(report.resolvedAt)})` : 'N/A'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleAction}
        title={actionType === 'resolve' ? 'Xác nhận xóa nội dung' : 'Bỏ qua báo cáo'}
        message={
          actionType === 'resolve'
            ? 'Nội dung vi phạm sẽ bị xóa vĩnh viễn khỏi hệ thống. Bạn có chắc chắn?'
            : 'Báo cáo sẽ được đóng lại và nội dung vẫn được giữ nguyên. Tiếp tục?'
        }
        confirmLabel={actionType === 'resolve' ? 'Đồng ý xóa' : 'Xác nhận'}
        variant={actionType === 'resolve' ? 'danger' : 'primary'}
        isLoading={isProcessing}
      />
    </div>
  );
};

export default ReportDetailPage;
