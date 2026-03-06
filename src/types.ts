export type ThemeMode = "light" | "dark";

// ========== ENUMS ==========

export enum UserStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  BANNED = "banned",
}

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}

export enum Visibility {
  PUBLIC = "public",
  FRIENDS = "friends",
  PRIVATE = "private",
}

export enum FriendRequestStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export enum FriendStatus {
  NOT_FRIEND = "not_friend",
  PENDING_SENT = "pending_sent",
  PENDING_RECEIVED = "pending_received",
  FRIEND = "friend",
}

export enum ReactionType {
  LIKE = "LIKE",
  LOVE = "LOVE",
  HAHA = "HAHA",
  WOW = "WOW",
  SAD = "SAD",
  ANGRY = "ANGRY",
}

export enum PostType {
  NORMAL = "normal",
  AVATAR_UPDATE = "avatar_update",
  COVER_UPDATE = "cover_update",
}

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  FILE = "file",
  VOICE = "voice",
  SYSTEM = "system",
  CALL = "call",
}

export enum NotificationType {
  LIKE_POST = "like_post",
  COMMENT_POST = "comment_post",
  REPLY_COMMENT = "reply_comment",
  LIKE_COMMENT = "like_comment",
  FRIEND_REQUEST = "friend_request",
  FRIEND_ACCEPT = "friend_accept",
  REPORT_NEW = "report_new",
  REPORT_RESOLVED = "report_resolved",
  CONTENT_VIOLATION = "content_violation",
}

export enum ReportType {
  POST = "post",
  COMMENT = "comment",
  USER = "user",
}

export enum ReportReason {
  SPAM = "spam",
  HARASSMENT_VIOLENCE = "harassment_violence",
  HATE_SPEECH = "hate_speech",
  SENSITIVE = "sensitive",
  SCAM_IMPERSONATION = "scam_impersonation",
  OTHER = "other",
}

export enum ReportStatus {
  PENDING = "pending",
  RESOLVED = "resolved",
  REJECTED = "rejected",
  ORPHANED = "orphaned",
}

// ========== BASE ENTITIES ==========

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface MediaAttachment {
  url: string;
  type: MessageType | "media";
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
}

// ========== CORE INTERFACES ==========

export interface User extends BaseEntity {
  name: string;
  avatar: string;
  email: string;
  location?: string;
  gender?: Gender;
  birthDate?: Date;
  status: UserStatus;
  bio?: string;
  friendIds?: string[];
  blockedUserIds?: string[];
  coverImage?: string;
  lastSeen?: Date;
  fcmTokens?: string[];
  role?: "user" | "admin";
}

export interface FriendRequest extends BaseEntity {
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  message?: string;
}

export interface Message extends BaseEntity {
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  videoThumbnails?: Record<string, string>;
  readBy?: string[];
  deliveredTo?: string[];
  deliveredAt?: Date;
  mentions?: string[];
  reactions?: Record<string, string>;
  isRecalled?: boolean;
  recalledAt?: Date;
  deletedBy?: string[];
  isForwarded?: boolean;
  replyToId?: string;
  replyToMessage?: Message;
  isEdited?: boolean;
  editedAt?: Date;
}

export interface Conversation extends BaseEntity {
  participantIds: string[];
  participants: User[];
  lastMessage?: Message;
  unreadCount: Record<string, number>;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  creatorId?: string;
  adminIds?: string[];
  pinnedBy?: string[];
  mutedUsers?: Record<string, boolean>;
  archivedBy?: string[];
  markedUnreadBy?: string[];
  typingUsers?: string[];
  memberJoinedAt?: Record<string, Date>;
  deletedBy?: string[];
  deletedAt?: Record<string, Date>;
}

export interface Comment extends BaseEntity {
  postId: string;
  userId: string;
  parentId?: string;
  content: string;
  likes?: string[];
  image?: string;
  replyCount?: number;
  replyToUserId?: string;
}

export interface Post extends BaseEntity {
  userId: string;
  content: string;
  images?: string[];
  videos?: string[];
  reactions?: Record<string, string>;
  videoThumbnails?: Record<string, string>;
  commentCount: number;
  visibility: Visibility;
  type?: PostType;
  isEdited?: boolean;
  editedAt?: Date;
}

export interface AppNotification extends BaseEntity {
  receiverId: string;
  senderId: string;
  type: NotificationType;
  data: {
    postId?: string;
    commentId?: string;
    friendRequestId?: string;
    contentSnippet?: string;
    reportId?: string;
  };
  isRead: boolean;
}

export interface Report extends BaseEntity {
  reporterId: string;
  targetType: ReportType;
  targetId: string;
  targetOwnerId: string;
  reason: ReportReason;
  description?: string;
  images?: string[];
  status: ReportStatus;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}
