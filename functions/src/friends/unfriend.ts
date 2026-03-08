import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
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
      batch.update(db.collection('users').doc(userId), {
        friendIds: FieldValue.arrayRemove(friendId),
      });
      batch.update(db.collection('users').doc(friendId), {
        friendIds: FieldValue.arrayRemove(userId),
      });
      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('[unfriend] Lỗi:', error);
      throw new HttpsError('internal', 'Lỗi hủy kết bạn');
    }
  }
);
