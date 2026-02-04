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
import { Button, UserAvatar, Skeleton, IconButton, ConfirmDialog } from '../ui';
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

  if (isLoading) {
    return (
      <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
        <div className="bg-bg-primary w-full max-w-2xl mx-4 rounded-3xl shadow-2xl border border-border-light p-8 space-y-6">
           <Skeleton className="h-8 w-48" />
           <div className="flex gap-4">
              <Skeleton variant="circle" width={48} height={48} />
              <div className="space-y-2 flex-1">
                 <Skeleton className="h-4 w-1/3" />
                 <Skeleton className="h-3 w-1/2" />
              </div>
           </div>
           <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!report) return null;
  const reasonConfig = REPORT_CONFIG.REASONS[report.reason as keyof typeof REPORT_CONFIG.REASONS];

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
              <p className="text-[10px] text-text-tertiary uppercase font-black tracking-widest">{report.id}</p>
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
          {/* Reason Card */}
          <div className="bg-bg-secondary/50 p-4 rounded-2xl border border-border-light text-center">
            <h3 className="text-lg font-black text-error mb-1 capitalize">{reasonConfig?.label}</h3>
            <p className="text-xs text-text-secondary">{reasonConfig?.description}</p>
            {report.description && (
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

          {/* Violated Content */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-text-tertiary uppercase tracking-widest">Nội dung vi phạm</h4>
            {content ? (
              <div className="bg-bg-primary p-5 rounded-2xl border border-border-light shadow-sm">
                 <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{content.content}</p>
                 {/* Media if any */}
                 {((content as Post).images?.length || 0) > 0 && (
                   <div className="mt-4 aspect-video rounded-xl bg-black overflow-hidden">
                      <img src={(content as Post).images?.[0]} className="w-full h-full object-contain" />
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
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-bg-secondary/30 border-t border-border-light flex gap-3">
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
    </div>
  );
};
