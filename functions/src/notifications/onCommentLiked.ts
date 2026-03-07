import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { NotificationType } from '../types';
import { createNotification, getSenderName, buildPushBody } from '../helpers/notificationHelper';
import { sendPushNotification } from '../helpers/fcmHelper';

export const onCommentReacted = onDocumentUpdated(
  { document: 'comments/{commentId}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const commentId = event.params.commentId;
    const commentOwnerId: string = after.userId;
    const beforeReactions: Record<string, string> = before.reactions || {};
    const afterReactions: Record<string, string> = after.reactions || {};

    const newReactors = Object.keys(afterReactions).filter(
      (uid) => !beforeReactions[uid] || beforeReactions[uid] !== afterReactions[uid]
    );

    for (const senderId of newReactors) {
      if (senderId === commentOwnerId) continue;

      try {
        const senderName = await getSenderName(senderId);
        const body = buildPushBody(NotificationType.REACT_COMMENT, senderName);
        const { postId } = after;

        await createNotification({
          receiverId: commentOwnerId,
          senderId,
          type: NotificationType.REACT_COMMENT,
          data: { postId, commentId },
        });

        await sendPushNotification({
          receiverId: commentOwnerId,
          type: NotificationType.REACT_COMMENT,
          body,
          data: { postId, commentId },
        });
      } catch (error) {
        console.error('[onCommentReacted] Lỗi:', error);
      }
    }
  }
);
