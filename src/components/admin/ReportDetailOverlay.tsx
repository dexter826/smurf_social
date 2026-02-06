import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  User as UserIcon, 
  Trash2,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Report, ReportStatus, ReportType, User, Post, Comment } from '../../types';
import { reportService } from '../../services/reportService';
import { userService } from '../../services/userService';
import { postService } from '../../services/postService';
import { commentService } from '../../services/commentService';
import { Button, UserAvatar, Skeleton, IconButton, ConfirmDialog, ImageViewer } from '../ui';
import { REPORT_CONFIG, CONFIRM_MESSAGES } from '../../constants';
import { formatRelativeTime, formatDateTime } from '../../utils/dateUtils';
import { toast } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';

interface ReportDetailOverlayProps {
  reportId: string;
  onClose: () => void;
}

export const ReportDetailOverlay: React.FC<ReportDetailOverlayProps> = ({ reportId, onClose }) => {
  const { user: currentUser } = useAuthStore();
  const [report, setReport] = useState<Report | null>(null);
  const [reporter, setReporter] = useState<User | null>(null);
  const [targetOwner, setTargetOwner] = useState<User | null>(null);
  const [content, setContent] = useState<Post | Comment | null>(null);
  const [resolver, setResolver] = useState<User | null>(null);
  
  // Viewer State replacing previewImage
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    images: [] as string[],
    index: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionType, setActionType] = useState<'resolve' | 'reject' | 'warn' | 'ban' | 'unban' | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const reportData = await reportService.getReportById(reportId);
        if (!reportData) {
          toast.error('Không tìm thấy báo cáo');
          onClose();
          return;
        }
        setReport(reportData);

        const fetchTasks: Promise<User | null>[] = [
          userService.getUserById(reportData.reporterId),
          userService.getUserById(reportData.targetOwnerId)
        ];

        if (reportData.resolvedBy) {
          fetchTasks.push(userService.getUserById(reportData.resolvedBy));
        }

        const [reporterData, ownerData, resolverData] = await Promise.all(fetchTasks);
        setReporter(reporterData);
        setTargetOwner(ownerData);
        if (resolverData) setResolver(resolverData);

        if (reportData.targetType === ReportType.POST) {
          const postData = await postService.getPostByIdForAdmin(reportData.targetId);
          setContent(postData);
        } else if (reportData.targetType === ReportType.COMMENT) {
          const commentData = await commentService.getCommentById(reportData.targetId);
          setContent(commentData);
        }
      } catch (error) {
        toast.error('Lỗi tải chi tiết báo cáo');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [reportId, onClose]);

  const handleAction = async () => {
    if (!report || !actionType || !currentUser) return;
    setIsProcessing(true);
    try {
      if (actionType === 'resolve') {
        await reportService.resolveReport(report.id, currentUser.id, 'Đã xử lý xóa nội dung', 'delete_content');
        toast.success('Đã xóa nội dung vi phạm');
      } else if (actionType === 'warn') {
        await reportService.resolveReport(report.id, currentUser.id, 'Đã gửi cảnh báo', 'warn_user');
        toast.success('Đã gửi cảnh báo');
      } else if (actionType === 'ban') {
        await reportService.resolveReport(report.id, currentUser.id, 'Đã khóa tài khoản', 'ban_user');
        toast.success('Đã khóa tài khoản');
      } else if (actionType === 'reject') {
        await reportService.rejectReport(report.id, currentUser.id);
        toast.success('Đã từ chối báo cáo');
      }
      onClose();
    } catch (error) {
      toast.error('Lỗi thực hiện thao tác');
    } finally {
      setIsProcessing(false);
      setShowConfirm(false);
    }
  };

  if (!report && !isLoading) return null;
  const reasonConfig = report ? REPORT_CONFIG.REASONS[report.reason as keyof typeof REPORT_CONFIG.REASONS] : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div 
        className="bg-bg-primary w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-border-light flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-error/5 rounded-lg text-error">
               <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Chi tiết vi phạm</h2>
              {!report && isLoading && <Skeleton className="h-3 w-20 mt-1" />}
            </div>
          </div>
          <IconButton 
            icon={<X size={20} />} 
            onClick={onClose} 
            variant="ghost" 
            className="hover:bg-bg-secondary rounded-full"
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {isLoading ? (
            <div className="space-y-8 animate-pulse">
              <div className="bg-bg-secondary/50 p-4 rounded-2xl border border-border-light text-center space-y-2">
                <Skeleton className="h-6 w-1/2 mx-auto" />
                <Skeleton className="h-4 w-3/4 mx-auto" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-bg-secondary/30 rounded-2xl border border-border-light space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton variant="circle" width={32} height={32} />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2 w-1/2" />
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-bg-secondary/30 rounded-2xl border border-border-light space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton variant="circle" width={32} height={32} />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2 w-1/2" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
            </div>
          ) : (
            <>
              {/* Reason Card */}
              <div className="bg-bg-secondary/50 p-4 rounded-2xl border border-border-light text-center">
                <h3 className="text-lg font-black text-error mb-1 capitalize">{reasonConfig?.label}</h3>
                <p className="text-xs text-text-secondary">{reasonConfig?.description}</p>
                {report?.description && (
                  <div className="mt-4 p-3 bg-bg-primary/50 rounded-xl border border-dashed border-border-light italic text-xs text-text-secondary">
                    "{report.description}"
                  </div>
                )}
              </div>

              {/* Users Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-bg-secondary/30 rounded-2xl border border-border-light space-y-3">
                  <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest block">Người báo cáo</span>
                  <div className="flex items-center gap-3">
                    <UserAvatar src={reporter?.avatar} name={reporter?.name} size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-text-primary truncate">{reporter?.name}</div>
                      <div className="text-[10px] text-text-tertiary truncate">{reporter?.email}</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-bg-secondary/30 rounded-2xl border border-border-light space-y-3">
                  <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest block">Bị khiếu nại</span>
                  <div className="flex items-center gap-3">
                    <UserAvatar src={targetOwner?.avatar} name={targetOwner?.name} size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-text-primary truncate">{targetOwner?.name}</div>
                      <div className="text-[10px] text-text-tertiary truncate">{targetOwner?.email}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence Images */}
              {report?.images && report.images.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-text-tertiary uppercase tracking-widest">Hình ảnh bằng chứng</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {report.images.map((img, idx) => (
                      <div 
                        key={idx} 
                        className="aspect-square rounded-xl overflow-hidden border border-border-light bg-bg-secondary group cursor-pointer relative"
                        onClick={() => setViewerState({
                          isOpen: true,
                          images: report.images || [],
                          index: idx
                        })}
                      >
                        <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase">Xem ảnh</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Info if processed */}
              {report && report.status !== ReportStatus.PENDING && (
                <div className={`p-5 rounded-2xl border ${
                  report.status === ReportStatus.RESOLVED 
                    ? 'bg-success/5 border-success/20' 
                    : 'bg-text-secondary/5 border-border-light'
                } space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       {report.status === ReportStatus.RESOLVED ? (
                         <CheckCircle className="text-success" size={18} />
                       ) : (
                         <XCircle className="text-text-secondary" size={18} />
                       )}
                       <span className={`text-sm font-bold ${
                         report.status === ReportStatus.RESOLVED ? 'text-success' : 'text-text-secondary'
                       }`}>
                         {report.status === ReportStatus.RESOLVED ? 'Đã xử lý' : 'Đã từ chối'}
                       </span>
                    </div>
                    {report.resolvedAt && (
                      <span className="text-[10px] text-text-tertiary font-medium">
                        {formatDateTime(report.resolvedAt)}
                      </span>
                    )}
                  </div>

                  {resolver && (
                    <div className="flex items-center gap-2 pt-3 border-t border-border-light/50">
                      <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Người xử lý:</span>
                      <div className="flex items-center gap-2">
                        <UserAvatar src={resolver.avatar} name={resolver.name} size="xs" />
                        <span className="text-xs font-bold text-text-primary">{resolver.name}</span>
                      </div>
                    </div>
                  )}

                  {report.resolution && (
                    <div className="bg-bg-primary/50 p-3 rounded-xl border border-border-light/50">
                      <p className="text-xs text-text-secondary italic">"{report.resolution}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Violated Content - Only show for POST/COMMENT reports */}
              {report?.targetType !== ReportType.USER && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-text-tertiary uppercase tracking-widest">Nội dung vi phạm</h4>
                  {content ? (
                    <div className="bg-bg-primary p-5 rounded-2xl border border-border-light shadow-sm">
                      <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{content.content}</p>
                      {/* Media if any */}
                      {((content as Post).images?.length || 0) > 0 && (
                        <div 
                          className="mt-4 aspect-video rounded-xl bg-black overflow-hidden cursor-pointer group relative"
                          onClick={() => setViewerState({
                            isOpen: true,
                            images: (content as Post).images || [],
                            index: 0
                          })}
                        >
                          <img src={(content as Post).images?.[0]} className="w-full h-full object-contain transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold uppercase tracking-widest">Xem ảnh cỡ lớn</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-bg-secondary/20 rounded-2xl border border-dashed border-border-light">
                      <Trash2 size={32} className="mx-auto text-text-tertiary opacity-30 mb-2" />
                      <p className="text-xs font-medium text-text-tertiary">Nội dung đã bị xóa hoặc không còn tồn tại</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-bg-secondary/30 border-t border-border-light flex gap-3">
          {isLoading ? (
            <>
              <Skeleton className="flex-1 h-10 rounded-2xl" />
              <Skeleton className="flex-1 h-10 rounded-2xl" />
              <Skeleton className="flex-1 h-10 rounded-2xl" />
            </>
          ) : report && report.status === ReportStatus.PENDING ? (
            <>
              <Button
                variant="ghost"
                className="flex-1 !rounded-2xl font-bold"
                onClick={() => { setActionType('reject'); setShowConfirm(true); }}
              >
                Bỏ qua
              </Button>
              {report.targetType === ReportType.USER ? (
                <>
                  <Button
                    variant="warning"
                    className="flex-1 !rounded-2xl font-bold"
                    onClick={() => { setActionType('warn'); setShowConfirm(true); }}
                  >
                    Cảnh báo
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1 !rounded-2xl font-bold text-white shadow-lg shadow-error/20"
                    onClick={() => { setActionType('ban'); setShowConfirm(true); }}
                  >
                    Khóa TK
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  className="flex-[2] !rounded-2xl font-bold text-white shadow-lg shadow-primary/20"
                  onClick={() => { setActionType('resolve'); setShowConfirm(true); }}
                >
                  Xử lý & Xóa nội dung
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="secondary"
              className="flex-1 !rounded-2xl font-bold"
              onClick={onClose}
            >
              Đóng
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleAction}
        title="Xác nhận xử lý"
        message="Hành động này sẽ thay đổi trạng thái và thực hiện các biện pháp kỷ luật tương ứng."
        isLoading={isProcessing}
      />

      {/* Lightbox - Image Viewer */}
      <ImageViewer 
        images={viewerState.images}
        initialIndex={viewerState.index}
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
