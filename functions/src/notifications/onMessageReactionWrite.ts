import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { db } from '../app';
import { FieldValue } from 'firebase-admin/firestore';
import { MessageType } from '../types';

export const onMessageReactionWrite = onDocumentWritten(
  { document: 'messages/{messageId}/reactions/{userId}', region: 'us-central1' },
  async (event) => {
    const beforeData = event.data?.before?.data() as { type: string } | undefined;
    const afterData = event.data?.after?.data() as { type: string } | undefined;

    const isCreate = !beforeData && !!afterData;
    const isDelete = !!beforeData && !afterData;
    const isUpdate = !!beforeData && !!afterData && beforeData.type !== afterData.type;

    if (!isCreate && !isDelete && !isUpdate) return;

    const messageId = event.params.messageId;
    const userId = event.params.userId;
    const messageRef = db.collection('messages').doc(messageId);
    const updates: Record<string, FieldValue> = {};

    if (isCreate) {
      updates['reactionCount'] = FieldValue.increment(1);
      updates[`reactionSummary.${afterData!.type}`] = FieldValue.increment(1);
    } else if (isDelete) {
      updates['reactionCount'] = FieldValue.increment(-1);
      updates[`reactionSummary.${beforeData!.type}`] = FieldValue.increment(-1);
    } else {
      // Đổi loại cảm xúc
      updates[`reactionSummary.${beforeData!.type}`] = FieldValue.increment(-1);
      updates[`reactionSummary.${afterData!.type}`] = FieldValue.increment(1);
    }

    await messageRef.update(updates);

    if (!isCreate) return;

    try {
      const messageSnap = await messageRef.get();
      if (!messageSnap.exists) return;

      const { conversationId, senderId } = messageSnap.data()!;

      const userSnap = await db.collection('users').doc(userId).get();
      const userName = userSnap.exists ? userSnap.data()!.name : 'Ai đó';
      const lastName = (userName as string).split(' ').pop();

      await db.collection('conversations').doc(conversationId).update({
        lastMessage: {
          id: messageId,
          senderId,
          reactorId: userId,
          content: `${afterData!.type} ${lastName} đã bày tỏ cảm xúc`,
          type: MessageType.TEXT,
          createdAt: new Date(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('[onMessageReactionWrite] Lỗi cập nhật lastMessage:', error);
    }
  }
);
