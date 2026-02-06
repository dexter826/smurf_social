export type ThemeMode = "light" | "dark";

export enum UserStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  BANNED = "banned",
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  email: string;
  location?: string;
  gender?: "male" | "female" | "other";
  birthDate?: Date;
  status: UserStatus;
  bio?: string;
  friendIds?: string[];
  blockedUserIds?: string[];
  createdAt?: Date;
  coverImage?: string;
  lastSeen?: Date;
  fcmTokens?: string[];
  role?: "user" | "admin";
}

export enum FriendRequestStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "file"
  | "voice"
  | "system";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Date;
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

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: User[];
  lastMessage?: Message;
  unreadCount: Record<string, number>;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  creatorId?: string;
  adminIds?: string[];
  updatedAt: Date;
  createdAt: Date;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
  markedUnread?: boolean;
  typingUsers?: string[];
  memberJoinedAt?: Record<string, Date>;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  parentId?: string;
  content: string;
  timestamp: Date;
  likes?: string[];
  image?: string;
  replyCount?: number;
  replyToUserId?: string;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  images?: string[];
  videos?: string[];
  reactions?: Record<string, string>;
  videoThumbnails?: Record<string, string>;
  commentCount: number;
  timestamp: Date;
  visibility: "public" | "friends" | "private";
  edited?: boolean;
  editedAt?: Date;
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

export interface AppNotification {
  id: string;
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
  createdAt: Date;
}

// ========== REPORT TYPES ==========

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

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportType;
  targetId: string;
  targetOwnerId: string;
  reason: ReportReason;
  description?: string;
  images?: string[];
  status: ReportStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}
