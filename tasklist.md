# Database Types Audit Report - Báo Cáo Đánh Giá Types

## 📋 Tổng Quan
Audit toàn bộ database types và cấu trúc dữ liệu của hệ thống social network. Phát hiện nhiều vấn đề nghiêm trọng về thiết kế, tổ chức, và triển khai.

---

## 🔴 CÁC VẤN ĐỀ NGHIÊM TRỌNG

### 1. ~~THIẾU CONSISTENCY TRONG TIMESTAMP FIELDS~~ ✅ RESOLVED
**Mức độ:** ~~🔴 Critical~~ → ✅ Not an issue

**Kết luận sau thảo luận:**
- Post/Comment/Message có `editedAt` - track user content edits (đủ cho use case)
- User/FriendRequest/Conversation có `updatedAt` - track any changes (cần thiết)
- Không cần consistency - mỗi entity có needs khác nhau
- Không có use case thực tế cần `updatedAt` cho Post/Comment/Message
- YAGNI principle - không thêm complexity không cần thiết

**Quyết định:**
- [x] Giữ nguyên thiết kế hiện tại
- [x] Không thêm `updatedAt` vào Post/Comment/Message

---

### 2. ~~SOFT DELETE KHÔNG NHẤT QUÁN~~ ✅ RESOLVED
**Mức độ:** ~~🔴 Critical~~ → ✅ Not an issue

**Kết luận sau thảo luận:**
- Có 2 loại deletion khác nhau về business logic:
  - **Global deletion** (Post/Comment): Xóa cho TẤT CẢ users → `status` enum
  - **Per-user deletion** (Message/Conversation): Mỗi user tự xóa → `deletedBy[]`
- Message không cần `deletedAt` vì:
  - `memberJoinedAt` đã handle rejoin scenarios (conversation-level cutoff)
  - `deletedBy[]` đủ cho per-message deletion trong session
  - Không có cleanup job cho messages
- Conversation cần `deletedAt` vì:
  - Dùng làm cutoff point: `effectiveJoinedAt = max(joinedAt, deletedAt)`
  - Logic rejoin: chỉ thấy messages sau khi rejoin
- Design là intentional và correct, hoạt động tốt

**Quyết định:**
- [x] Giữ nguyên thiết kế hiện tại
- [x] Không cần chuẩn hóa - mỗi entity có needs khác nhau

---

### 3. ~~THIẾU INDEXES VÀ COMPOSITE KEYS~~ ✅ COMPLETED
**Mức độ:** ~~🔴 Critical~~ → ✅ Fixed

**Vấn đề đã phát hiện:**
- Posts queries thiếu `status` field trong indexes
- Comments queries thiếu `status` field trong indexes
- Một số indexes không match với queries thực tế
- Thiếu documentation về indexes

**Ảnh hưởng nếu không fix:**
- Firestore sẽ throw error khi production: "The query requires an index"
- Performance kém, scan toàn bộ documents
- Chi phí read operations cao

**Đã triển khai:**
- [x] Scan toàn bộ queries trong codebase
- [x] Generate complete `firestore.indexes.json` với 14 composite indexes
- [x] Thêm indexes cho Posts: `userId + status + createdAt`
- [x] Thêm indexes cho Posts: `userId + status + visibility + createdAt`
- [x] Thêm indexes cho Comments: `postId + parentId + status + createdAt DESC`
- [x] Thêm indexes cho Comments: `postId + parentId + status + createdAt ASC`
- [x] Tạo `INDEXES_DOCUMENTATION.md` với:
  - Chi tiết từng index và use case
  - Query examples
  - Deployment instructions
  - Troubleshooting guide

**Next steps:**
- [ ] Deploy indexes: `firebase deploy --only firestore:indexes`
- [ ] Monitor index creation status in Firebase Console
- [ ] Test queries after indexes are enabled

---

### 4. REACTION SYSTEM THIẾT KẾ SAI
**Mức độ:** 🔴 Critical

**Vấn đề:**
```typescript
// Trong Post/Comment/Message
reactionCount: number;
reactionSummary: Record<string, number>; // {"like": 5, "love": 3}

// Nhưng reactions lưu ở subcollection
// posts/{postId}/reactions/{userId} = {type: "like"}
```

**Vấn đề cụ thể:**
- `reactionCount` và `reactionSummary` phải được sync bởi Cloud Functions
- Nếu CF fail → data inconsistent
- Không có mechanism để verify/repair data
- Race conditions khi nhiều users react cùng lúc

**Ảnh hưởng:**
- Data corruption risk cao
- Khó debug khi số liệu sai
- Performance overhead do phải maintain aggregated data

**Giải pháp:**
- [ ] Thêm `lastSyncedAt` timestamp để track sync status
- [ ] Implement verification function để check consistency
- [ ] Thêm retry mechanism trong CF
- [ ] Document rõ ràng về eventual consistency

---

### 5. CONVERSATION STRUCTURE QUÁ PHỨC TẠP
**Mức độ:** 🔴 Critical

**Vấn đề:**
```typescript
interface Conversation {
  participantIds: string[];
  participants: User[];  // ❌ Denormalized data
  lastMessage?: LastMessagePreview;  // ❌ Nested object phức tạp
  unreadCount: Record<string, number>;
  pinnedBy: string[];
  mutedBy: string[];
  archivedBy: string[];
  markedUnreadBy: string[];
  memberJoinedAt?: Record<string, Date>;
  deletedBy: string[];
  deletedAt?: Record<string, Date>;
  blockedBy: string[];
}
```

**Vấn đề cụ thể:**
- Lưu cả `participants: User[]` → data duplication nghiêm trọng
- Quá nhiều arrays và Records → document size lớn
- Mỗi action cần update nhiều fields
- Không scale khi group chat có nhiều members

**Ảnh hưởng:**
- Document size limit (1MB) có thể bị vượt
- Write operations tốn kém
- Data staleness (participants data cũ)
- Query performance kém

**Giải pháp:**
- [ ] XÓA field `participants: User[]` - chỉ giữ `participantIds`
- [ ] Tách per-user settings ra subcollection:
  ```
  conversations/{convId}/members/{userId} = {
    joinedAt, isPinned, isMuted, isArchived, 
    markedUnread, deletedAt, isBlocked
  }
  ```
- [ ] Giữ `lastMessage` nhưng simplify structure

---

### 6. MESSAGE TYPE THIẾU METADATA
**Mức độ:** 🟡 High

**Vấn đề:**
```typescript
interface Message {
  type: MessageType; // TEXT, IMAGE, VIDEO, FILE, VOICE, SYSTEM, CALL
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  // ❌ Thiếu: mimeType, duration (voice/video), dimensions (image)
}
```

**Ảnh hưởng:**
- Không thể hiển thị đúng UI cho từng loại file
- Không validate được file types
- Thiếu thông tin cho media player

**Giải pháp:**
- [ ] Thêm `mimeType?: string`
- [ ] Thêm `duration?: number` (cho voice/video)
- [ ] Thêm `dimensions?: {width: number, height: number}` (cho image/video)
- [ ] Thêm `thumbnailUrl?: string` (cho video)

---

### 7. NOTIFICATION DATA STRUCTURE KHÔNG TYPE-SAFE
**Mức độ:** 🟡 High

**Vấn đề:**
```typescript
interface Notification {
  type: NotificationType;
  data: {  // ❌ Không type-safe
    postId?: string;
    commentId?: string;
    friendRequestId?: string;
    contentSnippet?: string;
    reportId?: string;
  };
}
```

**Vấn đề cụ thể:**
- Mỗi `NotificationType` cần data khác nhau nhưng không enforce
- Có thể có data không liên quan (vd: LIKE_POST có reportId)
- Khó validate và debug

**Ảnh hưởng:**
- Runtime errors khi access wrong fields
- Khó maintain khi thêm notification types mới
- TypeScript không catch được lỗi

**Giải pháp:**
- [ ] Dùng discriminated unions:
```typescript
type NotificationData = 
  | { type: 'LIKE_POST', postId: string, contentSnippet?: string }
  | { type: 'COMMENT_POST', postId: string, commentId: string, contentSnippet: string }
  | { type: 'FRIEND_REQUEST', friendRequestId: string }
  | { type: 'REPORT_NEW', reportId: string }
  // ...
```

---

### 8. THIẾU VALIDATION CONSTRAINTS
**Mức độ:** 🟡 High

**Vấn đề:**
- Không có min/max length cho strings
- Không có limits cho arrays (images, videos)
- Không có validation cho enums
- Không có format validation (email, URL)

**Ảnh hưởng:**
- Users có thể upload quá nhiều files
- Content có thể quá dài → performance issues
- Invalid data có thể được lưu

**Giải pháp:**
- [ ] Document constraints trong JSDoc comments:
```typescript
interface Post {
  /** @minLength 1 @maxLength 5000 */
  content: string;
  /** @maxItems 10 */
  images?: string[];
  /** @maxItems 5 */
  videos?: string[];
}
```
- [ ] Tạo validation schemas (Zod/Yup)

---

### 9. ENUM NAMING KHÔNG CONSISTENT
**Mức độ:** 🟡 Medium

**Vấn đề:**
```typescript
// Một số dùng UPPER_SNAKE_CASE
enum UserStatus { ONLINE, OFFLINE, BANNED }

// Một số dùng lowercase
enum Gender { MALE = "male", FEMALE = "female" }

// Một số dùng snake_case values
enum ReportReason { 
  HARASSMENT_VIOLENCE = "harassment_violence"
}
```

**Giải pháp:**
- [ ] Chuẩn hóa: Enum keys = UPPER_SNAKE_CASE, values = lowercase

---

### 10. THIẾU SECURITY & PRIVACY FIELDS
**Mức độ:** 🟡 High

**Vấn đề:**
- User không có `isPrivate` flag
- Không có `blockedUsers` list
- Không có `reportCount` để track spam users
- Không có `verifiedAt` cho email verification

**Giải pháp:**
- [ ] Thêm vào User interface:
```typescript
interface User {
  isPrivate?: boolean;
  blockedUserIds?: string[];
  reportCount?: number;
  emailVerified?: boolean;
  emailVerifiedAt?: Date;
  phoneNumber?: string;
  phoneVerified?: boolean;
}
```

---

### 11. MISSING AUDIT TRAIL
**Mức độ:** 🟡 High

**Vấn đề:**
- Không track được WHO made changes
- Không có version history
- Không có change logs

**Giải pháp:**
- [ ] Thêm audit fields:
```typescript
interface AuditableEntity {
  createdBy: string;
  updatedBy?: string;
  version?: number;
}
```

---

### 12. REACTABLE ENTITY THIẾU THÔNG TIN
**Mức độ:** 🟡 Medium

**Vấn đề:**
```typescript
interface ReactableEntity {
  reactionCount: number;
  reactionSummary: Record<string, number>;
  // ❌ Thiếu: topReactors, lastReactionAt
}
```

**Giải pháp:**
- [ ] Thêm metadata hữu ích:
```typescript
interface ReactableEntity {
  reactionCount: number;
  reactionSummary: Record<ReactionType, number>;
  lastReactionAt?: Date;
  topReactorIds?: string[]; // Top 3 reactors
}
```

---

## 📊 THỐNG KÊ VẤN ĐỀ

| Mức độ | Số lượng | Ưu tiên |
|--------|----------|---------|
| 🔴 Critical | 5 | P0 - Fix ngay |
| 🟡 High | 5 | P1 - Fix trong sprint |
| 🟡 Medium | 2 | P2 - Fix khi có thời gian |

---

## 🎯 KHUYẾN NGHỊ HÀNH ĐỘNG

### Phase 1: Critical Fixes (Week 1-2)
- [ ] Fix soft delete inconsistency
- [ ] Refactor Conversation structure
- [ ] Fix reaction system design
- [ ] Add missing timestamps
- [ ] Document indexes

### Phase 2: High Priority (Week 3-4)
- [ ] Add validation constraints
- [ ] Fix Notification type safety
- [ ] Add security fields
- [ ] Add audit trail
- [ ] Enhance Message metadata

### Phase 3: Medium Priority (Week 5-6)
- [ ] Standardize enum naming
- [ ] Add ReactableEntity metadata
- [ ] Create comprehensive documentation

---

## 📝 GHI CHÚ

**Nguyên tắc refactoring:**
- ✅ Không thay đổi logic nghiệp vụ hiện tại
- ✅ Không cần backward compatibility (làm mới hoàn toàn)
- ✅ Clean code, loại bỏ technical debt
- ✅ Chuẩn hóa naming conventions
- ✅ Type-safe và maintainable

**Rủi ro:**
- Migration data sẽ phức tạp (cần script migration)
- Cloud Functions cần update theo
- Frontend code cần refactor
- Testing cần comprehensive

---

**Người đánh giá:** Senior FullStack Developer  
**Ngày:** 2024  
**Trạng thái:** ⏳ Chờ approval để bắt đầu implementation
