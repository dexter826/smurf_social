import { getStorage } from 'firebase-admin/storage';

export function extractStoragePath(url: string): string | null {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return null;
  try {
    const path = decodeURIComponent(new URL(url).pathname.split('/o/')[1]?.split('?')[0] ?? '');
    return path || null;
  } catch {
    return null;
  }
}

// Xóa file trên Storage, bỏ qua lỗi nếu đã xóa trước đó
export async function deleteStorageFile(url: string): Promise<void> {
  const path = extractStoragePath(url);
  if (!path) return;
  try {
    await getStorage().bucket().file(path).delete();
  } catch {
    // Bỏ qua
  }
}
