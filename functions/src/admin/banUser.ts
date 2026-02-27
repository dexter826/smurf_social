import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, auth } from '../app';

// Admin khóa/mở khóa tài khoản người dùng (có revoke token ngay)
export const banUser = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Chưa đăng nhập');

    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (callerDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Không có quyền Admin');
    }

    const { userId, action = 'ban' } = request.data as {
      userId: string;
      action?: 'ban' | 'unban';
    };

    if (!userId) throw new HttpsError('invalid-argument', 'Thiếu userId');
    if (userId === request.auth.uid) throw new HttpsError('invalid-argument', 'Không thể tự ban chính mình');

    if (action === 'ban') {
      await db.collection('users').doc(userId).update({ status: 'banned' });
      // Revoke token → kick user khỏi session ngay lập tức
      await auth.revokeRefreshTokens(userId);
    } else {
      await db.collection('users').doc(userId).update({ status: 'offline' });
    }

    return { success: true, action };
  }
);
