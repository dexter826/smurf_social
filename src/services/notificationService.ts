import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  doc, 
  updateDoc, 
  onSnapshot, 
  writeBatch,
  limit,
  arrayUnion,
  deleteDoc
} from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { db } from '../firebase/config';
import { AppNotification, NotificationType } from '../types';

export const notificationService = {
  // Tạo thông báo mới và lưu vào Firestore
  createNotification: async (notificationData: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        isRead: false,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error("Lỗi tạo thông báo:", error);
      throw error;
    }
  },

  // Lấy danh sách thông báo của người dùng
  getNotifications: async (userId: string, limitCount: number = 20): Promise<AppNotification[]> => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('receiverId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate(),
      } as AppNotification));
    } catch (error) {
      console.error("Lỗi lấy danh sách thông báo:", error);
      return [];
    }
  },

  // Theo dõi thông báo mới nhất.
  subscribeToNotifications: (userId: string, callback: (notifications: AppNotification[]) => void, limitCount: number = 20) => {
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
        createdAt: (doc.data().createdAt as Timestamp).toDate(),
      } as AppNotification));
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

  // Xóa notifications liên quan đến một bài viết
  deleteNotificationsByPostId: async (postId: string): Promise<void> => {
    try {
      const notificationTypes = [
        'like_post',
        'comment_post', 
        'reply_comment',
        'like_comment'
      ];
      
      for (const type of notificationTypes) {
        const q = query(
          collection(db, 'notifications'),
          where('type', '==', type),
          where('data.postId', '==', postId)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach(docSnap => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
        }
      }
    } catch (error) {
      console.error("Lỗi xóa notifications theo postId:", error);
    }
  },

  // Yêu cầu quyền FCM và lưu Token
  requestPushPermission: async (userId: string): Promise<string | null> => {
    try {
      const messaging = getMessaging();
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY // Lấy từ Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
        });
        
        if (token) {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token)
          });
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
  getNotificationText: (notification: AppNotification, senderName: string): string => {
    const prefix = senderName ? `${senderName} ` : '';
    switch (notification.type) {
      case NotificationType.LIKE_POST:
        return `${prefix}đã thích bài viết của bạn.`;
      case NotificationType.COMMENT_POST:
        return `${prefix}đã bình luận: "${notification.data.contentSnippet}"`;
      case NotificationType.REPLY_COMMENT:
        return `${prefix}đã phản hồi bình luận của bạn.`;
      case NotificationType.LIKE_COMMENT:
        return `${prefix}đã thích bình luận của bạn.`;
      case NotificationType.FRIEND_REQUEST:
        return `${prefix}đã gửi lời mời kết bạn.`;
      case NotificationType.FRIEND_ACCEPT:
        return `${prefix}đã chấp nhận lời mời kết bạn.`;
      case NotificationType.REPORT_NEW:
        return `có báo cáo mới cần xử lý`;
      case NotificationType.REPORT_RESOLVED:
        return notification.data.contentSnippet 
          ? `Báo cáo của bạn đã được xem xét` 
          : `Báo cáo của bạn đã được xử lý. Cảm ơn bạn!`;
      case NotificationType.CONTENT_VIOLATION:
        return notification.data.contentSnippet || 'Nội dung của bạn đã bị xóa do vi phạm quy tắc cộng đồng';
      default:
        return "Thông báo mới.";
    }
  }
};
