import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { FILE_LIMITS, FileLimitType, TOAST_MESSAGES } from '../constants';

// Trả về kết quả kiểm tra dung lượng file
export const validateFileSize = (file: File, type: FileLimitType): { isValid: boolean; error?: string } => {
  const limit = FILE_LIMITS[type];
  if (file.size > limit) {
    const mbLimit = limit / (1024 * 1024);
    const labels: Record<string, string> = { IMAGE: 'Ảnh', AVATAR: 'Ảnh đại diện', COVER: 'Ảnh bìa', FILE: 'File', VIDEO: 'Video' };
    const typeLabel = labels[type] || 'File';
      
    return {
      isValid: false,
      error: TOAST_MESSAGES.MEDIA.FILE_TOO_LARGE(file.name, mbLimit, typeLabel)
    };
  }
  return { isValid: true };
};

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  state: "running" | "paused" | "success" | "error" | "canceled";
}

export type ProgressCallback = (progress: UploadProgress) => void;

export const uploadWithProgress = (
  path: string,
  file: File,
  onProgress?: ProgressCallback,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          progress,
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          state: snapshot.state as UploadProgress['state'],
        });
      },
      (error) => {
        reject(new Error(`Lỗi tải lên Firebase Storage: ${error.message}`));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress?.({
            progress: 100,
            bytesTransferred: file.size,
            totalBytes: file.size,
            state: 'success',
          });
          resolve(downloadURL);
        } catch (error) {
          reject(new Error('Không lấy được URL sau khi tải lên'));
        }
      }
    );
  });
};

// Xóa file trên Storage theo URL (bỏ qua URL không phải Firebase)
export const deleteStorageFile = async (url: string): Promise<void> => {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return;
  try {
    const { ref: storageRef, deleteObject } = await import('firebase/storage');
    const path = decodeURIComponent(new URL(url).pathname.split('/o/')[1]?.split('?')[0] ?? '');
    if (!path) return;
    const fileRef = storageRef(storage, path);
    await deleteObject(fileRef);
  } catch (error) {
    // Log để debug — không throw để tránh crash flow chính
    console.error('[Storage] Xóa file thất bại:', url, error);
  }
};

// Xóa nhiều file cùng lúc
export const deleteStorageFiles = (urls: string[]): Promise<void[]> =>
  Promise.all(urls.filter(Boolean).map(deleteStorageFile));

// Định dạng bytes thành chuỗi dễ đọc
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
