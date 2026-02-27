import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { db } from '../app';
import { NotificationType } from '../types';
import { createNotification } from '../helpers/notificationHelper';
import { sendPushNotification } from '../helpers/fcmHelper';

const REPORT_TYPE_LABELS: Record<string, string> = {
  post: 'Bài viết',
  comment: 'Bình luận',
  user: 'Người dùng',
};

// Client không đủ quyền query admin — chỉ CF mới làm được
export const onReportCreated = onDocumentCreated(
  { document: 'reports/{reportId}', region: 'us-central1' },
  async (event) => {
    const report = event.data?.data();
    if (!report) return;

    const reportId = event.params.reportId;
    const { reporterId, targetType, reason } = report;

    try {
      const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
      if (adminsSnap.empty) return;

      const typeLabel = REPORT_TYPE_LABELS[targetType] || targetType;
      const contentSnippet = `${typeLabel} - ${reason}`;

      const notifications = adminsSnap.docs.map((adminDoc) =>
        createNotification({
          receiverId: adminDoc.id,
          senderId: reporterId,
          type: NotificationType.REPORT_NEW,
          data: { reportId, contentSnippet },
        })
      );

      const pushNotifications = adminsSnap.docs.map((adminDoc) =>
        sendPushNotification({
          receiverId: adminDoc.id,
          type: NotificationType.REPORT_NEW,
          body: `Có báo cáo mới: ${contentSnippet}`,
          data: { reportId },
        })
      );

      await Promise.all([...notifications, ...pushNotifications]);
    } catch (error) {
      console.error('[onReportCreated] Lỗi:', error);
    }
  }
);
