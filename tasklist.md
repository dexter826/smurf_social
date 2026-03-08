# Danh sách nhiệm vụ tối ưu hóa Database (Firestore)

## Phase 1: Foundation & Code Quality (Priority: CRITICAL)

- [x] **1. Loại bỏ Code Duplication - Shared Types**
  - [x] Tạo thư mục `/shared` hoặc `/types` cho shared types
  - [x] Di chuyển common enums vào shared location
  - [x] Update imports ở `src/types.ts` để import từ shared
  - [x] Update imports ở `functions/src/types.ts` để import từ shared
  - [x] Xóa duplicate enums: `UserStatus`, `PostType`, `Visibility`, `NotificationType`, `ReportType`, `FriendRequestStatus`, `ReportStatus`
  - [x] Test build cả frontend và functions

- [x] **2. Thống nhất Naming Convention**
  - [x] Đổi `ReactionType` enum values từ UPPERCASE sang lowercase
  - [x] Đổi `AppNotification` interface thành `Notification`
  - [x] Update tất cả references trong codebase
  - [x] Update Firestore rules nếu có reference đến enum values

- [x] **3. Fix Type Safety - Optional vs Required Fields**
  - [x] `User.role`: Đổi từ optional sang required với default 'user'
  - [x] `Post.type`: Đổi từ optional sang required với default NORMAL
  - [x] `Conversation.creatorId`: Đổi từ optional sang required
  - [x] `Conversation.adminIds`: Đổi từ optional sang required array (default [])
  - [x] `Conversation.pinnedBy`: Đổi từ optional sang required array (default [])
  - [x] `Conversation.archivedBy`: Đổi từ optional sang required array (default [])
  - [x] `Conversation.markedUnreadBy`: Đổi từ optional sang required array (default [])
  - [x] `Conversation.deletedBy`: Đổi từ optional sang required array (default [])
  - [x] `Conversation.blockedBy`: Đổi từ optional sang required array (default [])
  - [x] `Message.readBy`: Đổi từ optional sang required array (default [])
  - [x] `Message.deliveredTo`: Đổi từ optional sang required array (default [])
  - [x] `Message.deletedBy`: Đổi từ optional sang required array (default [])
  - [x] Update application logic để set default values khi create
  - [x] Update Firestore rules để validate required fields

## Phase 2: Data Integrity & Audit Trail (Priority: HIGH)

- [x] **4. Thêm Timestamp Fields**
  - [x] Thêm `User.updatedAt: Date` vào interface
  - [x] Update `userService.updateProfile()` để set updatedAt = serverTimestamp()
  - [x] Update convertDocToUser để convert updatedAt timestamp
  - [x] Thêm `Comment.isEdited?: boolean` và `Comment.editedAt?: Date` vào interface
  - [x] Update `commentService.updateComment()` để set isEdited và editedAt
  - [x] Update convertDocToComment để convert editedAt timestamp
  - [x] Update Firestore rules để cho phép edit comment fields
  - [x] Update commentStore để reflect isEdited và editedAt trong UI
  - [x] Test thoroughly

- [ ] **5. Thêm Audit Trail Fields**
  - [ ] Tạo `SoftDeletableEntity` interface với `deletedAt`, `deletedBy`
  - [ ] Tạo `EditableEntity` interface với `isEdited`, `editedAt`, `editedBy`
  - [ ] Thêm soft delete fields vào `Post`
  - [ ] Thêm soft delete fields vào `Comment`
  - [ ] Thêm `editedBy` vào `Post` và `Comment`
  - [ ] Update delete logic để soft delete thay vì hard delete
  - [ ] Update queries để filter out deleted items

- [ ] **6. Document Relationships với JSDoc**
  - [ ] Thêm JSDoc cho `Comment.postId` (CASCADE DELETE)
  - [ ] Thêm JSDoc cho `Comment.userId` (SET NULL)
  - [ ] Thêm JSDoc cho `Comment.parentId` (CASCADE DELETE)
  - [ ] Thêm JSDoc cho `FriendRequest.senderId` và `receiverId`
  - [ ] Thêm JSDoc cho `Message.conversationId`
  - [ ] Thêm JSDoc cho `Report.targetId` và `targetOwnerId`

## Phase 3: Optimization & Scalability (Priority: MEDIUM)

- [ ] **7. Dư thừa và bất đồng bộ dữ liệu**
  - [ ] Xóa `participants: User[]` từ `Conversation` interface (đã có `participantIds`)
  - [ ] Tạo Cloud Function để đồng bộ `lastMessagePreview` khi message bị edit/delete
  - [ ] Tạo Cloud Function để đồng bộ `replyToSnippet` khi message gốc bị edit/delete
  - [ ] Test cascade updates

- [ ] **8. Refactor Reaction Pattern - Tạo Mixin Interface**
  - [ ] Tạo `ReactableEntity` interface với `reactionCount`, `reactionSummary`
  - [ ] Update `Post` để extend `ReactableEntity`
  - [ ] Update `Comment` để extend `ReactableEntity`
  - [ ] Update `Message` để extend `ReactableEntity`
  - [ ] Xóa `myReaction` từ database types (computed field, chỉ ở client)
  - [ ] Update queries để compute `myReaction` ở client-side

- [ ] **9. Tối ưu Conversation Type**
  - [ ] Đổi `mutedUsers: Record<string, boolean>` thành `mutedBy: string[]`
  - [ ] Tách `typingUsers` ra khỏi Firestore (dùng RTDB hoặc ephemeral state)
  - [ ] Tạo `ConversationRealtimeState` interface riêng cho real-time data
  - [ ] Update logic để handle typing indicators qua RTDB
  - [ ] Đổi `pinnedBy`, `archivedBy`, `markedUnreadBy` thành required arrays

- [ ] **10. Điểm nghẽn cổ chai & Giới hạn 1MB Firestore**
  - [ ] Đánh giá size của `readBy`, `deliveredTo` arrays trong large groups
  - [ ] Nếu cần: Chuyển `readBy` sang subcollection `messages/{id}/readReceipts/{userId}`
  - [ ] Nếu cần: Chuyển `deliveredTo` sang subcollection
  - [ ] Nếu cần: Tách `unreadCount` sang subcollection cho large groups
  - [ ] Monitor document sizes và set up alerts

## Phase 4: Security & Data Cleanup (Priority: MEDIUM)

- [ ] **11. Lỗ hổng / Bất ổn trong Rules và Phân quyền**
  - [ ] Thêm schema validation vào Firestore rules cho `users` collection
  - [ ] Validate `request.resource.data.keys()` để chặn unknown fields
  - [ ] Di chuyển conversation participant check sang custom claims (nếu có thể)
  - [ ] Optimize rules để giảm document reads
  - [ ] Test security rules với Firebase Emulator

- [ ] **12. Quản lý dọn dẹp rác dữ liệu (Orphaned Data)**
  - [ ] Tạo Cloud Function `onPostDeleted` để xóa cascade:
    - [ ] Xóa tất cả comments của post
    - [ ] Xóa tất cả reactions của post
    - [ ] Xóa notifications liên quan
  - [ ] Tạo Cloud Function `onConversationDeleted` để xóa cascade:
    - [ ] Xóa tất cả messages trong conversation
    - [ ] Xóa message reactions
  - [ ] Tạo Cloud Function `onCommentDeleted` để xóa cascade:
    - [ ] Xóa tất cả replies (nested comments)
    - [ ] Xóa comment reactions
  - [ ] Tạo Cloud Function `onUserDeleted` để cleanup:
    - [ ] Anonymize user's posts/comments (hoặc delete)
    - [ ] Delete user's friend requests
    - [ ] Remove user from conversations
  - [ ] Test cascade deletes thoroughly

- [ ] **13. Triển khai Subcollection cho Reactions**
  - [ ] Tạo subcollection `posts/{postId}/reactions/{userId}`
  - [ ] Tạo subcollection `comments/{commentId}/reactions/{userId}`
  - [ ] Tạo subcollection `messages/{messageId}/reactions/{userId}`
  - [ ] Update Cloud Functions để maintain `reactionCount` và `reactionSummary`
  - [ ] Update queries để fetch reactions khi cần
  - [ ] Migration script để move existing reactions

## Phase 5: Documentation & Validation (Priority: LOW)

- [ ] **14. Thêm Validation Constraints Documentation**
  - [ ] Thêm JSDoc cho `User.name` (3-50 characters)
  - [ ] Thêm JSDoc cho `User.email` (valid email format)
  - [ ] Thêm JSDoc cho `User.bio` (max 500 characters)
  - [ ] Thêm JSDoc cho `Post.content` (max 5000 characters)
  - [ ] Thêm JSDoc cho `Post.images` (max 10 images)
  - [ ] Thêm JSDoc cho `Post.videos` (max 3 videos)
  - [ ] Thêm JSDoc cho `Message.content` (max 2000 characters)
  - [ ] Thêm JSDoc cho `Message.fileSize` (max 10MB)
  - [ ] Consider implementing Zod schemas cho runtime validation

- [ ] **15. Tạo Query & Error Types**
  - [ ] Tạo `PostQueryParams` interface
  - [ ] Tạo `CommentQueryParams` interface
  - [ ] Tạo `MessageQueryParams` interface
  - [ ] Tạo `ErrorCode` enum
  - [ ] Tạo `ApiError` interface
  - [ ] Tạo `ApiResponse<T>` generic type
  - [ ] Update API handlers để use standardized types

## Testing & Deployment

- [ ] **16. Testing**
  - [ ] Unit tests cho shared types
  - [ ] Integration tests cho Cloud Functions
  - [ ] Security rules tests với Firebase Emulator
  - [ ] E2E tests cho critical flows
  - [ ] Performance tests cho large groups/conversations

- [ ] **17. Deployment**
  - [ ] Deploy Phase 1 changes
  - [ ] Monitor for issues
  - [ ] Deploy Phase 2 changes
  - [ ] Run data migration scripts
  - [ ] Deploy Phase 3 changes
  - [ ] Deploy Phase 4 changes
  - [ ] Final documentation update

---

## Ghi chú quan trọng:

⚠️ **Trước khi bắt đầu mỗi phase:**
- Backup database
- Test trên staging environment
- Có rollback plan
- Communicate với team

⚠️ **Khi làm breaking changes:**
- Use feature flags
- Gradual rollout
- Monitor error rates
- Keep backward compatibility khi có thể

⚠️ **Data migration:**
- Test migration script trên sample data trước
- Run migration trong off-peak hours
- Monitor progress và có thể pause/resume
- Verify data integrity sau migration

---

**Ước tính thời gian:**
- Phase 1: 2-3 ngày
- Phase 2: 3-4 ngày
- Phase 3: 4-5 ngày
- Phase 4: 3-4 ngày
- Phase 5: 2-3 ngày
- Testing & Deployment: 3-5 ngày

**Tổng:** ~3-4 tuần (với 1 developer full-time)
