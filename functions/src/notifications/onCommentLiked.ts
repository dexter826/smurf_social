import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { NotificationType } from '../types';
import { createNotification, getSenderName, buildPushBody } from '../helpers/notificationHelper';
import { sendPushNotification } from '../helpers/fcmHelper';

export const onCommentLiked = onDocumentUpdated(
  { document: 'comments/{commentId}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const commentId = event.params.commentId;
    const commentOwnerId: string = after.userId;
    const beforeLikes: string[] = before.likes || [];
    const afterLikes: string[] = after.likes || [];

    const newLikers = afterLikes.filter((uid) => !beforeLikes.includes(uid));

    for (const senderId of newLikers) {
      if (senderId === commentOwnerId) continue;

      try {
        const senderName = await getSenderName(senderId);
        const body = buildPushBody(NotificationType.LIKE_COMMENT, senderName);
        const { postId } = after;

        await createNotification({
          receiverId: commentOwnerId,
          senderId,
          type: NotificationType.LIKE_COMMENT,
          data: { postId, commentId },
        });

        await sendPushNotification({
          receiverId: commentOwnerId,
          type: NotificationType.LIKE_COMMENT,
          body,
          data: { postId, commentId },
        });
      } catch (error) {
        console.error('[onCommentLiked] Lỗi:', error);
      }
    }
  }
);
