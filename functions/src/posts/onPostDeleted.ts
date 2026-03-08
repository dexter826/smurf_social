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

      const postReportsSnap = await db
        .collection('reports')
        .where('targetType', '==', 'post')
        .where('targetId', '==', postId)
        .get();

      if (!postReportsSnap.empty) {
        const batch = db.batch();
        postReportsSnap.docs.forEach((d) =>
          batch.update(d.ref, { status: ReportStatus.ORPHANED, resolution: 'Nội dung đã bị xóa' })
        );
        await batch.commit();
      }

      if (commentIds.length > 0) {
        const CHUNK_SIZE = 30;
        const chunks: string[][] = [];
        for (let i = 0; i < commentIds.length; i += CHUNK_SIZE) {
          chunks.push(commentIds.slice(i, i + CHUNK_SIZE));
        }
        const commentReportSnaps = await Promise.all(
          chunks.map((chunk) =>
            db.collection('reports')
              .where('targetType', '==', 'comment')
              .where('targetId', 'in', chunk)
              .get()
          )
        );
        const commentReportDocs = commentReportSnaps.flatMap((s) => s.docs);
        const BATCH_SIZE_REPORTS = 400;
        for (let i = 0; i < commentReportDocs.length; i += BATCH_SIZE_REPORTS) {
          const batch = db.batch();
          commentReportDocs.slice(i, i + BATCH_SIZE_REPORTS).forEach((d) =>
            batch.update(d.ref, {
              status: ReportStatus.ORPHANED,
              resolution: 'Nội dung đã bị xóa do bài viết gốc bị xóa',
            })
          );
          await batch.commit();
        }
      }

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
