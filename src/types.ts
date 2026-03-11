// ========== IMPORTS FROM FIREBASE ==========
import { Timestamp } from 'firebase/firestore';

// ========== IMPORTS FROM SHARED ==========
import {
  UserStatus,
  Gender,
  Visibility,
  FriendRequestStatus,
  ReactionType,
  MessageType,
  NotificationType,
  ReportType,
  ReportReason,
  ReportStatus,
  PostStatus,
  CommentStatus,
  MemberRole,
  NotificationPayload,
} from "../shared/types";

// Re-export for consumers
export {
  UserStatus,
  Gender,
  Visibility,
  FriendRequestStatus,
  ReactionType,
  MessageType,
  NotificationType,
  ReportType,
  ReportReason,
  ReportStatus,
  PostStatus,
  CommentStatus,
  UserRole,
};

export type { NotificationPayload, MemberRole };

// ========== FRONTEND-SPECIFIC ENUMS ==========

export enum FriendStatus {
  NOT_FRIEND = "not_friend",
  PENDING_SENT = "pending_sent",
  PENDING_RECEIVED = "pending_received",
  FRIEND = "friend",
}

// ========== FRONTEND-SPECIFIC TYPES ==========

export type ThemeMode = "light" | "dark";

// ========== BASE ENTITIES ==========

export interface BaseEntity {
  id: string;
  createdAt: Timestamp;
}

export interface SoftDeletableEntity {
  deletedAt?: Timestamp;
  deletedBy?: string;
}

// ========== MEDIA OBJECT ==========

export interface MediaObject {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  thumbnailUrl?: string;
  isSensitive?: boolean;
}

// ========== CORE INTERFACES ==========

export interface User extends BaseEntity {
  fullName: string;
  avatar: MediaObject;
  email: string;
  location?: string;
  gender?: Gender;
  dob?: Timestamp;
  status: 'active' | 'banned';
  role: UserRole;
  bio?: string;
  cover?: MediaObject;
  updatedAt?: Timestamp;
  deletedAt?: Timestamp;
}

export interface FriendRequest extends BaseEntity {
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  updatedAt?: Timestamp;
}

// ========== RTDB CHAT INTERFACES ==========

export interface RtdbConversation {
  isGroup: boolean;
  name?: string;
  avatar?: MediaObject;
  creatorId: string;
  members: Record<string, MemberRole>;
  lastMessage?: {
    senderId: string;
    content: string;
    type: MessageType;
    timestamp: number;
    messageId?: string;
    readBy?: Record<string, number>;
    deliveredTo?: Record<string, number>;
  };
  createdAt: number;
  updatedAt: number;
}

export interface RtdbMessage {
  senderId: string;
  type: MessageType;
  content: string;
  media?: MediaObject[];
  mentions?: string[];
  isForwarded?: boolean;
  replyToId?: string;
  replyToSnippet?: {
    senderId: string;
    content: string;
    type: MessageType;
  };
  isEdited?: boolean;
  isRecalled?: boolean;
  deletedBy?: Record<string, true>;
  readBy?: Record<string, number>;
  deliveredTo?: Record<string, number>;
  reactions?: Record<string, string>;
  createdAt: number;
  updatedAt?: number;
}

export interface RtdbUserChat {
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  unreadCount: number;
  lastReadMsgId?: string;
  lastMsgTimestamp?: number;
}

export interface RtdbPresence {
  isOnline: boolean;
  lastSeen: number;
}

export interface RtdbCallSignaling {
  callerId: string;
  conversationId: string;
  callType: 'voice' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended';
  zegoToken?: string;
  timestamp: number;
}

export interface Comment extends BaseEntity, SoftDeletableEntity {
  postId: string;
  authorId: string;
  parentId?: string;
  content: string;
  status: CommentStatus;
  image?: MediaObject;
  replyCount?: number;
  reactions: Partial<Record<ReactionType, number>>;
  isEdited?: boolean;
  editedAt?: Timestamp;
}

export interface Post extends BaseEntity, SoftDeletableEntity {
  authorId: string;
  content: string;
  status: PostStatus;
  media?: MediaObject[];
  commentCount: number;
  visibility: Visibility;
  reactions: Partial<Record<ReactionType, number>>;
  isEdited?: boolean;
  editedAt?: Timestamp;
}

export interface Notification extends BaseEntity {
  receiverId: string;
  actorId: string;
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
  images?: MediaObject[];
  status: ReportStatus;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  resolution?: string;
}
