import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../app';

export const unfriend = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Chưa đăng nhập');

    const { friendId } = request.data as { friendId: string };
    if (!friendId) throw new HttpsError('invalid-argument', 'Thiếu friendId');

    const userId = request.auth.uid;
    if (userId === friendId) throw new HttpsError('invalid-argument', 'userId không hợp lệ');

    try {
      const batch = db.batch();
      batch.delete(db.collection('users').doc(userId).collection('friends').doc(friendId));
      batch.delete(db.collection('users').doc(friendId).collection('friends').doc(userId));
      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('[unfriend] Lỗi:', error);
      throw new HttpsError('internal', 'Lỗi hủy kết bạn');
    }
  }
);
