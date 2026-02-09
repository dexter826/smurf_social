/**
 * Utility functions cho upload với progress tracking
 */
/**
 * Utility functions cho upload với progress tracking
 */

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  state: "running" | "paused" | "success" | "error" | "canceled";
}

export type ProgressCallback = (progress: UploadProgress) => void;

/**
 * Upload file với progress tracking
 */
export const uploadWithProgress = (
  path: string,
  file: File,
  onProgress?: ProgressCallback,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      reject(new Error("Thiếu cấu hình Cloudinary trong .env"));
      return;
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const folder = path.substring(0, path.lastIndexOf("/"));
    formData.append("folder", folder);

    xhr.open("POST", url, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        onProgress?.({
          progress,
          bytesTransferred: event.loaded,
          totalBytes: event.total,
          state: "running",
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        onProgress?.({
          progress: 100,
          bytesTransferred: file.size,
          totalBytes: file.size,
          state: "success",
        });
        resolve(response.secure_url);
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error?.message || "Lỗi tải lên Cloudinary"));
        } catch {
          reject(new Error(`Lỗi tải lên Cloudinary (status: ${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("Lỗi mạng khi tải lên Cloudinary"));
    };

    xhr.send(formData);
  });
};

/**
 * Format bytes thành readable string
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
