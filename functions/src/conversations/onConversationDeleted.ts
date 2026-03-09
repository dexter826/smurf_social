import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { db } from '../app';

// Cascade delete khi conversation bị hard delete (disbandGroup)
export const onConversationDeleted = onDocumentDeleted(
    { document: 'conversations/{conversationId}', region: 'us-central1' },
    async (event) => {
        const conversationId = event.params.conversationId;
        const BATCH_SIZE = 400;

        try {
            // Xóa tất cả messages trong conversation
            const messagesSnap = await db
                .collection('messages')
                .where('conversationId', '==', conversationId)
                .get();

            if (!messagesSnap.empty) {
                for (let i = 0; i < messagesSnap.docs.length; i += BATCH_SIZE) {
                    const batch = db.batch();
                    const messageDocs = messagesSnap.docs.slice(i, i + BATCH_SIZE);

                    for (const messageDoc of messageDocs) {
                        // Xóa reactions subcollection của message
                        const reactionsSnap = await messageDoc.ref.collection('reactions').get();
                        reactionsSnap.docs.forEach((reactionDoc) => batch.delete(reactionDoc.ref));

                        // Xóa message document
                        batch.delete(messageDoc.ref);
                    }

                    await batch.commit();
                }
                console.log(`[onConversationDeleted] Đã xóa ${messagesSnap.size} messages cho conversation ${conversationId}`);
            }
        } catch (error) {
            console.error('[onConversationDeleted] Lỗi:', error);
        }
    }
);
