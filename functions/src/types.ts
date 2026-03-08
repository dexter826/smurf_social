// ========== IMPORTS FROM SHARED ==========
// Enums và types dùng chung — import từ shared/types.ts

import {
  UserStatus,
  PostType,
  Visibility,
  NotificationType,
  ReportType,
  ReportStatus,
  FriendRequestStatus,
} from "../../shared/types";

// Re-export for consumers
export {
  UserStatus,
  PostType,
  Visibility,
  NotificationType,
  ReportType,
  ReportStatus,
  FriendRequestStatus,
};

// ========== BACKEND-SPECIFIC TYPES ==========

export interface NotificationData {
  receiverId: string;
  senderId: string;
  type: NotificationType;
  data: Record<string, string | undefined>;
}
