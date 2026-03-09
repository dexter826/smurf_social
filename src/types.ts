// ========== IMPORTS FROM FIREBASE ==========
import { Timestamp } from 'firebase/firestore';

// ========== IMPORTS FROM SHARED ==========
import {
  UserStatus,
  UserRole,
  Gender,
  Visibility,
  FriendRequestStatus,
  ReactionType,
  PostType,
  MessageType,
  NotificationType,
  ReportType,
  ReportReason,
  ReportStatus,
  PostStatus,
  CommentStatus,
  ReactableEntity,
  NotificationPayload,
} from "../shared/types";

// Re-export for consumers
export {
  UserStatus,
  UserRole,
  Gender,
  Visibility,
  FriendRequestStatus,
  ReactionType,
  PostType,
  MessageType,
  NotificationType,
  ReportType,
  ReportReason,
  ReportStatus,
  PostStatus,
  CommentStatus,
};

export type { ReactableEntity, NotificationPayload };

// ========== FRONTEND-SPECIFIC ENUMS ==========

export enum FriendStatus {
  NOT_FRIEND = "not_friend",
  PENDING_SENT = "pending_sent",
  PENDING_RECEIVED = "pending_received",
  FRIEND = "friend",
}

// ========== FRONTEND-SPECIFIC TYPES ==========

export type ThemeMode = "light" | "dark";

export interface ConversationRealtimeState {
  conversationId: string;
  typingUsers: {
    userId: string;
    timestamp: number;
  }[];
}

// ========== BASE ENTITIES ==========

export interface BaseEntity {
  id: string;
  createdAt: Timestamp;
}

export interface SoftDeletableEntity {
  deletedAt?: Timestamp;
  deletedBy?: string;
}

// ========== CORE INTERFACES ==========

export interface User extends BaseEntity {
  name: string;
  avatar: string;
  email: string;
  location?: string;
  gender?: Gender;
  birthDate?: Timestamp;
  status: UserStatus;
  bio?: string;
  coverImage?: string;
  lastSeen?: Timestamp;
  updatedAt?: Timestamp;
  role: UserRole;
}

export interface FriendRequest extends BaseEntity {
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  message?: string;
  updatedAt?: Timestamp;
}

export interface Message extends BaseEntity, ReactableEntity {
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  readBy: string[];
  deliveredTo: string[];
  deliveredAt?: Timestamp;
  mentions?: string[];
  isRecalled?: boolean;
  recalledAt?: Timestamp;
  deletedBy: string[];
  isForwarded?: boolean;
  replyToId?: string;
  replyToSnippet?: { senderId: string; content: string; type: MessageType; isRecalled?: boolean };
  isEdited?: boolean;
  editedAt?: Timestamp;
}

export interface LastMessagePreview {
  id: string;
  senderId: string;
  content: string;
  type: MessageType;
  createdAt: Timestamp;
  reactorId?: string;
  readBy?: string[];
  deliveredAt?: Timestamp;
}

export interface Conversation extends BaseEntity {
  updatedAt: Timestamp;
  participantIds: string[];
  lastMessage?: LastMessagePreview;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  creatorId: string;
  adminIds: string[];
}

export interface ConversationMember {
  userId: string;
  joinedAt: Timestamp;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  markedUnread: boolean;
  unreadCount: number;
  deletedAt?: Timestamp;
}

export interface Comment extends BaseEntity, ReactableEntity, SoftDeletableEntity {
  postId: string;
  userId: string;
  parentId?: string;
  content: string;
  status: CommentStatus;
  image?: string;
  replyCount?: number;
  replyToUserId?: string;
  isEdited?: boolean;
  editedAt?: Timestamp;
}

export interface Post extends BaseEntity, ReactableEntity, SoftDeletableEntity {
  userId: string;
  content: string;
  status: PostStatus;
  images?: string[];
  videos?: string[];
  videoThumbnails?: Record<string, string>;
  commentCount: number;
  visibility: Visibility;
  type: PostType;
  isEdited?: boolean;
  editedAt?: Timestamp;
}

export interface Notification extends BaseEntity {
  receiverId: string;
  senderId: string;
  type: NotificationType;
  data: NotificationPayload;
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
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  resolution?: string;
}
