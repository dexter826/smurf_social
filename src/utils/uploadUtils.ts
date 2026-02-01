/**
 * Utility functions cho upload với progress tracking
 */
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'error' | 'canceled';
}

export type ProgressCallback = (progress: UploadProgress) => void;

/**
 * Upload file với progress tracking
 */
export const uploadWithProgress = (
  path: string,
  file: File,
  onProgress?: ProgressCallback
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
        onProgress?.({
          progress: 0,
          bytesTransferred: 0,
          totalBytes: file.size,
          state: 'error',
        });
        reject(error);
      },
      async () => {
        onProgress?.({
          progress: 100,
          bytesTransferred: file.size,
          totalBytes: file.size,
          state: 'success',
        });
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
};

/**
 * Upload nhiều files với combined progress
 */
export const uploadMultipleWithProgress = async (
  files: { file: File; path: string }[],
  onProgress?: (overallProgress: number, fileIndex: number) => void
): Promise<string[]> => {
  const urls: string[] = [];
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const { file, path } = files[i];
    
    const url = await uploadWithProgress(path, file, (progress) => {
      const fileProgress = progress.progress / 100;
      const overallProgress = ((i + fileProgress) / totalFiles) * 100;
      onProgress?.(overallProgress, i);
    });
    
    urls.push(url);
  }

  return urls;
};

/**
 * Format bytes thành readable string
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Ước tính thời gian còn lại dựa trên tốc độ upload
 */
export const estimateTimeRemaining = (
  bytesTransferred: number,
  totalBytes: number,
  elapsedMs: number
): string => {
  if (bytesTransferred === 0 || elapsedMs === 0) return 'Đang tính...';
  
  const bytesPerMs = bytesTransferred / elapsedMs;
  const remainingBytes = totalBytes - bytesTransferred;
  const remainingMs = remainingBytes / bytesPerMs;
  
  const seconds = Math.ceil(remainingMs / 1000);
  
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} phút`;
  return `${Math.ceil(seconds / 3600)} giờ`;
};
