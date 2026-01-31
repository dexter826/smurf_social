import { create } from 'zustand';
import { ReportType, ReportReason, Report } from '../types';
import { reportService } from '../services/reportService';

interface ReportState {
  // Modal state
  isOpen: boolean;
  targetType: ReportType | null;
  targetId: string | null;
  targetOwnerId: string | null;
  
  // Submission state
  isSubmitting: boolean;
  error: string | null;

  // Admin state
  pendingCount: number;
  
  // Actions
  openReportModal: (type: ReportType, id: string, ownerId: string) => void;
  closeReportModal: () => void;
  submitReport: (
    reporterId: string, 
    reason: ReportReason, 
    description?: string
  ) => Promise<boolean>;
  resetState: () => void;
  fetchPendingCount: () => Promise<void>;
}

export const useReportStore = create<ReportState>((set, get) => ({
  isOpen: false,
  targetType: null,
  targetId: null,
  targetOwnerId: null,
  isSubmitting: false,
  error: null,
  pendingCount: 0,

  openReportModal: (type, id, ownerId) => {
    set({
      isOpen: true,
      targetType: type,
      targetId: id,
      targetOwnerId: ownerId,
      error: null
    });
  },

  closeReportModal: () => {
    set({
      isOpen: false,
      targetType: null,
      targetId: null,
      targetOwnerId: null,
      error: null
    });
  },

  submitReport: async (reporterId, reason, description) => {
    const { targetType, targetId, targetOwnerId } = get();
    
    if (!targetType || !targetId || !targetOwnerId) {
      set({ error: 'Thiếu thông tin báo cáo' });
      return false;
    }

    // Không cho tự báo cáo chính mình
    if (reporterId === targetOwnerId) {
      set({ error: 'Không thể báo cáo chính mình' });
      return false;
    }

    set({ isSubmitting: true, error: null });

    try {
      // Kiểm tra đã báo cáo chưa
      const hasReported = await reportService.hasUserReported(
        reporterId, 
        targetType, 
        targetId
      );
      
      if (hasReported) {
        set({ error: 'Bạn đã báo cáo nội dung này trước đó', isSubmitting: false });
        return false;
      }

      // Tạo báo cáo mới
      await reportService.createReport({
        reporterId,
        targetType,
        targetId,
        targetOwnerId,
        reason,
        description
      });

      set({ isOpen: false, isSubmitting: false });
      return true;
    } catch (error) {
      set({ error: 'Có lỗi xảy ra, vui lòng thử lại', isSubmitting: false });
      return false;
    }
  },

  resetState: () => {
    set({
      isOpen: false,
      targetType: null,
      targetId: null,
      targetOwnerId: null,
      isSubmitting: false,
      error: null
    });
  },

  fetchPendingCount: async () => {
    try {
      const count = await reportService.getPendingCount();
      set({ pendingCount: count });
    } catch (error) {
      console.error("Lỗi lấy số báo cáo:", error);
    }
  }
}));
