import { toast } from '../store/toastStore';
import { FILE_LIMITS, FileLimitType } from '../constants/fileConfig';

/**
 * Kiểm tra file có vượt quá kích thước cho phép hay không
 * @param file File cần kiểm tra
 * @param type Loại giới hạn áp dụng (IMAGE, VIDEO, FILE, AVATAR, COVER)
 * @returns boolean true nếu hợp lệ, false nếu vượt quá
 */
export const validateFileSize = (file: File, type: FileLimitType): boolean => {
  const limit = FILE_LIMITS[type];
  if (file.size > limit) {
    const mbLimit = limit / (1024 * 1024);
    const typeLabel = 
      type === 'IMAGE' ? 'Ảnh' :
      type === 'VIDEO' ? 'Video' :
      type === 'AVATAR' ? 'Ảnh đại diện' :
      type === 'COVER' ? 'Ảnh bìa' : 'File';
      
    toast.error(`${file.name}: ${typeLabel} quá lớn. Giới hạn ${mbLimit}MB.`);
    return false;
  }
  return true;
};
