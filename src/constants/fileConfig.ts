/**
 * Các hằng số giới hạn kích thước file (tính bằng byte)
 */
export const FILE_LIMITS = {
  IMAGE: 5 * 1024 * 1024,      // 5MB
  VIDEO: 50 * 1024 * 1024,     // 50MB
  FILE: 20 * 1024 * 1024,      // 20MB
  AVATAR: 5 * 1024 * 1024,     // 5MB
  COVER: 10 * 1024 * 1024,     // 10MB
  CHAT_MAX_FILES: 10,
} as const;

export type FileLimitType = keyof typeof FILE_LIMITS;
