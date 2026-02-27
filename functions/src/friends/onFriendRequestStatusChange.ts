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

    try {
      const batch = db.batch();

      batch.update(db.collection('users').doc(senderId), {
        friendIds: FieldValue.arrayUnion(receiverId),
      });

      batch.update(db.collection('users').doc(receiverId), {
        friendIds: FieldValue.arrayUnion(senderId),
      });

      await batch.commit();
    } catch (error) {
      console.error('[onFriendRequestStatusChange] Lỗi cập nhật friendIds:', error);
    }
  }
);
