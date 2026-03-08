import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../app';
import { FriendRequestStatus } from '../types';

export const onFriendRequestStatusChange = onDocumentUpdated(
  { document: 'friendRequests/{reqId}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    if (
      before.status !== FriendRequestStatus.PENDING ||
      after.status !== FriendRequestStatus.ACCEPTED
    ) {
      return;
    }

    const { senderId, receiverId } = after;
    const reqId = event.params.reqId;

    try {
      const batch = db.batch();
      const now = FieldValue.serverTimestamp();

      batch.set(db.collection('users').doc(senderId).collection('friends').doc(receiverId), {
        friendId: receiverId,
        createdAt: now,
      });

      batch.set(db.collection('users').doc(receiverId).collection('friends').doc(senderId), {
        friendId: senderId,
        createdAt: now,
      });

      // Xóa request sau khi xử lý — không còn cần thiết
      batch.delete(db.collection('friendRequests').doc(reqId));

      await batch.commit();
    } catch (error) {
      console.error('[onFriendRequestStatusChange] Lỗi cập nhật friends subcollection:', error);
    }
  }
);
