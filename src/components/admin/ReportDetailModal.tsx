import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  User as UserIcon,
  MessageSquare,
  FileText,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { Report, ReportStatus, ReportType, User, Post, Comment, PostStatus, CommentStatus } from '../../../shared/types';
import { reportService } from '../../services/reportService';
import { userService } from '../../services/userService';
import { postService } from '../../services/postService';
import { commentService } from '../../services/commentService';
import { Button, UserAvatar, Skeleton, IconButton, ConfirmDialog, MediaViewer } from '../ui';
import { PostMediaGrid } from '../feed/shared/PostMediaGrid';
import { REPORT_CONFIG, TOAST_MESSAGES } from '../../constants';
import { formatRelativeTime, formatDateTime } from '../../utils/dateUtils';
import { toast } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';

interface ReportDetailModalProps {
  reportId: string;
  onClose: () => void;
}

const TYPE_CONFIG: Record<ReportType, { label: string; icon: React.ReactNode; color: string }> = {
  [ReportType.POST]: {
    label: 'Bài viết',
    icon: <FileText size={14} />,
    color: 'bg-info/10 text-info border-info/20',
  },
  [ReportType.COMMENT]: {
    label: 'Bình luận',
    icon: <MessageSquare size={14} />,
    color: 'bg-warning/10 text-warning border-warning/20',
  },
  [ReportType.USER]: {
    label: 'Người dùng',
    icon: <UserIcon size={14} />,
    color: 'bg-error/10 text-error border-error/20',
  },
};

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ reportId, onClose }) => {
  const { user: currentUser } = useAuthStore();
  const [report, setReport] = useState<Report | null>(null);
  const [reporter, setReporter] = useState<User | null>(null);
  const [targetOwner, setTargetOwner] = useState<User | null>(null);
  const [content, setContent] = useState<Post | Comment | null>(null);
  const [resolver, setResolver] = useState<User | null>(null);
  const [deleter, setDeleter] = useState<User | null>(null);

  const [viewerState, setViewerState] = useState({
    isOpen: false,
    media: [] as { type: 'image' | 'video'; url: string }[],
    index: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionType, setActionType] = useState<'resolve' | 'reject' | 'warn' | 'ban' | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const reportData = await reportService.getReportById(reportId);
        if (!reportData) {
          toast.error(TOAST_MESSAGES.REPORT.NOT_FOUND);
          onClose();
          return;
        }
        setReport(reportData);

        const fetchTasks: Promise<User | null>[] = [
          userService.getUserById(reportData.reporterId),
          userService.getUserById(reportData.targetOwnerId),
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
          if (postData?.status === PostStatus.DELETED && postData.deletedBy) {
            userService.getUserById(postData.deletedBy).then(setDeleter);
          }
        } else if (reportData.targetType === ReportType.COMMENT) {
          const commentData = await commentService.getCommentById(reportData.targetId);
          setContent(commentData);
          if (commentData?.status === CommentStatus.DELETED && commentData.deletedBy) {
            userService.getUserById(commentData.deletedBy).then(setDeleter);
          }
        }
      } catch {
        toast.error(TOAST_MESSAGES.REPORT.LOAD_DETAIL_FAILED);
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
        await reportService.resolveReport(report.id, 'Đã xử lý xóa nội dung', 'delete_content');
        toast.success(TOAST_MESSAGES.REPORT.RESOLVE_SUCCESS);
      } else if (actionType === 'warn') {
        await reportService.resolveReport(report.id, 'Đã gửi cảnh báo', 'warn_user');
        toast.success(TOAST_MESSAGES.REPORT.WARN_SUCCESS);
      } else if (actionType === 'ban') {
        await reportService.resolveReport(report.id, 'Đã khóa tài khoản', 'ban_user');
        toast.success(TOAST_MESSAGES.REPORT.BAN_SUCCESS);
      } else if (actionType === 'reject') {
        await reportService.rejectReport(report.id);
        toast.success(TOAST_MESSAGES.REPORT.REJECT_SUCCESS);
      }
      onClose();
    } catch {
      toast.error(TOAST_MESSAGES.REPORT.PROCESS_FAILED);
    } finally {
      setIsProcessing(false);
      setShowConfirm(false);
    }
  };

  if (!report && !isLoading) return null;

  const reasonConfig = report
    ? REPORT_CONFIG.REASONS[report.reason as keyof typeof REPORT_CONFIG.REASONS]
    : null;
  const typeConfig = report ? TYPE_CONFIG[report.targetType] : null;
  const isPending = report?.status === ReportStatus.PENDING;
  const isContentReport = report?.targetType !== ReportType.USER;
  const isDeleted = content && 'status' in content && content.status === 'deleted';

  const openAction = (type: typeof actionType) => {
    setActionType(type);
    setShowConfirm(true);
  };

  return (
    <>
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[var(--z-modal)] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-primary w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-xl border border-border-light flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-border-light flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-error/10 rounded-xl text-error">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary leading-tight">Chi tiết báo cáo</h2>
              {isLoading ? (
                <Skeleton className="h-3 w-28 mt-1" />
              ) : (
                <p className="text-xs text-text-tertiary mt-0.5">
                  {report ? formatDateTime(report.createdAt) : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status badge */}
            {!isLoading && report && (
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                report.status === ReportStatus.PENDING
                  ? 'bg-warning/10 text-warning border-warning/20'
                  : report.status === ReportStatus.RESOLVED
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-text-secondary/10 text-text-secondary border-border-light'
              }`}>
                {report.status === ReportStatus.PENDING && <Clock size={12} />}
                {report.status === ReportStatus.RESOLVED && <CheckCircle size={12} />}
                {report.status === ReportStatus.REJECTED && <XCircle size={12} />}
                {report.status === ReportStatus.PENDING
                  ? 'Chờ xử lý'
                  : report.status === ReportStatus.RESOLVED
                    ? 'Đã xử lý'
                    : 'Đã từ chối'}
              </span>
            )}
            <IconButton icon={<X size={20} />} onClick={onClose} variant="secondary" />
          </div>
        </div>

        {/* ── Body: 2-column layout ── */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

          {/* LEFT: Nội dung vi phạm */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 lg:border-r border-border-light min-w-0">
            {/* Report type + reason hero */}
            {isLoading ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-32 rounded-full" />
                </div>
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {typeConfig && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${typeConfig.color}`}>
                      {typeConfig.icon}
                      {typeConfig.label}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-error/10 text-error border border-error/20">
                    <AlertTriangle size={12} />
                    {reasonConfig?.label}
                  </span>
                </div>
                {reasonConfig?.description && (
                  <p className="text-sm text-text-secondary">{reasonConfig.description}</p>
                )}
                {report?.description && (
                  <div className="p-3 bg-bg-secondary rounded-xl border border-dashed border-border-light">
                    <p className="text-sm text-text-secondary italic">"{report.description}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Violated content */}
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            ) : isContentReport ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-text-tertiary uppercase tracking-widest">
                    Nội dung bị báo cáo
                  </h4>
                  {isDeleted && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-error/10 text-error rounded-full border border-error/20 text-[10px] font-bold uppercase">
                      <Trash2 size={10} />
                      Đã xóa
                    </span>
                  )}
                </div>

                {content ? (
                  <div className={`bg-bg-secondary/50 p-4 rounded-xl border ${isDeleted ? 'border-error/20' : 'border-border-light'}`}>
                    {isDeleted && deleter && (
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border-light/50 text-xs text-text-tertiary">
                        <span className="font-bold uppercase tracking-wider">Xóa bởi:</span>
                        <UserAvatar userId={deleter.id} src={deleter.avatar?.url} name={deleter.fullName} size="xs" />
                        <span className="font-semibold text-text-secondary">{deleter.fullName}</span>
                        {content.deletedAt && (
                          <span className="ml-auto text-[11px]">{formatRelativeTime(content.deletedAt)}</span>
                        )}
                      </div>
                    )}

                    {content.content ? (
                      <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{content.content}</p>
                    ) : (
                      <p className="text-sm text-text-tertiary italic">(Không có nội dung văn bản)</p>
                    )}

                    {/* Post media */}
                    {report?.targetType === ReportType.POST && content && (
                      <div className="mt-4">
                        <PostMediaGrid
                          media={(content as Post).media || []}
                          onClick={() => setViewerState({
                            isOpen: true,
                            media: (content as Post).media?.map(m => ({
                              type: m.mimeType.startsWith('video') ? 'video' as const : 'image' as const,
                              url: m.url,
                            })) || [],
                            index: 0,
                          })}
                        />
                      </div>
                    )}

                    {/* Comment image */}
                    {report?.targetType === ReportType.COMMENT && (content as Comment).image && (
                      <div
                        className="mt-4 aspect-video rounded-xl bg-black overflow-hidden cursor-pointer group relative"
                        onClick={() => setViewerState({
                          isOpen: true,
                          media: [{ type: 'image' as const, url: (content as Comment).image!.url }],
                          index: 0,
                        })}
                      >
                        <img src={(content as Comment).image!.url} className="w-full h-full object-contain" alt="" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-xs font-bold uppercase tracking-wider">
                          Xem cỡ lớn
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-bg-secondary/30 rounded-xl border border-dashed border-border-light">
                    <Trash2 size={28} className="mx-auto text-text-tertiary opacity-30 mb-2" />
                    <p className="text-sm text-text-tertiary">Nội dung đã bị xóa hoặc không còn tồn tại</p>
                  </div>
                )}
              </div>
            ) : (
              // User report — show target profile
              <div className="space-y-3">
                <h4 className="text-xs font-black text-text-tertiary uppercase tracking-widest">Tài khoản bị báo cáo</h4>
                {isLoading ? (
                  <Skeleton className="h-20 w-full rounded-xl" />
                ) : (
                  <div className="flex items-center gap-4 p-4 bg-bg-secondary/50 rounded-xl border border-border-light">
                    <UserAvatar userId={targetOwner?.id || ''} src={targetOwner?.avatar?.url} name={targetOwner?.fullName} size="lg" />
                    <div className="min-w-0">
                      <p className="text-base font-bold text-text-primary truncate">{targetOwner?.fullName}</p>
                      <p className="text-sm text-text-tertiary truncate">{targetOwner?.email}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Evidence images */}
            {!isLoading && report?.images && report.images.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-text-tertiary uppercase tracking-widest">Hình ảnh bằng chứng ({report.images.length})</h4>
                <div className="grid grid-cols-3 gap-2">
                  {report.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="aspect-square rounded-xl overflow-hidden border border-border-light bg-bg-secondary group cursor-pointer relative"
                      onClick={() => setViewerState({
                        isOpen: true,
                        media: (report.images || []).map(m => ({ type: 'image' as const, url: m.url })),
                        index: idx,
                      })}
                    >
                      <img src={img.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wide">
                        Xem ảnh
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Metadata + Actions */}
          <div className="w-full lg:w-[320px] shrink-0 flex flex-col overflow-y-auto border-t lg:border-t-0 border-border-light">
            <div className="p-5 space-y-5 flex-1">

              {/* Người báo cáo */}
              <div className="space-y-2">
                <span className="text-[11px] font-black text-text-tertiary uppercase tracking-widest block">Người báo cáo</span>
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <Skeleton variant="circle" width={36} height={36} />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-1/2" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-bg-secondary/40 rounded-xl">
                    <UserAvatar userId={reporter?.id || ''} src={reporter?.avatar?.url} name={reporter?.fullName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary truncate">{reporter?.fullName}</p>
                      <p className="text-xs text-text-tertiary truncate">{reporter?.email}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bị báo cáo — chỉ hiện khi report content (không phải user type) */}
              {isContentReport && (
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-text-tertiary uppercase tracking-widest block">Chủ nội dung</span>
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <Skeleton variant="circle" width={36} height={36} />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2.5 w-1/2" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-bg-secondary/40 rounded-xl">
                      <UserAvatar userId={targetOwner?.id || ''} src={targetOwner?.avatar?.url} name={targetOwner?.fullName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary truncate">{targetOwner?.fullName}</p>
                        <p className="text-xs text-text-tertiary truncate">{targetOwner?.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resolution info */}
              {!isLoading && report && !isPending && (
                <div className={`p-4 rounded-xl border space-y-3 ${
                  report.status === ReportStatus.RESOLVED
                    ? 'bg-success/5 border-success/20'
                    : 'bg-bg-secondary/40 border-border-light'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {report.status === ReportStatus.RESOLVED
                        ? <CheckCircle size={16} className="text-success" />
                        : <XCircle size={16} className="text-text-secondary" />
                      }
                      <span className={`text-sm font-bold ${report.status === ReportStatus.RESOLVED ? 'text-success' : 'text-text-secondary'}`}>
                        {report.status === ReportStatus.RESOLVED ? 'Đã xử lý' : 'Đã từ chối'}
                      </span>
                    </div>
                    {report.resolvedAt && (
                      <span className="text-[11px] text-text-tertiary">{formatRelativeTime(report.resolvedAt)}</span>
                    )}
                  </div>

                  {resolver && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border-light/50">
                      <span className="text-[11px] text-text-tertiary font-semibold">Xử lý bởi:</span>
                      <UserAvatar userId={resolver.id} src={resolver.avatar?.url} name={resolver.fullName} size="xs" />
                      <span className="text-xs font-semibold text-text-primary">{resolver.fullName}</span>
                    </div>
                  )}

                  {report.resolution && (
                    <p className="text-xs text-text-secondary italic bg-bg-primary/50 px-3 py-2 rounded-lg">
                      "{report.resolution}"
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer Actions ── */}
            {!isLoading && (
              <div className="p-5 border-t border-border-light bg-bg-secondary/20 space-y-2.5">
                {isPending ? (
                  <>
                    {/* Action nhẹ: Bỏ qua */}
                    <Button
                      variant="secondary"
                      className="w-full font-semibold"
                      disabled={isProcessing}
                      onClick={() => openAction('reject')}
                    >
                      Bỏ qua báo cáo
                    </Button>

                    <div className="flex gap-2">
                      {report?.targetType === ReportType.USER ? (
                        <>
                          <Button
                            variant="secondary"
                            className="flex-1 font-semibold border-warning/30 text-warning hover:bg-warning/10"
                            disabled={isProcessing}
                            onClick={() => openAction('warn')}
                          >
                            Cảnh báo
                          </Button>
                          <Button
                            variant="danger"
                            className="flex-1 font-bold shadow-md shadow-error/20"
                            isLoading={isProcessing}
                            onClick={() => openAction('ban')}
                          >
                            Khóa TK
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant={isDeleted ? 'secondary' : 'danger'}
                          className="flex-1 font-bold shadow-md shadow-error/20"
                          isLoading={isProcessing}
                          onClick={() => openAction('resolve')}
                        >
                          {isDeleted ? 'Xác nhận & Đóng' : 'Xóa nội dung vi phạm'}
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <Button variant="secondary" className="w-full font-semibold" onClick={onClose}>
                    Đóng
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>

    {/* Render ngoài backdrop để thoát stacking context */}
    <ConfirmDialog
      isOpen={showConfirm}
      onClose={() => setShowConfirm(false)}
      onConfirm={handleAction}
      title={
        actionType === 'resolve' ? 'Xác nhận xóa nội dung' :
        actionType === 'reject' ? 'Bỏ qua báo cáo' :
        actionType === 'warn' ? 'Gửi cảnh báo' :
        actionType === 'ban' ? 'Khóa tài khoản' : 'Xác nhận'
      }
      message={
        actionType === 'resolve' ? 'Nội dung vi phạm sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.' :
        actionType === 'reject' ? 'Báo cáo sẽ được đóng lại, nội dung vẫn được giữ nguyên.' :
        actionType === 'warn' ? 'Người dùng sẽ nhận được cảnh báo về hành vi vi phạm.' :
        actionType === 'ban' ? 'Tài khoản sẽ bị KHÓA và đăng xuất khỏi mọi thiết bị ngay lập tức.' : ''
      }
      variant={actionType === 'resolve' || actionType === 'ban' ? 'danger' : 'primary'}
    />

    <MediaViewer
      media={viewerState.media}
      initialIndex={viewerState.index}
      isOpen={viewerState.isOpen}
      onClose={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
    />
    </>
  );
};
