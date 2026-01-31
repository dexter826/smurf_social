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
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Report, ReportType, ReportReason, ReportStatus, NotificationType } from '../types';
import { notificationService } from './notificationService';

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
        await notificationService.createNotification({
          receiverId: adminDoc.id,
          senderId: data.reporterId,
          type: NotificationType.REPORT_NEW,
          data: { 
            reportId: docRef.id,
            contentSnippet: `${data.targetType} - ${data.reason}`
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
  getPendingReports: async (limitCount: number = 50): Promise<Report[]> => {
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
  getAllReports: async (limitCount: number = 100): Promise<Report[]> => {
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

  // Xử lý báo cáo - xóa nội dung vi phạm (Admin)
  resolveReport: async (
    reportId: string, 
    adminId: string, 
    resolution: string = 'Đã xử lý'
  ): Promise<void> => {
    try {
      const reportRef = doc(db, 'reports', reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (!reportSnap.exists()) throw new Error('Báo cáo không tồn tại');
      
      const reportData = reportSnap.data();

      // Cập nhật status báo cáo
      await updateDoc(reportRef, {
        status: ReportStatus.RESOLVED,
        resolvedAt: Timestamp.now(),
        resolvedBy: adminId,
        resolution
      });

      // Xóa nội dung vi phạm
      if (reportData.targetType === ReportType.POST) {
        await deleteDoc(doc(db, 'posts', reportData.targetId));
      } else if (reportData.targetType === ReportType.COMMENT) {
        await deleteDoc(doc(db, 'comments', reportData.targetId));
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
