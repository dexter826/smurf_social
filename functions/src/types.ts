// Enums và types dùng chung — mirror từ src/types.ts

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BANNED = 'banned',
}

export enum PostType {
  NORMAL = 'normal',
  AVATAR_UPDATE = 'avatar_update',
  COVER_UPDATE = 'cover_update',
}

export enum Visibility {
  PUBLIC = 'public',
  FRIENDS = 'friends',
  PRIVATE = 'private',
}

export enum NotificationType {
  LIKE_POST = 'like_post',
  COMMENT_POST = 'comment_post',
  REPLY_COMMENT = 'reply_comment',
  LIKE_COMMENT = 'like_comment',
  FRIEND_REQUEST = 'friend_request',
  FRIEND_ACCEPT = 'friend_accept',
  REPORT_NEW = 'report_new',
  REPORT_RESOLVED = 'report_resolved',
  CONTENT_VIOLATION = 'content_violation',
}

export enum ReportType {
  POST = 'post',
  COMMENT = 'comment',
  USER = 'user',
}

export enum ReportStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
  ORPHANED = 'orphaned',
}

export enum FriendRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export interface NotificationData {
  receiverId: string;
  senderId: string;
  type: NotificationType;
  data: Record<string, string | undefined>;
}
