// ========== SHARED ENUMS ==========
// Các enums này được dùng chung giữa frontend (src) và backend (functions)

export enum UserStatus {
    ONLINE = "online",
    OFFLINE = "offline",
    BANNED = "banned",
}

export enum UserRole {
    ADMIN = "admin",
    USER = "user",
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

export enum ReactionType {
    LIKE = "like",
    LOVE = "love",
    HAHA = "haha",
    WOW = "wow",
    SAD = "sad",
    ANGRY = "angry",
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
    REACT_COMMENT = "react_comment",
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
}

export enum PostStatus {
    ACTIVE = "active",
    DELETED = "deleted",
}

export enum CommentStatus {
    ACTIVE = "active",
    DELETED = "deleted",
}

// ========== SHARED INTERFACES ==========

export interface ReactableEntity {
    reactionCount: number;
    reactionSummary: Partial<Record<ReactionType, number>>;
}

export interface NotificationPayload {
    postId?: string;
    commentId?: string;
    friendRequestId?: string;
    contentSnippet?: string;
    reportId?: string;
}
