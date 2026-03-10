import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Fan-out post ID vào feeds subcollection của tất cả bạn bè + chính tác giả
 * Trigger: onCreate posts/{postId}
 */
export const onPostCreated = functions
    .region('asia-southeast1')
    .firestore
    .document('posts/{postId}')
    .onCreate(async (snapshot, context) => {
        const postId = context.params.postId;
        const postData = snapshot.data();
        const authorId = postData.authorId;

        if (!authorId) {
            console.error('Post missing authorId:', postId);
            return;
        }

        try {
            const db = admin.firestore();
            const batch = db.batch();
            const feedEntry = {
                postId,
                createdAt: postData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
            };

            // Fan-out vào feed của chính tác giả
            const authorFeedRef = db.collection('users').doc(authorId).collection('feeds').doc(postId);
            batch.set(authorFeedRef, feedEntry);

            // Lấy danh sách bạn bè
            const friendsSnapshot = await db.collection('users').doc(authorId).collection('friends').get();

            let batchCount = 0;
            const MAX_BATCH_SIZE = 500;

            for (const friendDoc of friendsSnapshot.docs) {
                const friendId = friendDoc.id;
                const friendFeedRef = db.collection('users').doc(friendId).collection('feeds').doc(postId);
                batch.set(friendFeedRef, feedEntry);

                batchCount++;

                // Commit batch khi đạt limit
                if (batchCount >= MAX_BATCH_SIZE) {
                    await batch.commit();
                    batchCount = 0;
                }
            }

            // Commit batch cuối cùng
            if (batchCount > 0) {
                await batch.commit();
            }

            console.log(`Fan-out post ${postId} to ${friendsSnapshot.size + 1} feeds`);
        } catch (error) {
            console.error('Error fan-out post:', error);
        }
    });
