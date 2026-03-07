import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { getStorage } from 'firebase-admin/storage';
import { db } from '../app';
import { NotificationType, ReportStatus } from '../types';

// Trích xuất Storage path từ download URL
function extractStoragePath(url: string): string | null {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return null;
  try {
    const path = decodeURIComponent(new URL(url).pathname.split('/o/')[1]?.split('?')[0] ?? '');
    return path || null;
  } catch {
    return null;
  }
}

// Xóa file trên Storage, bỏ qua lỗi
async function deleteStorageFile(url: string): Promise<void> {
  const path = extractStoragePath(url);
  if (!path) return;
  try {
    await getStorage().bucket().file(path).delete();
  } catch {
    // Bỏ qua — file có thể đã bị xóa trước đó
  }
}

// Trigger khi post bị xóa → dọn dẹp toàn bộ dữ liệu liên quan
export const onPostDeleted = onDocumentDeleted(
  { document: 'posts/{postId}', region: 'us-central1' },
  async (event) => {
    const postId = event.params.postId;
    const postData = event.data?.data();

    try {
      const commentsSnap = await db
        .collection('comments')
        .where('postId', '==', postId)
        .get();

      const commentIds = commentsSnap.docs.map((d) => d.id);
      const commentImageUrls: string[] = commentsSnap.docs
        .map((d) => d.data().image)
        .filter(Boolean);

      // Batch xóa comments (500 per batch)
      const BATCH_SIZE = 400;
      for (let i = 0; i < commentsSnap.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        commentsSnap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      const reportsQuery = db
        .collection('reports')
        .where('targetType', '==', 'post')
        .where('targetId', '==', postId);
      const commentReportsPromises = commentIds.length > 0
        ? db.collection('reports')
            .where('targetType', '==', 'comment')
            .where('targetId', 'in', commentIds.slice(0, 30))
            .get()
        : Promise.resolve(null);

      const [reportsSnap, commentReportsSnap] = await Promise.all([
        reportsQuery.get(),
        commentReportsPromises,
      ]);

      const reportBatch = db.batch();
      reportsSnap.docs.forEach((d) =>
        reportBatch.update(d.ref, {
          status: ReportStatus.ORPHANED,
          resolution: 'Nội dung đã bị xóa',
        })
      );
      commentReportsSnap?.docs.forEach((d) =>
        reportBatch.update(d.ref, {
          status: ReportStatus.ORPHANED,
          resolution: 'Nội dung đã bị xóa do bài viết gốc bị xóa',
        })
      );
      await reportBatch.commit();

      const notifTypes = [
        NotificationType.LIKE_POST,
        NotificationType.COMMENT_POST,
        NotificationType.REPLY_COMMENT,
        NotificationType.REACT_COMMENT,
      ];
      await Promise.all(
        notifTypes.map(async (type) => {
          const snap = await db
            .collection('notifications')
            .where('type', '==', type)
            .where('data.postId', '==', postId)
            .get();
          if (snap.empty) return;
          const batch = db.batch();
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        })
      );

      const storageUrls: string[] = [
        ...(postData?.images || []),
        ...(postData?.videos || []),
        ...Object.values(postData?.videoThumbnails || {}),
        ...commentImageUrls,
      ];
      await Promise.all(storageUrls.map(deleteStorageFile));
    } catch (error) {
      console.error('[onPostDeleted] Lỗi:', error);
    }
  }
);
