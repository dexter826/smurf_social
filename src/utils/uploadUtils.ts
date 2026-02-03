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
 * Format bytes thành readable string
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
