/**
 * App Configuration Constants
 * Tập trung các hằng số quan trọng để dễ quản lý và thay đổi
 */

// ============ PAGINATION ============
export const PAGINATION = {
  FEED_POSTS: 10,
  USER_POSTS: 20,
  COMMENTS: 5,
  REPLIES: 3,
  FRIENDS: 50,
  MESSAGES: 50,
  SEARCH_RESULTS: 20,
} as const;

// ============ FIREBASE LIMITS ============
export const FIREBASE_LIMITS = {
  // Firestore 'in' query giới hạn tối đa 30 items (thay đổi từ 10)
  QUERY_IN_LIMIT: 10,
  // Batch write limit
  BATCH_WRITE_LIMIT: 500,
} as const;

// ============ TIME LIMITS (milliseconds) ============
export const TIME_LIMITS = {
  // Thời gian cho phép sửa tin nhắn (5 phút)
  MESSAGE_EDIT_WINDOW: 5 * 60 * 1000,
  // Typing indicator timeout
  TYPING_TIMEOUT: 3000,
  // Toast auto dismiss
  TOAST_DURATION: 3000,
  // Debounce search
  SEARCH_DEBOUNCE: 300,
} as const;

// ============ MEDIA CONSTRAINTS ============
export const MEDIA_CONSTRAINTS = {
  // Số lượng ảnh/video tối đa trong 1 post
  MAX_IMAGES_PER_POST: 10,
  MAX_VIDEOS_PER_POST: 1,
  // Số lượng media preview trên profile
  PROFILE_MEDIA_PREVIEW: 6,
} as const;

// ============ GROUP CHAT LIMITS ============
export const GROUP_LIMITS = {
  // Số thành viên tối thiểu để tạo nhóm (không tính creator)
  MIN_MEMBERS: 2,
  // Số thành viên tối đa
  MAX_MEMBERS: 100,
  // Độ dài tên nhóm
  NAME_MAX_LENGTH: 50,
} as const;

// ============ VALIDATION ============
export const VALIDATION = {
  // Độ dài tối thiểu password
  PASSWORD_MIN_LENGTH: 6,
  // Độ dài tối đa các fields
  BIO_MAX_LENGTH: 500,
  POST_CONTENT_MAX_LENGTH: 5000,
  COMMENT_MAX_LENGTH: 2000,
  MESSAGE_MAX_LENGTH: 5000,
} as const;

// Re-export file limits từ fileConfig
export { FILE_LIMITS, type FileLimitType } from './fileConfig';

// Re-export API endpoints
export { API_ENDPOINTS } from './api';
