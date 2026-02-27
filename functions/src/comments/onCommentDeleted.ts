import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { db } from '../app';
import { ReportStatus } from '../types';

function extractStoragePath(url: string): string | null {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return null;
  try {
    const path = decodeURIComponent(new URL(url).pathname.split('/o/')[1]?.split('?')[0] ?? '');
    return path || null;
  } catch {
    return null;
  }
}

async function deleteStorageFile(url: string): Promise<void> {
  const path = extractStoragePath(url);
  if (!path) return;
  try {
    await getStorage().bucket().file(path).delete();
  } catch {
    // Bỏ qua
  }
}

export const onCommentDeleted = onDocumentDeleted(
  { document: 'comments/{commentId}', region: 'us-central1' },
  async (event) => {
    const commentId = event.params.commentId;
    const commentData = event.data?.data();
    if (!commentData) return;

    const { postId, parentId, image } = commentData;

    try {
      const repliesSnap = await db
        .collection('comments')
        .where('parentId', '==', commentId)
        .get();

      const replyImageUrls: string[] = repliesSnap.docs
        .map((d) => d.data().image)
        .filter(Boolean);
      const totalDeleted = 1 + repliesSnap.docs.length;

      if (!repliesSnap.empty) {
        const batch = db.batch();
        repliesSnap.docs.forEach((d) => batch.delete(d.ref));
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
