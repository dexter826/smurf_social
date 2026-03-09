# Audit Report: Database Types & Type System

> Senior FullStack Audit — 09/03/2026  
> Phạm vi: `shared/types.ts` · `src/types.ts` · `functions/src/types.ts` và toàn bộ các file sử dụng types

---

## 🔴 CRITICAL — Bugs gây lỗi runtime

### C1 — `onUserProfileUpdated.ts` thiếu `status` khi tạo post

- **Vị trí:** `functions/src/profile/onUserProfileUpdated.ts`
- **Vấn đề:** Khi user đổi avatar/cover, Cloud Function tạo một post mới nhưng **không set field `status`**. Tất cả query feed và profile đều dùng `where('status', '==', 'active')`, nên post này **không bao giờ xuất hiện** trên feed hoặc trang profile.
- **Fix:** Thêm `status: PostStatus.ACTIVE` vào object khi `db.collection('posts').add(...)`. Đồng thời import `PostStatus` từ `../types`.
- [x] Fix `onUserProfileUpdated.ts`: thêm `status: PostStatus.ACTIVE` khi tạo post

---

## 🟠 HIGH — Type safety & nhất quán BE/FE

### H1 — `functions/src/types.ts` thiếu 8+ enum exports từ shared

- **Vị trí:** `functions/src/types.ts`
- **Vấn đề:** File chỉ re-export 7 enum trong khi `shared/types.ts` có 17 enum. Hậu quả: toàn bộ BE functions dùng hardcoded string literals thay vì enum type-safe.
- **Danh sách thiếu:** `PostStatus`, `CommentStatus`, `MessageType`, `ReactionType`, `ReportReason`, `Gender`, `FriendStatus`
- [x] Bổ sung import/re-export 7 enum còn thiếu vào `functions/src/types.ts`

### H2 — BE hardcode string literals thay vì dùng enum

- **Vị trí:** 5 file BE (hậu quả trực tiếp của H1)
  - `functions/src/admin/resolveReport.ts`: `status: 'deleted'` (×2 lần), `status: 'banned'`
  - `functions/src/admin/banUser.ts`: `status: 'banned'`, `status: 'pending'` (×2 lần trong query)
  - `functions/src/scheduled/cleanup.ts`: `'deleted'` (×2), `'pending'`
  - `functions/src/notifications/onMessageReactionWrite.ts`: `type: 'text'`
  - `functions/src/profile/onUserProfileUpdated.ts`: cần import `PostStatus` (liên quan C1)
- **Vấn đề:** Nếu enum value thay đổi, BE sẽ silently sai. Không có compile-time guard.
- [x] Thay thế tất cả string literals bằng enum tương ứng trong 5 file BE trên
  - [x] `functions/src/admin/resolveReport.ts`
  - [x] `functions/src/admin/banUser.ts`
  - [x] `functions/src/scheduled/cleanup.ts`
  - [x] `functions/src/notifications/onMessageReactionWrite.ts`

### H3 — `User.role` dùng inline union string thay vì enum

- **Vị trí:** `src/types.ts`, `shared/types.ts`
- **Vấn đề:** `role: 'admin' | 'user'` không nhất quán với toàn bộ codebase đang dùng enum. Không có type guard, IDE không suggest, dễ typo khi so sánh.
- **Fix:** Thêm `UserRole` enum vào `shared/types.ts`, cập nhật `User.role: UserRole` trong `src/types.ts`, re-export trong cả 2 file types.
- [x] Thêm `UserRole` enum vào `shared/types.ts`
- [x] Cập nhật `User.role: UserRole` trong `src/types.ts`
- [x] Re-export `UserRole` trong `functions/src/types.ts`

### H4 — `Notification.data` type không đồng nhất giữa FE và BE

- **Vị trí:** `src/types.ts` vs `functions/src/types.ts`
- **Vấn đề:**
  - FE: `data: { postId?, commentId?, friendRequestId?, contentSnippet?, reportId? }` (typed cụ thể)
  - BE `NotificationData`: `data: Record<string, string | undefined>` (quá loose)
- `contentSnippet` thực sự được lưu vào Firestore (từ `onCommentCreated`, `onReportCreated`) nhưng không được định nghĩa trong BE type.
- **Fix:** Định nghĩa interface `NotificationPayload` trong `shared/types.ts` với tất cả optional keys. Dùng nó cho cả FE `Notification.data` và BE `NotificationData.data`.
- [x] Tạo `NotificationPayload` interface trong `shared/types.ts`
- [x] Cập nhật `Notification.data` trong `src/types.ts` dùng `NotificationPayload`
- [x] Cập nhật `NotificationData.data` trong `functions/src/types.ts` dùng `NotificationPayload`

---

## 🟡 MEDIUM — Thiết kế type không sạch / placement sai

### M1 — `SoftDeletableEntity` tồn tại nhưng không được `extends`

- **Vị trí:** `src/types.ts`
- **Vấn đề:** `SoftDeletableEntity` interface được định nghĩa với `deletedAt?` và `deletedBy?`, nhưng `Post` và `Comment` không `extends SoftDeletableEntity` — thay vào đó tự khai báo lại 2 field này inline. Nếu `SoftDeletableEntity` thay đổi, Post/Comment sẽ không được cập nhật.
- **Fix:** `Post extends BaseEntity, SoftDeletableEntity, ReactableEntity` và `Comment extends BaseEntity, SoftDeletableEntity, ReactableEntity`. Xóa các field `deletedAt?` và `deletedBy?` inline redundant.
- [x] Áp dụng `extends SoftDeletableEntity` cho `Post` và `Comment`, loại bỏ duplicate fields

### M2 — `FriendStatus` và `ConversationRealtimeState` đặt sai file

- **Vị trí:** `shared/types.ts`
- **Vấn đề:**
  - `FriendStatus` là UI state enum (không_bạn / đang_gửi / đang_nhận / bạn bè) — BE không dùng bao giờ
  - `ConversationRealtimeState` là ephemeral RTDB state, không phải Firestore entity — hoàn toàn FE-only
- Cả hai không phải "shared giữa FE và BE" → đặt sai vị trí làm `shared/types.ts` phình to với thứ không liên quan BE.
- **Fix:** Move `FriendStatus` và `ConversationRealtimeState` sang `src/types.ts`.
- [x] Di chuyển `FriendStatus` và `ConversationRealtimeState` từ `shared/types.ts` sang `src/types.ts`
- [x] Cập nhật import trong tất cả FE files dùng 2 type trên

### M3 — `ReactableEntity.reactionSummary` dùng `Record<string, number>` thay vì typed

- **Vị trí:** `shared/types.ts`
- **Vấn đề:** `reactionSummary: Record<string, number>` cho phép bất kỳ string key nào, không giới hạn theo `ReactionType`. Code đọc/ghi summary không có type guard, dễ dùng key sai.
- **Fix:** `reactionSummary: Partial<Record<ReactionType, number>>` — chỉ cho phép key là `ReactionType` enum values, partial vì không phải lúc nào cũng đủ 6 loại cảm xúc.
- [x] Cập nhật `ReactableEntity.reactionSummary` thành `Partial<Record<ReactionType, number>>`

---

## 📋 Checklist tổng hợp theo thứ tự ưu tiên

| #   | File cần sửa                                            | Việc cần làm                                                                                                     | Trạng thái |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | `functions/src/profile/onUserProfileUpdated.ts`         | Thêm `status: PostStatus.ACTIVE` khi tạo post                                                                    | - [x]      |
| 2   | `functions/src/types.ts`                                | Bổ sung 7 enum còn thiếu từ shared                                                                               | - [x]      |
| 3   | `functions/src/admin/resolveReport.ts`                  | Thay `'deleted'`/`'banned'` bằng enum                                                                            | - [x]      |
| 4   | `functions/src/admin/banUser.ts`                        | Thay `'banned'`/`'pending'` bằng enum                                                                            | - [x]      |
| 5   | `functions/src/scheduled/cleanup.ts`                    | Thay `'deleted'`/`'pending'` bằng enum                                                                           | - [x]      |
| 6   | `functions/src/notifications/onMessageReactionWrite.ts` | Thay `type: 'text'` bằng `MessageType.TEXT`                                                                      | - [x]      |
| 7   | `shared/types.ts`                                       | Thêm `UserRole` enum, `NotificationPayload` interface; di chuyển `FriendStatus` & `ConversationRealtimeState` ra | - [x]      |
| 8   | `src/types.ts`                                          | Dùng `UserRole` cho `User.role`; `extends SoftDeletableEntity`; import từ shared                                 | - [x]      |
| 9   | `functions/src/types.ts`                                | Re-export `UserRole`; cập nhật `NotificationData.data`                                                           | - [x]      |
| 10  | `shared/types.ts`                                       | `reactionSummary: Partial<Record<ReactionType, number>>`                                                         | - [x]      |
