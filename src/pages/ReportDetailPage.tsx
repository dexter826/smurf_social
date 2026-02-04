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
  ChevronRight,
  FileX,
  Unlock,
  Lock
} from 'lucide-react';
import { Report, ReportStatus, ReportType, User, Post, Comment, UserStatus } from '../types';
import { reportService } from '../services/reportService';
import { userService } from '../services/userService';
import { postService } from '../services/postService';
import { commentService } from '../services/commentService';
import { Button, UserAvatar, ConfirmDialog, Skeleton, IconButton } from '../components/ui';
import { REPORT_CONFIG, CONFIRM_MESSAGES } from '../constants';
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
  const [actionType, setActionType] = useState<'resolve' | 'reject' | 'warn' | 'ban' | 'unban' | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

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
        } else if (reportData.targetType === ReportType.COMMENT) {
          const commentData = await commentService.getCommentById(reportData.targetId);
          setContent(commentData);
        } else {
          // User report - no content to fetch, just targetOwner is enough
          setContent(null);
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
        await reportService.resolveReport(report.id, currentUser.id, 'Đã xử lý xóa nội dung', 'delete_content');
        toast.success('Đã xử lý và xóa nội dung vi phạm');
      } else if (actionType === 'warn') {
        await reportService.resolveReport(report.id, currentUser.id, 'Đã gửi cảnh báo', 'warn_user');
        toast.success('Đã gửi cảnh báo tới người dùng');
      } else if (actionType === 'ban') {
        await reportService.resolveReport(report.id, currentUser.id, 'Đã khóa tài khoản', 'ban_user');
        toast.success('Đã khóa tài khoản người dùng');
        const refreshedOwner = await userService.getUserById(report.targetOwnerId);
        setTargetOwner(refreshedOwner || null);
      } else if (actionType === 'unban') {
        await userService.unbanUser(report.targetOwnerId);
        toast.success('Đã mở khóa tài khoản người dùng');
        // Refresh targetOwner data
        const refreshedOwner = await userService.getUserById(report.targetOwnerId);
        setTargetOwner(refreshedOwner || null);
      } else {
        await reportService.rejectReport(report.id, currentUser.id);
        toast.success('Đã từ chối báo cáo');
      }
      if (actionType !== 'unban') {
        navigate('/admin/reports');
      }
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
      case ReportStatus.ORPHANED: return 'Nội dung đã xóa';
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
      case ReportStatus.ORPHANED:
        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-text-tertiary/5 text-text-tertiary outline-none ring-0">{label}</span>;
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
      <div className="bg-bg-primary border-b border-border-light sticky top-0 z-30 transition-all">
        <div className="max-w-4xl mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <IconButton
              icon={<ArrowLeft size={18} />}
              onClick={() => navigate('/admin/reports')}
              variant="ghost"
              size="md"
              title="Quay lại"
            />
            <div className="overflow-hidden">
              <h1 className="text-sm md:text-base font-bold text-text-primary truncate">
                Chi tiết báo cáo
              </h1>
            </div>
          </div>

          <div className="flex gap-1.5 md:gap-2 shrink-0">
            {report.status === ReportStatus.PENDING && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="!h-9 !px-3 md:!px-4 !rounded-lg font-bold text-xs md:text-sm !gap-0 sm:!gap-2"
                  icon={<XCircle size={14} />}
                  onClick={() => { setActionType('reject'); setShowConfirm(true); }}
                >
                  <span className="hidden sm:inline">Từ chối</span>
                </Button>
                
                {report.targetType === ReportType.USER ? (
                  <>
                    <Button
                      variant="warning"
                      size="sm"
                      className="!h-9 !px-3 md:!px-4 !rounded-lg font-bold text-xs md:text-sm !gap-0 sm:!gap-2"
                      icon={<AlertTriangle size={14} />}
                      onClick={() => { setActionType('warn'); setShowConfirm(true); }}
                    >
                      <span className="hidden sm:inline">Cảnh báo</span>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="!h-9 !px-3 md:!px-4 !rounded-lg font-bold text-xs md:text-sm !gap-0 sm:!gap-2"
                      icon={<Trash2 size={14} />}
                      onClick={() => { setActionType('ban'); setShowConfirm(true); }}
                    >
                      <span className="hidden sm:inline">Khóa TK</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    className="!h-9 !px-3 md:!px-4 !rounded-lg font-bold text-xs md:text-sm !gap-0 sm:!gap-2"
                    icon={<CheckCircle size={14} />}
                    onClick={() => { setActionType('resolve'); setShowConfirm(true); }}
                  >
                    <span className="hidden sm:inline">Xử lý xong</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 py-8">
        <div className="space-y-6">
          
          {/* Ưu tiên hiển thị thông tin đối tượng */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Reporter Profile */}
            <div 
              onClick={() => reporter && navigate(`/profile/${reporter.id}`)}
              className="bg-bg-primary p-4 md:p-5 rounded-xl border border-border-light shadow-sm space-y-3 md:space-y-4 cursor-pointer hover:bg-bg-secondary/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">Người báo cáo</h4>
                <ExternalLink size={12} className="text-text-tertiary group-hover:text-primary transition-colors md:w-[14px] md:h-[14px]" />
              </div>
              <div className="flex items-center gap-3">
                <UserAvatar src={reporter?.avatar} name={reporter?.name} size="md" className="shrink-0" />
                <div className="overflow-hidden">
                  <div className="text-sm font-bold text-text-primary truncate">{reporter?.name}</div>
                  <div className="text-[11px] md:text-xs text-text-tertiary truncate">{reporter?.email}</div>
                </div>
              </div>
            </div>

            {/* Target Owner Profile */}
            <div 
              onClick={() => targetOwner && navigate(`/profile/${targetOwner.id}`)}
              className="bg-bg-primary p-4 md:p-5 rounded-xl border border-border-light shadow-sm space-y-3 md:space-y-4 cursor-pointer hover:bg-bg-secondary/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">Bị báo cáo</h4>
                  {targetOwner?.status === UserStatus.BANNED && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold bg-error/10 text-error flex items-center gap-1">
                      <Lock size={10} /> Đã bị khóa
                    </span>
                  )}
                </div>
                <ExternalLink size={12} className="text-text-tertiary group-hover:text-primary transition-colors md:w-[14px] md:h-[14px]" />
              </div>
              <div className="flex items-center gap-3">
                <UserAvatar src={targetOwner?.avatar} name={targetOwner?.name} size="md" className="shrink-0" />
                <div className="overflow-hidden">
                  <div className="text-sm font-bold text-text-primary truncate">{targetOwner?.name}</div>
                  <div className="text-[11px] md:text-xs text-text-tertiary truncate">{targetOwner?.email}</div>
                </div>
              </div>
              {/* Nút Unban nếu user đang bị khóa */}
              {targetOwner?.status === UserStatus.BANNED && (
                <Button
                  variant="warning"
                  size="sm"
                  className="w-full !h-8 !rounded-lg font-bold text-xs"
                  icon={<Unlock size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionType('unban');
                    setShowConfirm(true);
                  }}
                >
                  Mở khóa tài khoản
                </Button>
              )}
            </div>
          </div>

          {/* Main Info Box */}
          <div className="bg-bg-primary rounded-xl border border-border-light shadow-sm divide-y divide-border-light overflow-hidden">
            {/* Chi tiết nội dung báo cáo */}
            <div className="px-5 md:px-6 py-4 bg-bg-secondary/20 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(report.status)}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-error bg-bg-secondary px-2 py-0.5 rounded border border-border-light">
                    <AlertTriangle size={14} />
                    {reasonConfig?.label}
                  </div>
                </div>
                {report.description && (
                  <div className="text-xs md:text-sm text-text-secondary bg-bg-secondary/30 p-3 rounded-lg border border-border-light italic">
                    "{report.description}"
                  </div>
                )}
                

              </div>
              <div className="text-[9px] md:text-[10px] font-bold text-text-tertiary flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5 pt-1 uppercase tracking-wider shrink-0">
                <span>{formatRelativeTime(report.createdAt)}</span>
                <span className="opacity-70 hidden sm:block">{formatDateTime(report.createdAt)}</span>
              </div>
            </div>

            {(!content && report.targetType === ReportType.USER) ? null : (
              <div className="p-5 md:p-8">
                {!content ? (
                  <div className="py-12 text-center rounded-xl border border-dashed border-border-light bg-bg-secondary/10">
                    <Trash2 size={40} className="mx-auto text-text-tertiary opacity-30 mb-3" />
                    <p className="text-sm font-bold text-text-secondary">Nội dung này không còn tồn tại</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <UserAvatar src={targetOwner?.avatar} name={targetOwner?.name} size="sm" className="md:w-10 md:h-10 shrink-0" />
                      <div className="overflow-hidden">
                        <div className="text-[13px] md:text-sm font-bold text-text-primary truncate">{targetOwner?.name}</div>
                        <div className="text-[10px] md:text-xs text-text-tertiary truncate">{formatRelativeTime((content as any).timestamp)} ({formatDateTime((content as any).timestamp)})</div>
                      </div>
                    </div>

                    <div className="text-[15px] md:text-lg text-text-primary leading-relaxed font-medium whitespace-pre-wrap">
                      {(() => {
                        const threshold = 400;
                        const shouldTruncate = content.content.length > threshold;
                        const displayContent = !shouldTruncate || isExpanded 
                          ? content.content 
                          : content.content.slice(0, threshold) + '...';
                        
                        return (
                          <>
                            {displayContent}
                            {shouldTruncate && (
                              <button 
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-primary font-bold cursor-pointer hover:underline ml-2 transition-all text-xs md:text-sm tracking-wider"
                              >
                                {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>

                  </div>
                )}
              </div>
            )}
            
            <div className="px-5 md:px-8 pb-8">
                  {(() => {
                    let allMedia: { url: string; type: string }[] = [];
                    
                    if (report.images && report.images.length > 0) {
                       allMedia = [
                         ...allMedia,
                         ...report.images.map(url => ({ url, type: 'image' }))
                       ];
                    }

                    if (content) {
                      if (report.targetType === ReportType.POST) {
                        const post = content as Post;
                        allMedia = [
                          ...allMedia,
                          ...(post.images || []).map(url => ({ url, type: 'image' })),
                          ...(post.videos || []).map(url => ({ url, type: 'video' }))
                        ];
                      } else if (report.targetType === ReportType.COMMENT) {
                        const comment = content as Comment;
                        if (comment.image) allMedia.push({ url: comment.image, type: 'image' });
                      }
                    }

                    if (allMedia.length === 0) return null;

                    return (
                      <div className="mt-4 border-t border-border-light pt-6">
                        <p className="text-sm font-bold text-text-secondary mb-3">
                          {report.targetType === ReportType.USER ? "Hình ảnh bằng chứng:" : "Media chi tiết:"}
                        </p>
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
                            </>
                          )}
                        </div>
                        
                        {/* Thumbnail strip if multiple images */}
                        {allMedia.length > 1 && (
                          <div className="flex gap-2 mt-3 overflow-x-auto py-1">
                            {allMedia.map((media, idx) => (
                              <div 
                                key={idx}
                                onClick={() => setMediaIndex(idx)}
                                className={`w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                                  mediaIndex === idx ? 'border-primary opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                              >
                                {media.type === 'video' ? (
                                  <div className="w-full h-full bg-black flex items-center justify-center">
                                    <div className="text-white text-[10px]">Video</div>
                                  </div>
                                ) : (
                                  <img src={media.url} alt="" className="w-full h-full object-cover" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
             </div>
          </div>

          {/* Lịch sử xử lý cho báo cáo đã đóng */}
          {report.status !== ReportStatus.PENDING && (
            <div className="bg-bg-primary rounded-xl p-4 md:p-6 border border-border-light shadow-sm flex items-start md:items-center gap-3 md:gap-4">
              <div className={`p-1.5 md:p-2 rounded-lg shrink-0 ${
                report.status === ReportStatus.RESOLVED ? 'bg-success/10 text-success' : 
                report.status === ReportStatus.ORPHANED ? 'bg-text-tertiary/10 text-text-tertiary' :
                'bg-text-secondary/10 text-text-secondary'
              }`}>
                {report.status === ReportStatus.RESOLVED ? <CheckCircle size={18} className="md:w-5 md:h-5" /> : 
                 report.status === ReportStatus.ORPHANED ? <FileX size={18} className="md:w-5 md:h-5" /> : 
                 <XCircle size={18} className="md:w-5 md:h-5" />}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs md:text-sm font-bold text-text-primary">
                  {report.status === ReportStatus.RESOLVED ? (report.resolution || 'Đã xử lý') : 
                   report.status === ReportStatus.ORPHANED ? 'Nội dung đã bị chủ sở hữu xóa' :
                   'Báo cáo đã bị từ chối'}
                </h4>
                <p className="text-[10px] md:text-xs text-text-tertiary truncate">
                  {report.status === ReportStatus.ORPHANED 
                    ? (report.resolution || 'Nội dung gốc không còn tồn tại')
                    : `Thời gian xử lý: ${report.resolvedAt ? `${formatRelativeTime(report.resolvedAt)} (${formatDateTime(report.resolvedAt)})` : 'N/A'}`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleAction}
        title={
          actionType === 'resolve' ? CONFIRM_MESSAGES.ADMIN.RESOLVE_REPORT.TITLE : 
          actionType === 'warn' ? CONFIRM_MESSAGES.ADMIN.WARN_USER.TITLE :
          actionType === 'ban' ? CONFIRM_MESSAGES.ADMIN.BAN_USER.TITLE :
          actionType === 'unban' ? CONFIRM_MESSAGES.ADMIN.UNBAN_USER.TITLE : CONFIRM_MESSAGES.ADMIN.REJECT_REPORT.TITLE
        }
        message={
          actionType === 'resolve' ? CONFIRM_MESSAGES.ADMIN.RESOLVE_REPORT.MESSAGE : 
          actionType === 'warn' ? CONFIRM_MESSAGES.ADMIN.WARN_USER.MESSAGE :
          actionType === 'ban' ? CONFIRM_MESSAGES.ADMIN.BAN_USER.MESSAGE :
          actionType === 'unban' ? CONFIRM_MESSAGES.ADMIN.UNBAN_USER.MESSAGE : CONFIRM_MESSAGES.ADMIN.REJECT_REPORT.MESSAGE
        }
        confirmLabel={
          actionType === 'resolve' ? CONFIRM_MESSAGES.ADMIN.RESOLVE_REPORT.CONFIRM : 
          actionType === 'warn' ? CONFIRM_MESSAGES.ADMIN.WARN_USER.CONFIRM :
          actionType === 'ban' ? CONFIRM_MESSAGES.ADMIN.BAN_USER.CONFIRM :
          actionType === 'unban' ? CONFIRM_MESSAGES.ADMIN.UNBAN_USER.CONFIRM : CONFIRM_MESSAGES.ADMIN.REJECT_REPORT.CONFIRM
        }
        variant={
          actionType === 'reject' ? 'secondary' : 
          actionType === 'resolve' ? 'primary' :
          actionType === 'warn' || actionType === 'unban' ? 'warning' : 'danger'
        }
        isLoading={isProcessing}
      />
    </div>
  );
};

export default ReportDetailPage;
