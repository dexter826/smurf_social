import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  getCountFromServer,
  limit,
  onSnapshot,
  QueryConstraint,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Report, ReportType, ReportReason, ReportStatus, NotificationType, Post, Comment } from '../types';
import { REPORT_CONFIG, PAGINATION } from '../constants';
import { notificationService } from './notificationService';
import { postService } from './postService';
import { commentService } from './commentService';
import { userService } from './userService';

export const reportService = {
  // Tạo báo cáo mới
  createReport: async (data: Omit<Report, 'id' | 'status' | 'createdAt'>): Promise<string> => {
    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );

      const docRef = await addDoc(collection(db, 'reports'), {
        ...cleanData,
        status: ReportStatus.PENDING,
        createdAt: Timestamp.now()
      });

      // Gửi thông báo cho tất cả Admin
      const adminsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'admin')
      );
      const adminsSnapshot = await getDocs(adminsQuery);
      
      for (const adminDoc of adminsSnapshot.docs) {
        const typeLabel = REPORT_CONFIG.TYPE_LABELS[data.targetType as keyof typeof REPORT_CONFIG.TYPE_LABELS] || data.targetType;
        const reasonLabel = REPORT_CONFIG.REASONS[data.reason as keyof typeof REPORT_CONFIG.REASONS]?.label || data.reason;
        
        await notificationService.createNotification({
          receiverId: adminDoc.id,
          senderId: data.reporterId,
          type: NotificationType.REPORT_NEW,
          data: { 
            reportId: docRef.id,
            contentSnippet: `${typeLabel} - ${reasonLabel}`
          }
        });
      }

      return docRef.id;
    } catch (error) {
      console.error("Lỗi tạo báo cáo:", error);
      throw error;
    }
  },

  // Kiểm tra user đã báo cáo nội dung này chưa
  hasUserReported: async (
    reporterId: string, 
    targetType: ReportType, 
    targetId: string
  ): Promise<boolean> => {
    try {
      const q = query(
        collection(db, 'reports'),
        where('reporterId', '==', reporterId),
        where('targetType', '==', targetType),
        where('targetId', '==', targetId),
        limit(1)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error("Lỗi kiểm tra báo cáo:", error);
      return false;
    }
  },

  // Lấy danh sách báo cáo chờ xử lý (Admin)
  getPendingReports: async (limitCount: number = PAGINATION.ADMIN_REPORTS): Promise<Report[]> => {
    try {
      const q = query(
        collection(db, 'reports'),
        where('status', '==', ReportStatus.PENDING),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate()
      })) as Report[];
    } catch (error) {
      console.error("Lỗi lấy báo cáo:", error);
      return [];
    }
  },

  // Lấy tất cả báo cáo (Admin)
  getAllReports: async (limitCount: number = PAGINATION.ADMIN_REPORTS): Promise<Report[]> => {
    try {
      const q = query(
        collection(db, 'reports'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate(),
        resolvedAt: docSnap.data().resolvedAt?.toDate()
      })) as Report[];
    } catch (error) {
      console.error("Lỗi lấy báo cáo:", error);
      return [];
    }
  },

  // Xử lý báo cáo theo thời gian thực
  subscribeToReports: (
    callback: (reports: Report[]) => void,
    statusFilter?: ReportStatus,
    limitCount: number = PAGINATION.ADMIN_REPORTS
  ) => {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    ];
    
    if (statusFilter) {
      constraints.unshift(where('status', '==', statusFilter));
    }
    
    const q = query(collection(db, 'reports'), ...constraints);
    
    return onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate(),
        resolvedAt: docSnap.data().resolvedAt?.toDate()
      })) as Report[];
      callback(reports);
    });
  },

  // Xử lý báo cáo - xóa nội dung vi phạm (Admin)
  resolveReport: async (
    reportId: string, 
    adminId: string, 
    resolution: string = 'Đã xử lý',
    action: 'delete_content' | 'warn_user' | 'ban_user' = 'delete_content'
  ): Promise<void> => {
    try {
      const reportRef = doc(db, 'reports', reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (!reportSnap.exists()) throw new Error('Báo cáo không tồn tại');
      
      const reportData = reportSnap.data();

      // Cập nhật trạng thái xử lý báo cáo
      await updateDoc(reportRef, {
        status: ReportStatus.RESOLVED,
        resolvedAt: Timestamp.now(),
        resolvedBy: adminId,
        resolution
      });

      // Gỡ bỏ nội dung vi phạm triệt để
      if (reportData.targetType === ReportType.POST) {
        const post = await postService.getPostByIdForAdmin(reportData.targetId);
        if (post) {
          await postService.deletePost(post.id, post.images, post.videos);
        } else {
          await deleteDoc(doc(db, 'posts', reportData.targetId));
        }
      } else if (reportData.targetType === ReportType.COMMENT) {
        const comment = await commentService.getCommentById(reportData.targetId);
        if (comment) {
          await commentService.deleteComment(comment.id, comment.postId, comment.parentId);
        } else {
          await deleteDoc(doc(db, 'comments', reportData.targetId));
        }
      }
      
      // Xử lý báo cáo người dùng (Cảnh báo hoặc Khóa)
      if (reportData.targetType === ReportType.USER) {
        if (action === 'ban_user') {
           await userService.banUser(reportData.targetId);
        }
        // Nếu là warn_user thì chỉ gửi noti ở dưới, không cần làm gì thêm ở bước này
      }

      // Thông báo người báo cáo
      await notificationService.createNotification({
        receiverId: reportData.reporterId,
        senderId: adminId,
        type: NotificationType.REPORT_RESOLVED,
        data: { reportId }
      });

      // Cảnh cáo người vi phạm
      await notificationService.createNotification({
        receiverId: reportData.targetOwnerId,
        senderId: adminId,
        type: NotificationType.CONTENT_VIOLATION,
        data: { contentSnippet: reportData.reason }
      });
      
      // Nếu là cảnh báo người dùng (User Report)
      if (reportData.targetType === ReportType.USER && action === 'warn_user') {
         await notificationService.createNotification({
          receiverId: reportData.targetOwnerId,
          senderId: adminId,
          type: NotificationType.CONTENT_VIOLATION, // Tạm dùng type này hoặc tạo type mới SYSTEM_WARNING
          data: { contentSnippet: `Cảnh báo: Tài khoản của bạn bị báo cáo vì lý do: ${reportData.reason}. Vui lòng tuân thủ quy tắc cộng đồng.` }
        });
      }
    } catch (error) {
      console.error("Lỗi xử lý báo cáo:", error);
      throw error;
    }
  },

  // Từ chối báo cáo - không vi phạm (Admin)
  rejectReport: async (reportId: string, adminId: string): Promise<void> => {
    try {
      const reportRef = doc(db, 'reports', reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (!reportSnap.exists()) throw new Error('Báo cáo không tồn tại');
      
      const reportData = reportSnap.data();

      await updateDoc(reportRef, {
        status: ReportStatus.REJECTED,
        resolvedAt: Timestamp.now(),
        resolvedBy: adminId,
        resolution: 'Không phát hiện vi phạm'
      });

      // Thông báo người báo cáo
      await notificationService.createNotification({
        receiverId: reportData.reporterId,
        senderId: adminId,
        type: NotificationType.REPORT_RESOLVED,
        data: { 
          reportId,
          contentSnippet: 'Không phát hiện vi phạm'
        }
      });
    } catch (error) {
      console.error("Lỗi từ chối báo cáo:", error);
      throw error;
    }
  },

  // Đếm số báo cáo pending (cho badge)
  getPendingCount: async (): Promise<number> => {
    try {
      const q = query(
        collection(db, 'reports'),
        where('status', '==', ReportStatus.PENDING)
      );
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      return 0;
    }
  },

  // Lấy báo cáo theo ID
  getReportById: async (reportId: string): Promise<Report | null> => {
    try {
      const reportSnap = await getDoc(doc(db, 'reports', reportId));
      if (!reportSnap.exists()) return null;
      
      return {
        id: reportSnap.id,
        ...reportSnap.data(),
        createdAt: reportSnap.data().createdAt?.toDate(),
        resolvedAt: reportSnap.data().resolvedAt?.toDate()
      } as Report;
    } catch (error) {
      console.error("Lỗi lấy báo cáo:", error);
      return null;
    }
  }
};
