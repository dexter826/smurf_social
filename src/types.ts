// ========== IMPORTS FROM SHARED ==========
import {
  UserStatus,
  Gender,
  Visibility,
  FriendRequestStatus,
  FriendStatus,
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
} from "../shared/types";

// Re-export for consumers
export {
  UserStatus,
  Gender,
  Visibility,
  FriendRequestStatus,
  FriendStatus,
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

export type { ReactableEntity };

// ========== FRONTEND-SPECIFIC TYPES ==========

export type ThemeMode = "light" | "dark";

// ========== BASE ENTITIES ==========

export interface BaseEntity {
  id: string;
  createdAt: Date;
}

export interface SoftDeletableEntity {
  deletedAt?: Date;
  deletedBy?: string;
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
  coverImage?: string;
  lastSeen?: Date;
  updatedAt?: Date;
  role: 'admin' | 'user';
}

export interface FriendRequest extends BaseEntity {
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  message?: string;
  updatedAt?: Date;
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
  deliveredAt?: Date;
  mentions?: string[];
  isRecalled?: boolean;
  recalledAt?: Date;
  deletedBy: string[];
  isForwarded?: boolean;
  replyToId?: string;
  replyToSnippet?: { senderId: string; content: string; type: MessageType; isRecalled?: boolean };
  isEdited?: boolean;
  editedAt?: Date;
}

export interface LastMessagePreview {
  id: string;
  senderId: string;
  content: string;
  type: MessageType;
  createdAt: Date;
  reactorId?: string;
  readBy?: string[];
  deliveredAt?: Date;
}

export interface Conversation extends BaseEntity {
  updatedAt: Date;
  participantIds: string[];
  participants: User[];
  lastMessage?: LastMessagePreview;
  unreadCount: Record<string, number>;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  creatorId: string;
  adminIds: string[];
  pinnedBy: string[];
  mutedBy: string[];
  archivedBy: string[];
  markedUnreadBy: string[];
  memberJoinedAt?: Record<string, Date>;
  deletedBy: string[];
  deletedAt?: Record<string, Date>;
  blockedBy: string[];
}

export interface Comment extends BaseEntity, ReactableEntity {
  postId: string;
  userId: string;
  parentId?: string;
  content: string;
  status: CommentStatus;
  image?: string;
  replyCount?: number;
  replyToUserId?: string;
  isEdited?: boolean;
  editedAt?: Date;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface Post extends BaseEntity, ReactableEntity {
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
  editedAt?: Date;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface Notification extends BaseEntity {
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
