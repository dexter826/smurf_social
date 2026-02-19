// Giới hạn kích thước file (bytes).
export const FILE_LIMITS = {
  IMAGE: 5 * 1024 * 1024,      // 5MB (posts/images, avatars)
  VIDEO: 50 * 1024 * 1024,     // 50MB (posts/videos)
  FILE: 10 * 1024 * 1024,      // 10MB (chat files)
  AVATAR: 5 * 1024 * 1024,     // 5MB
  COVER: 10 * 1024 * 1024,     // 10MB
  CHAT_MAX_FILES: 10,
} as const;

export type FileLimitType = keyof typeof FILE_LIMITS;
