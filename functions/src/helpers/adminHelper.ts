import { FieldValue } from 'firebase-admin/firestore';
import { db, auth, rtdb } from '../app';
import { UserStatus, FriendRequestStatus } from '../types';

/**
 * Ban một user: cập nhật status, thu hồi token, xóa pending requests, kick khỏi group chats
 */
export async function banUserById(userId: string): Promise<void> {
    await db.collection('users').doc(userId).update({
        status: UserStatus.BANNED,
        updatedAt: FieldValue.serverTimestamp(),
    });

    await auth.revokeRefreshTokens(userId);

    const [sentSnap, receivedSnap] = await Promise.all([
        db.collection('friendRequests').where('senderId', '==', userId).where('status', '==', FriendRequestStatus.PENDING).get(),
        db.collection('friendRequests').where('receiverId', '==', userId).where('status', '==', FriendRequestStatus.PENDING).get(),
    ]);

    const batch = db.batch();
    sentSnap.docs.forEach(d => batch.delete(d.ref));
    receivedSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    const conversationsSnap = await rtdb.ref('conversations').get();
    if (conversationsSnap.exists()) {
        const conversations = conversationsSnap.val() as Record<string, any>;
        const updates: Record<string, null> = {};
        for (const [convId, conv] of Object.entries(conversations)) {
            if (conv.isGroup && conv.members?.[userId]) {
                updates[`conversations/${convId}/members/${userId}`] = null;
                updates[`user_chats/${userId}/${convId}`] = null;
            }
        }
        if (Object.keys(updates).length > 0) {
            await rtdb.ref().update(updates);
        }
    }
}
