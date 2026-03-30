import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../app';

/**
 * Xử lý tất cả thay đổi trên bài viết (Create, Soft-delete)
 */
export const onPostWrite = onDocumentWritten(
    { document: 'posts/{postId}', region: 'us-central1' },
    async (event) => {
        const postId = event.params.postId;
        const before = event.data?.before.data();
        const after = event.data?.after.data();

        // 1. Xử lý CREATE (Fan-out)
        if (!before && after) {
            await handleFanout(postId, after);
            return;
        }

        // 2. Xử lý DELETE (Soft-delete) hoặc Thay đổi trạng thái
        if (before && after && before.status !== 'deleted' && after.status === 'deleted') {
            await removeFeedEntries(postId, after.authorId);
            return;
        }

        // 3. Xử lý UPDATE (Nội dung, Media, Visibility)
        if (before && after && before.status === 'active' && after.status === 'active') {
            const visibilityChanged = before.visibility !== after.visibility;
            const contentChanged = before.content !== after.content ||
                                 JSON.stringify(before.media) !== JSON.stringify(after.media);

            if (!visibilityChanged && !contentChanged) return;

            // Nếu đổi sang Private: Xóa khỏi feeds của bạn bè
            if (visibilityChanged && after.visibility === 'private') {
                await removeFeedEntries(postId, after.authorId);
            }
            // Nếu đổi từ Private sang Friends: Fan-out lại cho bạn bè
            else if (visibilityChanged && before.visibility === 'private' && after.visibility === 'friends') {
                await handleFanout(postId, after);
            }
            // Nếu chỉ đổi nội dung: Cập nhật updatedAt để kích hoạt listener tại client
            else {
                await updateFeedEntries(postId, after.authorId);
            }
        }
    }
);

/**
 * Thêm bài viết vào Feed của bạn bè (Fan-out)
 */
async function handleFanout(postId: string, postData: any) {
    const authorId = postData.authorId;
    if (!authorId) return;

    try {
        const batch = db.batch();
        const feedEntry = {
            postId,
            authorId,
            createdAt: postData.createdAt || FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        // Thêm vào feed của chính tác giả
        batch.set(db.collection('users').doc(authorId).collection('feeds').doc(postId), feedEntry);

        const friendsSnap = await db.collection('users').doc(authorId).collection('friends').get();
        if (friendsSnap.empty) {
            await batch.commit();
            return;
        }

        const friendIds = friendsSnap.docs.map(d => d.id);
        const usersHidingAuthor = new Set<string>();
        const chunkSize = 20;

        for (let i = 0; i < friendIds.length; i += chunkSize) {
            const chunk = friendIds.slice(i, i + chunkSize);
            const blockSnaps = await Promise.all(
                chunk.map(fid => db.collection('users').doc(fid).collection('blockedUsers').doc(authorId).get())
            );
            blockSnaps.forEach((snap, idx) => {
                if (snap.exists && snap.data()?.hideTheirActivity === true) {
                    usersHidingAuthor.add(chunk[idx]);
                }
            });
        }

        let batchCount = 0;
        for (const friendId of friendIds) {
            if (usersHidingAuthor.has(friendId)) continue;
            batch.set(db.collection('users').doc(friendId).collection('feeds').doc(postId), feedEntry);
            batchCount++;
            if (batchCount >= 500) {
                await batch.commit();
                batchCount = 0;
            }
        }
        if (batchCount > 0) await batch.commit();
        console.log(`[handleFanout] ${postId} to ${friendIds.length - usersHidingAuthor.size + 1} feeds`);
    } catch (error) {
        console.error('[handleFanout] Lỗi:', error);
    }
}

/**
 * Xóa bài viết khỏi Feed của bạn bè
 */
async function removeFeedEntries(postId: string, authorId: string) {
    try {
        const batch = db.batch();
        batch.delete(db.collection('users').doc(authorId).collection('feeds').doc(postId));

        const friendsSnapshot = await db.collection('users').doc(authorId).collection('friends').get();
        let batchCount = 0;
        for (const friendDoc of friendsSnapshot.docs) {
            batch.delete(db.collection('users').doc(friendDoc.id).collection('feeds').doc(postId));
            batchCount++;
            if (batchCount >= 500) {
                await batch.commit();
                batchCount = 0;
            }
        }
        if (batchCount > 0) await batch.commit();
        console.log(`[removeFeedEntries] ${postId} from ${friendsSnapshot.size + 1} feeds`);
    } catch (error) {
        console.error('[removeFeedEntries] Lỗi:', error);
    }
}

/**
 * Cập nhật timestamp để kích hoạt listener phía client
 */
async function updateFeedEntries(postId: string, authorId: string) {
    try {
        const batch = db.batch();
        const updatedAt = FieldValue.serverTimestamp();
        
        batch.update(db.collection('users').doc(authorId).collection('feeds').doc(postId), { updatedAt });

        const friendsSnapshot = await db.collection('users').doc(authorId).collection('friends').get();
        let batchCount = 0;
        for (const friendDoc of friendsSnapshot.docs) {
            batch.update(db.collection('users').doc(friendDoc.id).collection('feeds').doc(postId), { updatedAt });
            batchCount++;
            if (batchCount >= 500) {
                await batch.commit();
                batchCount = 0;
            }
        }
        if (batchCount > 0) await batch.commit();
        console.log(`[updateFeedEntries] ${postId} for ${friendsSnapshot.size + 1} feeds`);
    } catch (error) {
        console.error('[updateFeedEntries] Lỗi:', error);
    }
}
