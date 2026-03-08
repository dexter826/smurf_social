import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db, auth } from '../app';
import { NotificationType } from '../types';
import { createNotification } from '../helpers/notificationHelper';

// Admin khóa/mở khóa tài khoản người dùng
export const banUser = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Chưa đăng nhập');
    if (!request.auth.token.admin) throw new HttpsError('permission-denied', 'Không có quyền Admin');

    const { userId, action = 'ban' } = request.data as {
      userId: string;
      action?: 'ban' | 'unban';
    };

    if (!userId) throw new HttpsError('invalid-argument', 'Thiếu userId');
    if (userId === request.auth.uid) throw new HttpsError('invalid-argument', 'Không thể tự ban chính mình');

    const adminId = request.auth.uid;

    if (action === 'ban') {
      // Update user status
      await db.collection('users').doc(userId).update({
        status: 'banned',
        lastSeen: FieldValue.serverTimestamp()
      });

      // Set custom claim
      await auth.setCustomUserClaims(userId, { banned: true });

      // Revoke tokens to force logout
      await auth.revokeRefreshTokens(userId);

      // Cleanup friend requests (sent + received)
      const sentRequestsQuery = db.collection('friendRequests')
        .where('senderId', '==', userId)
        .where('status', '==', 'pending');

      const receivedRequestsQuery = db.collection('friendRequests')
        .where('receiverId', '==', userId)
        .where('status', '==', 'pending');

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        sentRequestsQuery.get(),
        receivedRequestsQuery.get()
      ]);

      const batch = db.batch();

      // Delete all pending friend requests
      sentSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      receivedSnapshot.docs.forEach(doc => batch.delete(doc.ref));

      await batch.commit();

      // Remove from group conversations
      const conversationsQuery = db.collection('conversations')
        .where('isGroup', '==', true)
        .where('participantIds', 'array-contains', userId);

      const conversationsSnapshot = await conversationsQuery.get();

      const conversationBatch = db.batch();
      conversationsSnapshot.docs.forEach(doc => {
        conversationBatch.update(doc.ref, {
          participantIds: FieldValue.arrayRemove(userId),
          adminIds: FieldValue.arrayRemove(userId)
        });
      });

      await conversationBatch.commit();

      // Send notification to banned user
      await createNotification({
        receiverId: userId,
        senderId: adminId,
        type: NotificationType.CONTENT_VIOLATION,
        data: {
          contentSnippet: 'Tài khoản của bạn đã bị khóa do vi phạm quy định cộng đồng. Vui lòng liên hệ admin để biết thêm chi tiết.'
        }
      });

    } else {
      // Unban user
      await db.collection('users').doc(userId).update({
        status: 'offline'
      });

      // Remove banned claim properly
      await auth.setCustomUserClaims(userId, { banned: false });

      // Send notification to unbanned user
      await createNotification({
        receiverId: userId,
        senderId: adminId,
        type: NotificationType.CONTENT_VIOLATION,
        data: {
          contentSnippet: 'Tài khoản của bạn đã được mở khóa. Bạn có thể đăng nhập lại.'
        }
      });
    }

    return { success: true, action };
  }
);
