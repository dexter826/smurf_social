import * as admin from 'firebase-admin';
import { db } from '../app';
import { NotificationType, NotificationData } from '../types';

export async function createNotification(data: NotificationData): Promise<string> {
  const { FieldValue } = admin.firestore;
  const docRef = await db.collection('notifications').add({
    ...data,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

export async function getSenderName(senderId: string): Promise<string> {
  try {
    const userDoc = await db.collection('users').doc(senderId).get();
    return userDoc.data()?.name || 'Ai đó';
  } catch {
    return 'Ai đó';
  }
}

export function buildPushBody(
  type: NotificationType,
  senderName: string,
  extra?: { contentSnippet?: string }
): string {
  switch (type) {
    case NotificationType.LIKE_POST:
      return `${senderName} đã thích bài viết của bạn.`;
    case NotificationType.COMMENT_POST:
      return extra?.contentSnippet
        ? `${senderName} đã bình luận: "${extra.contentSnippet}"`
        : `${senderName} đã bình luận bài viết của bạn.`;
    case NotificationType.REPLY_COMMENT:
      return `${senderName} đã phản hồi bình luận của bạn.`;
    case NotificationType.REACT_COMMENT:
      return `${senderName} đã bày tỏ cảm xúc về bình luận của bạn.`;
    case NotificationType.FRIEND_REQUEST:
      return `${senderName} đã gửi lời mời kết bạn.`;
    case NotificationType.FRIEND_ACCEPT:
      return `${senderName} đã chấp nhận lời mời kết bạn.`;
    case NotificationType.REPORT_NEW:
      return `Có báo cáo mới cần xử lý.`;
    case NotificationType.REPORT_RESOLVED:
      return `Báo cáo của bạn đã được xử lý.`;
    case NotificationType.CONTENT_VIOLATION:
      return `Nội dung của bạn đã bị xem xét vì vi phạm quy tắc.`;
    default:
      return 'Bạn có thông báo mới.';
  }
}
