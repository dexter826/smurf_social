// Phân trang
export const PAGINATION = {
  FEED_POSTS: 15,
  USER_POSTS: 20,
  COMMENTS: 5,
  REPLIES: 3,
  FRIENDS: 50,
  MESSAGES: 50,
  SEARCH_RESULTS: 20,
} as const;

// Giới hạn Firebase
export const FIREBASE_LIMITS = {
  QUERY_IN_LIMIT: 10,
  BATCH_WRITE_LIMIT: 500,
} as const;

// Giới hạn thời gian (ms)
export const TIME_LIMITS = {
  MESSAGE_EDIT_WINDOW: 5 * 60 * 1000,
  TYPING_TIMEOUT: 3000,
  TOAST_DURATION: 3000,
  SEARCH_DEBOUNCE: 300,
} as const;

// Giới hạn Media
export const MEDIA_CONSTRAINTS = {
  MAX_IMAGES_PER_POST: 10,
  MAX_VIDEOS_PER_POST: 1,
  PROFILE_MEDIA_PREVIEW: 6,
} as const;

// Giới hạn nhóm chat
export const GROUP_LIMITS = {
  MIN_MEMBERS: 2,
  MAX_MEMBERS: 100,
  NAME_MAX_LENGTH: 50,
} as const;

// Validation
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  BIO_MAX_LENGTH: 500,
  POST_CONTENT_MAX_LENGTH: 5000,
  COMMENT_MAX_LENGTH: 2000,
  MESSAGE_MAX_LENGTH: 5000,
} as const;

// Re-export file limits từ fileConfig
export { FILE_LIMITS, type FileLimitType } from './fileConfig';

// Re-export API endpoints
export { API_ENDPOINTS } from './api';
