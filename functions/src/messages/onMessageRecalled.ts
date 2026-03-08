import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { db } from '../app';

export const onMessageRecalled = onDocumentUpdated(
  { document: 'messages/{messageId}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // Chỉ xử lý khi vừa bị recall
    if (before.isRecalled || !after.isRecalled) return;

    const messageId = event.params.messageId;
    const { conversationId } = after;

    try {
      const snap = await db.collection('messages')
        .where('conversationId', '==', conversationId)
        .where('replyToId', '==', messageId)
        .get();

      if (snap.empty) return;

      const batch = db.batch();
      snap.docs.forEach(d => {
        batch.update(d.ref, { 'replyToSnippet.isRecalled': true });
      });
      await batch.commit();
    } catch (error) {
      console.error('[onMessageRecalled] Lỗi cập nhật replyToSnippet:', error);
    }
  }
);
