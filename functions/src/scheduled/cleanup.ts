import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from '../app';

// Hàng tuần: xóa reports ORPHANED > 30 ngày
export const cleanupOrphanedReports = onSchedule(
  { schedule: 'every friday 02:00', region: 'us-central1', timeZone: 'Asia/Ho_Chi_Minh' },
  async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
      const snap = await db
        .collection('reports')
        .where('status', '==', 'orphaned')
        .where('createdAt', '<', thirtyDaysAgo)
        .get();

      if (snap.empty) return;

      const BATCH_SIZE = 400;
      for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        snap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      console.log(`[cleanupOrphanedReports] Đã xóa ${snap.size} reports`);
    } catch (error) {
      console.error('[cleanupOrphanedReports] Lỗi:', error);
    }
  }
);

// Hàng tuần: xóa notifications đã đọc > 90 ngày
export const cleanupOldNotifications = onSchedule(
  { schedule: 'every sunday 03:00', region: 'us-central1', timeZone: 'Asia/Ho_Chi_Minh' },
  async () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    try {
      const snap = await db
        .collection('notifications')
        .where('isRead', '==', true)
        .where('createdAt', '<', ninetyDaysAgo)
        .get();

      if (snap.empty) return;

      const BATCH_SIZE = 400;
      for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        snap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      console.log(`[cleanupOldNotifications] Đã xóa ${snap.size} notifications`);
    } catch (error) {
      console.error('[cleanupOldNotifications] Lỗi:', error);
    }
  }
);

// Hàng tháng: xóa friend requests PENDING > 30 ngày
export const cleanupExpiredFriendRequests = onSchedule(
  { schedule: '0 4 1 * *', region: 'us-central1', timeZone: 'Asia/Ho_Chi_Minh' },
  async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
      const snap = await db
        .collection('friendRequests')
        .where('status', '==', 'pending')
        .where('createdAt', '<', thirtyDaysAgo)
        .get();

      if (snap.empty) return;

      const BATCH_SIZE = 400;
      for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        snap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      console.log(`[cleanupExpiredFriendRequests] Đã xóa ${snap.size} requests`);
    } catch (error) {
      console.error('[cleanupExpiredFriendRequests] Lỗi:', error);
    }
  }
);
