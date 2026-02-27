import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { NotificationType } from '../types';
import { createNotification, getSenderName, buildPushBody } from '../helpers/notificationHelper';
import { sendPushNotification } from '../helpers/fcmHelper';

export const onPostReaction = onDocumentWritten(
  { document: 'posts/{postId}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return;

    const postId = event.params.postId;
    const postOwnerId: string = after.userId;
    const beforeReactions: Record<string, string> = before.reactions || {};
    const afterReactions: Record<string, string> = after.reactions || {};

    for (const [userId, reaction] of Object.entries(afterReactions)) {
      if (beforeReactions[userId] === reaction) continue;
      if (userId === postOwnerId) continue;

      try {
        const senderName = await getSenderName(userId);
        const body = buildPushBody(NotificationType.LIKE_POST, senderName);

        await createNotification({
          receiverId: postOwnerId,
          senderId: userId,
          type: NotificationType.LIKE_POST,
          data: { postId },
        });

        await sendPushNotification({
          receiverId: postOwnerId,
          type: NotificationType.LIKE_POST,
          body,
          data: { postId },
        });
      } catch (error) {
        console.error('[onPostReaction] Lỗi:', error);
      }
    }
  }
);
