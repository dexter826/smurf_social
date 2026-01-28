import { toast } from '../store/toastStore';
import { FILE_LIMITS, FileLimitType } from '../constants/fileConfig';
import { UI_MESSAGES } from '../constants/uiMessages';

/**
 * Kiểm tra file có vượt quá kích thước cho phép hay không
 */
export const validateFileSize = (file: File, type: FileLimitType): boolean => {
  const limit = FILE_LIMITS[type];
  if (file.size > limit) {
    const mbLimit = limit / (1024 * 1024);
    const typeLabel = UI_MESSAGES.FILE[type as keyof typeof UI_MESSAGES.FILE] || UI_MESSAGES.FILE.FILE;
      
    toast.error(`${file.name}: ${typeLabel} quá lớn. Giới hạn ${mbLimit}MB.`);
    return false;
  }
  return true;
};
