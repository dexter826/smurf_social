import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../app';
import { ReportStatus } from '../types';
import { deleteStorageFile } from '../helpers/storageHelper';

export const onCommentDeleted = onDocumentDeleted(
  { document: 'comments/{commentId}', region: 'us-central1' },
  async (event) => {
    const commentId = event.params.commentId;
    const commentData = event.data?.data();
    if (!commentData) return;

    const { postId, parentId, image } = commentData;

    try {
      // Cascade delete — parent đã bị xóa, tránh double-decrement commentCount
      if (parentId) {
        const parentSnap = await db.collection('comments').doc(parentId).get();
        if (!parentSnap.exists) {
          const reportsSnap = await db
            .collection('reports')
            .where('targetType', '==', 'comment')
            .where('targetId', '==', commentId)
            .get();

          if (!reportsSnap.empty) {
            const batch = db.batch();
            reportsSnap.docs.forEach((d) =>
              batch.update(d.ref, { status: ReportStatus.ORPHANED, resolution: 'Nội dung đã bị xóa' })
            );
            await batch.commit();
          }

          if (image) await deleteStorageFile(image);
          return;
        }
      }

      const repliesSnap = await db
        .collection('comments')
        .where('parentId', '==', commentId)
        .get();

      const replyImageUrls: string[] = repliesSnap.docs
        .map((d) => d.data().image)
        .filter(Boolean);

      // Chunk batch xóa replies — tránh vượt giới hạn 500/batch
      const BATCH_SIZE = 400;
      for (let i = 0; i < repliesSnap.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        repliesSnap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      const reportsSnap = await db
        .collection('reports')
        .where('targetType', '==', 'comment')
        .where('targetId', '==', commentId)
        .get();

      if (!reportsSnap.empty) {
        const batch = db.batch();
        reportsSnap.docs.forEach((d) =>
          batch.update(d.ref, {
            status: ReportStatus.ORPHANED,
            resolution: 'Nội dung đã bị xóa',
          })
        );
        await batch.commit();
      }

      // Replies đã tính vào totalDeleted — chúng sẽ early-return do cascade check
      const totalDeleted = 1 + repliesSnap.docs.length;

      await Promise.all([
        db.collection('posts').doc(postId).update({
          commentCount: FieldValue.increment(-totalDeleted),
        }),
        parentId
          ? db.collection('comments').doc(parentId).update({
              replyCount: FieldValue.increment(-1),
            })
          : Promise.resolve(),
      ]);

      const imageUrls = [image, ...replyImageUrls].filter(Boolean) as string[];
      await Promise.all(imageUrls.map(deleteStorageFile));
    } catch (error) {
      console.error('[onCommentDeleted] Lỗi:', error);
    }
  }
);
