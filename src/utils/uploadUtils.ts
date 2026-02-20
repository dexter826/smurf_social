import { API_ENDPOINTS, FILE_LIMITS, FileLimitType, TOAST_MESSAGES } from '../constants';
// Xóa import toastStore để tránh circular dependency

// Kiểm tra dung lượng file. Trả về object chứa kết quả và lỗi nếu có.
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
    const { CLOUD_NAME, UPLOAD_PRESET, UPLOAD_URL } = API_ENDPOINTS.CLOUDINARY;

    const url = UPLOAD_URL;
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

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

// Định dạng bytes thành chuỗi dễ đọc
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
