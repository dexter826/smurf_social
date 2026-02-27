import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { NotificationType, FriendRequestStatus } from '../types';
import { createNotification, getSenderName, buildPushBody } from '../helpers/notificationHelper';
import { sendPushNotification } from '../helpers/fcmHelper';

export const onFriendRequestCreated = onDocumentCreated(
  { document: 'friendRequests/{reqId}', region: 'us-central1' },
  async (event) => {
    const request = event.data?.data();
    if (!request) return;

    const reqId = event.params.reqId;
    const { senderId, receiverId } = request;

    try {
      const senderName = await getSenderName(senderId);
      const body = buildPushBody(NotificationType.FRIEND_REQUEST, senderName);

      await createNotification({
        receiverId,
        senderId,
        type: NotificationType.FRIEND_REQUEST,
        data: { friendRequestId: reqId },
      });

      await sendPushNotification({
        receiverId,
        type: NotificationType.FRIEND_REQUEST,
        body,
        data: { friendRequestId: reqId },
      });
    } catch (error) {
      console.error('[onFriendRequestCreated] Lỗi:', error);
    }
  }
);

export const onFriendRequestUpdated = onDocumentUpdated(
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
    // receiverId là người chấp nhận — notify cho người gửi
    try {
      const acceptorName = await getSenderName(receiverId);
      const body = buildPushBody(NotificationType.FRIEND_ACCEPT, acceptorName);

      await createNotification({
        receiverId: senderId,
        senderId: receiverId,
        type: NotificationType.FRIEND_ACCEPT,
        data: {},
      });

      await sendPushNotification({
        receiverId: senderId,
        type: NotificationType.FRIEND_ACCEPT,
        body,
      });
    } catch (error) {
      console.error('[onFriendRequestUpdated] Lỗi:', error);
    }
  }
);
