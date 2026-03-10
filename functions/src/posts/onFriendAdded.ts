import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Fan-out posts cũ của bạn mới vào feed của user
 * Trigger: onCreate users/{userId}/friends/{friendId}
 */
export const onFriendAdded = functions
    .region('asia-southeast1')
    .firestore
    .document('users/{userId}/friends/{friendId}')
    .onCreate(async (snapshot, context) => {
        const userId = context.params.userId;
        const friendId = context.params.friendId;

        try {
            const db = admin.firestore();

            // Lấy tất cả posts ACTIVE của friend
            const friendPostsSnapshot = await db.collection('posts')
                .where('authorId', '==', friendId)
                .where('status', '==', 'active')
                .where('visibility', 'in', ['public', 'friends'])
                .orderBy('createdAt', 'desc')
                .limit(100) // Giới hạn số posts để tránh quá tải
                .get();

            if (friendPostsSnapshot.empty) {
                console.log(`Friend ${friendId} has no posts to fan-out`);
                return;
            }

            const batch = db.batch();
            let batchCount = 0;
            const MAX_BATCH_SIZE = 500;

            for (const postDoc of friendPostsSnapshot.docs) {
                const postId = postDoc.id;
                const postData = postDoc.data();

                const feedRef = db.collection('users').doc(userId).collection('feeds').doc(postId);
                batch.set(feedRef, {
                    postId,
                    createdAt: postData.createdAt,
                });

                batchCount++;

                if (batchCount >= MAX_BATCH_SIZE) {
                    await batch.commit();
                    batchCount = 0;
                }
            }

            if (batchCount > 0) {
                await batch.commit();
            }

            console.log(`Fan-out ${friendPostsSnapshot.size} posts from ${friendId} to ${userId}'s feed`);
        } catch (error) {
            console.error('Error fan-out friend posts:', error);
        }
    });
