import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { db } from '../app';

/**
 * Đồng bộ lastMessagePreview trong conversation khi message bị edit hoặc delete
 */
export const onMessageUpdated = onDocumentUpdated(
    { document: 'messages/{messageId}', region: 'us-central1' },
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();
        if (!before || !after) return;

        const messageId = event.params.messageId;
        const { conversationId } = after;

        try {
            // Lấy conversation để kiểm tra lastMessage
            const convRef = db.collection('conversations').doc(conversationId);
            const convSnap = await convRef.get();

            if (!convSnap.exists) return;

            const convData = convSnap.data();
            const lastMessage = convData?.lastMessage;

            // Chỉ update nếu message này là lastMessage
            if (!lastMessage || lastMessage.id !== messageId) return;

            const updates: any = {};
            let needsUpdate = false;

            // Case 1: Message bị edit
            if (!before.isEdited && after.isEdited && before.content !== after.content) {
                updates['lastMessage.content'] = after.content;
                needsUpdate = true;
            }

            // Case 2: Message bị recall
            if (!before.isRecalled && after.isRecalled) {
                updates['lastMessage.content'] = 'Tin nhắn đã được thu hồi';
                needsUpdate = true;
            }

            // Case 3: Message bị soft delete (deletedBy thay đổi)
            const beforeDeletedBy = before.deletedBy || [];
            const afterDeletedBy = after.deletedBy || [];
            if (afterDeletedBy.length > beforeDeletedBy.length) {
                // Có user mới delete message
                // Nếu tất cả participants đều delete, cần tìm message mới nhất
                const allParticipants = convData?.participantIds || [];
                const allDeleted = allParticipants.every((pid: string) => afterDeletedBy.includes(pid));

                if (allDeleted) {
                    // Tìm message mới nhất chưa bị delete bởi tất cả participants
                    const messagesSnap = await db.collection('messages')
                        .where('conversationId', '==', conversationId)
                        .orderBy('createdAt', 'desc')
                        .limit(10)
                        .get();

                    let newLastMessage = null;
                    for (const doc of messagesSnap.docs) {
                        const msgData = doc.data();
                        const msgDeletedBy = msgData.deletedBy || [];
                        const isDeletedByAll = allParticipants.every((pid: string) => msgDeletedBy.includes(pid));

                        if (!isDeletedByAll) {
                            newLastMessage = {
                                id: doc.id,
                                senderId: msgData.senderId,
                                content: msgData.content,
                                type: msgData.type,
                                createdAt: msgData.createdAt,
                                readBy: msgData.readBy || [],
                                deliveredAt: msgData.deliveredAt,
                            };
                            break;
                        }
                    }

                    if (newLastMessage) {
                        updates['lastMessage'] = newLastMessage;
                        updates['updatedAt'] = new Date();
                        needsUpdate = true;
                    }
                }
            }

            if (needsUpdate) {
                await convRef.update(updates);
            }
        } catch (error) {
            console.error('[onMessageUpdated] Lỗi đồng bộ lastMessagePreview:', error);
        }
    }
);

/**
 * Đồng bộ replyToSnippet trong các message reply khi message gốc bị edit
 * Note: isRecalled đã được xử lý bởi onMessageRecalled
 */
export const syncReplyToSnippet = onDocumentUpdated(
    { document: 'messages/{messageId}', region: 'us-central1' },
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();
        if (!before || !after) return;

        const messageId = event.params.messageId;
        const { conversationId } = after;

        // Chỉ xử lý khi message bị edit (không xử lý recall vì đã có onMessageRecalled)
        if (!after.isEdited || before.isEdited) return;
        if (before.content === after.content) return;

        try {
            // Tìm tất cả messages reply đến message này
            const repliesSnap = await db.collection('messages')
                .where('conversationId', '==', conversationId)
                .where('replyToId', '==', messageId)
                .get();

            if (repliesSnap.empty) return;

            const batch = db.batch();
            repliesSnap.docs.forEach(doc => {
                batch.update(doc.ref, { 'replyToSnippet.content': after.content });
            });

            await batch.commit();
        } catch (error) {
            console.error('[syncReplyToSnippet] Lỗi đồng bộ replyToSnippet:', error);
        }
    }
);
