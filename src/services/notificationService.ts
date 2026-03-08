import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  setDoc,
  onSnapshot,
  writeBatch,
  limit,
  arrayUnion,
  deleteDoc
} from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { db } from '../firebase/config';
import { Notification, NotificationType, ReportReason } from '../types';
import { REPORT_CONFIG } from '../constants/appConfig';
import { getValidatedEnvConfig } from '../utils/validateEnv';
import { convertTimestamp } from '../utils/dateUtils';

export const notificationService = {
  // Theo dõi thông báo mới nhất.
  subscribeToNotifications: (userId: string, callback: (notifications: Notification[]) => void, limitCount: number = 20) => {
    const q = query(
      collection(db, 'notifications'),
      where('receiverId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt, new Date()),
      } as Notification));
      callback(notifications);
    });
  },

  // Đánh dấu thông báo là đã đọc
  markAsRead: async (notificationId: string): Promise<void> => {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { isRead: true });
    } catch (error) {
      console.error("Lỗi đánh dấu đã đọc:", error);
    }
  },

  // Đánh dấu tất cả thông báo là đã đọc
  markAllAsRead: async (userId: string): Promise<void> => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('receiverId', '==', userId),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Lỗi đánh dấu tất cả đã đọc:", error);
    }
  },

  // Xóa một thông báo
  deleteNotification: async (notificationId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error("Lỗi xóa thông báo:", error);
      throw error;
    }
  },

  // Xóa tất cả thông báo của người dùng
  deleteAllNotifications: async (userId: string): Promise<void> => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('receiverId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Lỗi xóa tất cả thông báo:", error);
      throw error;
    }
  },

  // Yêu cầu quyền FCM và lưu Token
  requestPushPermission: async (userId: string): Promise<string | null> => {
    try {
      const messaging = getMessaging();
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        const { firebase } = getValidatedEnvConfig();
        const token = await getToken(messaging, {
          vapidKey: firebase.vapidKey
        });

        if (token) {
          await setDoc(
            doc(db, 'users', userId, 'private', 'fcm'),
            { tokens: arrayUnion(token) },
            { merge: true }
          );
          return token;
        }
      }
      return null;
    } catch (error) {
      console.error("Lỗi đăng ký Push:", error);
      return null;
    }
  },

  // Helper để lấy text hiển thị ngắn gọn cho thông báo
  getNotificationText: (notification: Notification, senderName: string): string => {
    const isInteraction = [
      NotificationType.LIKE_POST,
      NotificationType.COMMENT_POST,
      NotificationType.REPLY_COMMENT,
      NotificationType.REACT_COMMENT,
      NotificationType.FRIEND_REQUEST,
      NotificationType.FRIEND_ACCEPT
    ].includes(notification.type);

    const prefix = (senderName && isInteraction) ? `${senderName} ` : '';

    switch (notification.type) {
      case NotificationType.LIKE_POST:
        return `${prefix}đã thích bài viết của bạn.`;
      case NotificationType.COMMENT_POST:
        return `${prefix}đã bình luận: "${notification.data.contentSnippet}"`;
      case NotificationType.REPLY_COMMENT:
        return `${prefix}đã phản hồi bình luận của bạn.`;
      case NotificationType.REACT_COMMENT:
        return `${prefix}đã bày tỏ cảm xúc về bình luận của bạn.`;
      case NotificationType.FRIEND_REQUEST:
        return `${prefix}đã gửi lời mời kết bạn.`;
      case NotificationType.FRIEND_ACCEPT:
        return `${prefix}đã chấp nhận lời mời kết bạn.`;
      case NotificationType.REPORT_NEW:
        return `Có báo cáo mới cần xử lý: ${notification.data.contentSnippet || ''}`;
      case NotificationType.REPORT_RESOLVED:
        return notification.data.contentSnippet === 'Không phát hiện vi phạm'
          ? `Báo cáo của bạn đã được xem xét và không phát hiện vi phạm.`
          : `Báo cáo của bạn đã được xử lý. Cảm ơn bạn đã đóng góp!`;
      case NotificationType.CONTENT_VIOLATION:
        const reasonKey = notification.data.contentSnippet as ReportReason;
        const reasonLabel = REPORT_CONFIG.REASONS[reasonKey]?.label || notification.data.contentSnippet;

        return notification.data.contentSnippet
          ? `Nội dung bị báo cáo: ${reasonLabel}. Vui lòng tuân thủ quy tắc cộng đồng.`
          : 'Nội dung của bạn đã bị xóa do vi phạm quy tắc cộng đồng.';
      default:
        return "Thông báo mới.";
    }
  }
};
