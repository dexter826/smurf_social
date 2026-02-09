import { toast } from '../store/toastStore';
import { FILE_LIMITS, FileLimitType } from '../constants/fileConfig';


/**
 * Kiểm tra file có vượt quá kích thước cho phép hay không
 */
export const validateFileSize = (file: File, type: FileLimitType): boolean => {
  const limit = FILE_LIMITS[type];
  if (file.size > limit) {
    const mbLimit = limit / (1024 * 1024);
    const labels: Record<string, string> = { IMAGE: 'Ảnh', AVATAR: 'Ảnh đại diện', COVER: 'Ảnh bìa', FILE: 'File', VIDEO: 'Video' };
    const typeLabel = labels[type] || 'File';
      
    toast.error(`${file.name}: ${typeLabel} quá lớn. Giới hạn ${mbLimit}MB.`);
    return false;
  }
  return true;
};
