import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { db } from '../app';
import { FieldValue } from 'firebase-admin/firestore';
import { NotificationType } from '../types';
import { createNotification, getSenderName, buildPushBody } from '../helpers/notificationHelper';
import { sendPushNotification } from '../helpers/fcmHelper';

export const onCommentCreated = onDocumentCreated(
  { document: 'comments/{commentId}', region: 'us-central1' },
  async (event) => {
    const comment = event.data?.data();
    if (!comment) return;

    const commentId = event.params.commentId;
    const { postId, userId: senderId, parentId, replyToUserId, content } = comment;
    const contentSnippet: string = (content || '').substring(0, 50);

    const batch = db.batch();
    batch.update(db.collection('posts').doc(postId), { commentCount: FieldValue.increment(1) });
    if (parentId) {
      batch.update(db.collection('comments').doc(parentId), { replyCount: FieldValue.increment(1) });
    }
    await batch.commit();

    try {
      const senderName = await getSenderName(senderId);

      if (parentId && replyToUserId && replyToUserId !== senderId) {
        const body = buildPushBody(NotificationType.REPLY_COMMENT, senderName);

        await createNotification({
          receiverId: replyToUserId,
          senderId,
          type: NotificationType.REPLY_COMMENT,
          data: { postId, commentId, contentSnippet },
        });

        await sendPushNotification({
          receiverId: replyToUserId,
          type: NotificationType.REPLY_COMMENT,
          body,
          data: { postId, commentId },
        });
      } else if (!parentId) {
        const postSnap = await db.collection('posts').doc(postId).get();
        if (!postSnap.exists) return;

        const postOwnerId: string = postSnap.data()!.userId;
        if (postOwnerId === senderId) return;

        const body = buildPushBody(NotificationType.COMMENT_POST, senderName, { contentSnippet });

        await createNotification({
          receiverId: postOwnerId,
          senderId,
          type: NotificationType.COMMENT_POST,
          data: { postId, commentId, contentSnippet },
        });

        await sendPushNotification({
          receiverId: postOwnerId,
          type: NotificationType.COMMENT_POST,
          body,
          data: { postId, commentId },
        });
      }
    } catch (error) {
      console.error('[onCommentCreated] Lỗi:', error);
    }
  }
);
