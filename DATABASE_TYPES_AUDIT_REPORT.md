# Báo Cáo Audit Database Types & Design

**Ngày:** 9 tháng 3, 2026  
**Người thực hiện:** Senior FullStack Developer  
**Phạm vi:** Đánh giá thiết kế database types và implementation

---

## 1. TỔNG QUAN

Dự án sử dụng Firebase Firestore với TypeScript, có 2 file types.ts chính:
- `src/types.ts` - Frontend types (client-side)
- `functions/src/types.ts` - Backend types (Cloud Functions)

### Điểm mạnh hiện tại:
- Có sử dụng enums để đảm bảo type safety
- Có BaseEntity pattern cho các entity chính
- Firestore rules được thiết kế khá chi tiết

---

## 2. CÁC VẤN ĐỀ NGHIÊM TRỌNG

### 🔴 **VẤN ĐỀ 1: Code Duplication - Duplicate Types giữa Frontend và Backend**

**Mức độ:** CRITICAL  
**Ảnh hưởng:** Maintenance nightmare, inconsistency risk, violation of DRY principle

**Hiện trạng:**
```typescript
// src/types.ts
export enum UserStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  BANNED = "banned",
}

// functions/src/types.ts - DUPLICATE
export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BANNED = 'banned',
}
```

**Vấn đề:**
- 5 enums bị duplicate hoàn toàn: `UserStatus`, `PostType`, `Visibility`, `NotificationType`, `ReportType`, `FriendRequestStatus`, `ReportStatus`
- Khi thay đổi 1 enum phải sửa ở 2 nơi → dễ quên, dễ sai
- Không có single source of truth
- Khác biệt về quote style (" vs ') gây khó đọc

**Giải pháp:**
Tạo shared types package hoặc symlink:
```
/shared/types.ts (hoặc /types/index.ts)
  ↓ import
  ├── src/types.ts
  └── functions/src/types.ts
```

---

### 🔴 **VẤN ĐỀ 2: Inconsistent Naming Convention**

**Mức độ:** HIGH  
**Ảnh hưởng:** Code readability, developer confusion

**Hiện trạng:**

1. **Enum values không nhất quán:**
```typescript
// Uppercase
export enum ReactionType {
  LIKE = "LIKE",    // ← UPPERCASE
  LOVE = "LOVE",
}

// Lowercase
export enum UserStatus {
  ONLINE = "online",  // ← lowercase
  OFFLINE = "offline",
}
```

2. **Interface naming không rõ ràng:**
```typescript
export interface AppNotification  // ← Tại sao "App"Notification?
export interface LastMessagePreview  // ← OK
export interface NotificationData  // ← Chỉ có ở functions/src
```

**Vấn đề:**
- `ReactionType` dùng UPPERCASE trong khi tất cả enums khác dùng lowercase
- `AppNotification` có prefix "App" không cần thiết (đã rõ context)
- Không có quy ước rõ ràng cho enum values

**Giải pháp:**
- Thống nhất tất cả enum values dùng lowercase (theo convention của project)
- Đổi `AppNotification` → `Notification`
- Đổi `ReactionType` values về lowercase

---

### 🔴 **VẤN ĐỀ 3: Missing Critical Fields & Inconsistent Timestamps**

**Mức độ:** HIGH  
**Ảnh hưởng:** Data integrity, audit trail, business logic

**Hiện trạng:**

1. **Timestamp fields không nhất quán:**
```typescript
export interface BaseEntity {
  id: string;
  createdAt: Date;  // ✓ Có
}

export interface User extends BaseEntity {
  lastSeen?: Date;  // ✓ Có
  // ❌ THIẾU updatedAt
}

export interface FriendRequest extends BaseEntity {
  updatedAt?: Date;  // ✓ Có nhưng optional
}

export interface Post extends BaseEntity {
  editedAt?: Date;  // ✓ Có
  // ❌ THIẾU updatedAt (khác với editedAt)
}

export interface Comment extends BaseEntity {
  // ❌ THIẾU updatedAt
  // ❌ THIẾU editedAt (trong khi Post có)
}
```

2. **Missing audit fields:**
```typescript
export interface Post {
  // ❌ THIẾU deletedAt, deletedBy (soft delete)
  // ❌ THIẾU updatedBy (ai update cuối)
}

export interface Comment {
  // ❌ THIẾU deletedAt (soft delete)
  // ❌ THIẾU editedAt, editedBy
}
```

**Vấn đề:**
- Không có `updatedAt` ở hầu hết entities → khó track changes
- Soft delete không đồng bộ (Message có `deletedBy[]`, Post/Comment không có)
- Không track được "ai" thực hiện update/delete
- `editedAt` chỉ có ở Post, không có ở Comment

**Giải pháp:**
Thêm vào BaseEntity hoặc tạo mixin interfaces:
```typescript
export interface TimestampedEntity extends BaseEntity {
  updatedAt: Date;
}

export interface SoftDeletableEntity {
  deletedAt?: Date;
  deletedBy?: string;
}

export interface EditableEntity {
  isEdited?: boolean;
  editedAt?: Date;
  editedBy?: string;
}
```

---

### 🔴 **VẤN ĐỀ 4: Type Safety Issues - Optional vs Required Fields**

**Mức độ:** HIGH  
**Ảnh hưởng:** Runtime errors, data validation issues

**Hiện trạng:**

1. **Critical fields là optional:**
```typescript
export interface User {
  role?: 'admin' | 'user';  // ❌ Role nên required với default 'user'
  status: UserStatus;       // ✓ Đúng - required
}

export interface Post {
  type?: PostType;  // ❌ Nên required với default NORMAL
  visibility: Visibility;  // ✓ Đúng
}

export interface Conversation {
  groupName?: string;   // ✓ OK - chỉ group mới có
  groupAvatar?: string; // ✓ OK
  creatorId?: string;   // ❌ Nên required
  adminIds?: string[];  // ❌ Nên required (ít nhất là [])
}
```

2. **Inconsistent array initialization:**
```typescript
export interface Message {
  readBy?: string[];      // ❌ Nên default []
  deliveredTo?: string[]; // ❌ Nên default []
  deletedBy?: string[];   // ❌ Nên default []
}

export interface Conversation {
  participantIds: string[];  // ✓ Required
  adminIds?: string[];       // ❌ Inconsistent
  pinnedBy?: string[];       // ❌ Inconsistent
}
```

**Vấn đề:**
- Optional arrays gây khó khăn khi check: `arr?.includes()` vs `arr.includes()`
- `role` và `type` nên có default value thay vì optional
- `creatorId` của Conversation không thể optional (ai tạo group?)

**Giải pháp:**
```typescript
export interface User {
  role: 'admin' | 'user';  // Required, default 'user' ở application logic
}

export interface Post {
  type: PostType;  // Required, default NORMAL
}

export interface Conversation {
  creatorId: string;    // Required
  adminIds: string[];   // Required, default []
  pinnedBy: string[];   // Required, default []
}
```

---

### 🟡 **VẤN ĐỀ 5: Missing Relationships & Foreign Key Documentation**

**Mức độ:** MEDIUM  
**Ảnh hưởng:** Developer experience, documentation

**Hiện trạng:**
```typescript
export interface Comment {
  postId: string;      // → Post.id (không có comment)
  userId: string;      // → User.id (không có comment)
  parentId?: string;   // → Comment.id (không có comment)
  replyToUserId?: string;  // → User.id (không có comment)
}

export interface FriendRequest {
  senderId: string;    // → User.id
  receiverId: string;  // → User.id
}
```

**Vấn đề:**
- Không có JSDoc comments để document relationships
- Không rõ cascade delete behavior
- Không rõ referential integrity rules

**Giải pháp:**
```typescript
export interface Comment extends BaseEntity {
  /** Reference to Post.id - CASCADE DELETE when post deleted */
  postId: string;
  
  /** Reference to User.id - SET NULL when user deleted */
  userId: string;
  
  /** Reference to parent Comment.id for nested replies - CASCADE DELETE */
  parentId?: string;
  
  /** Reference to User.id being replied to */
  replyToUserId?: string;
}
```

---

### 🟡 **VẤN ĐỀ 6: Inconsistent Reaction Pattern**

**Mức độ:** MEDIUM  
**Ảnh hưởng:** Code duplication, maintenance

**Hiện trạng:**
```typescript
// Pattern lặp lại ở Post, Comment, Message
export interface Post {
  reactionCount?: number;
  reactionSummary?: Record<string, number>;
  myReaction?: string;
}

export interface Comment {
  reactionCount?: number;
  reactionSummary?: Record<string, number>;
  myReaction?: string;
}

export interface Message {
  reactionCount?: number;
  reactionSummary?: Record<string, number>;
  myReaction?: string;
}
```

**Vấn đề:**
- Code duplication - 3 interfaces có cùng pattern
- `myReaction` là computed field (không nên ở database type)
- Không có type safety cho `reactionSummary` keys

**Giải pháp:**
```typescript
export interface ReactableEntity {
  reactionCount: number;  // Default 0
  reactionSummary: Partial<Record<ReactionType, number>>;
}

export interface Post extends BaseEntity, ReactableEntity {
  // ... other fields
}

// myReaction nên là computed field ở client, không lưu DB
```

---

### 🟡 **VẤN ĐỀ 7: Conversation Type - Overly Complex**

**Mức độ:** MEDIUM  
**Ảnh hưởng:** Performance, complexity

**Hiện trạng:**
```typescript
export interface Conversation extends BaseEntity {
  updatedAt: Date;
  participantIds: string[];
  participants: User[];  // ❌ Denormalized data - risk of stale data
  lastMessage?: LastMessagePreview;
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
  typingUsers?: string[];  // ❌ Real-time data không nên ở DB
  memberJoinedAt?: Record<string, Date>;
  deletedBy?: string[];
  deletedAt?: Record<string, Date>;
  blockedBy?: string[];
}
```

**Vấn đề:**
- `participants: User[]` - denormalized, có thể stale
- `typingUsers` - real-time data không nên persist
- Quá nhiều optional fields (15 fields, 13 optional)
- `mutedUsers` dùng Record<string, boolean> thay vì string[]

**Giải pháp:**
```typescript
export interface Conversation extends BaseEntity {
  // Core fields
  participantIds: string[];
  isGroup: boolean;
  updatedAt: Date;
  
  // Group-specific (nếu isGroup = true)
  groupName?: string;
  groupAvatar?: string;
  creatorId?: string;
  adminIds: string[];  // Default []
  
  // User-specific settings (per-user)
  pinnedBy: string[];
  mutedBy: string[];  // Đổi từ Record → array
  archivedBy: string[];
  markedUnreadBy: string[];
  deletedBy: string[];
  
  // Metadata
  lastMessage?: LastMessagePreview;
  unreadCount: Record<string, number>;
  memberJoinedAt: Record<string, Date>;
}

// Tách riêng real-time data
export interface ConversationRealtimeState {
  conversationId: string;
  typingUsers: string[];
  onlineUsers: string[];
}
```

---

### 🟡 **VẤN ĐỀ 8: Missing Validation Constraints**

**Mức độ:** MEDIUM  
**Ảnh hưởng:** Data quality, business logic

**Hiện trạng:**
```typescript
export interface User {
  name: string;  // ❌ Không có min/max length
  email: string;  // ❌ Không có format validation
  bio?: string;  // ❌ Không có max length
}

export interface Post {
  content: string;  // ❌ Không có max length
  images?: string[];  // ❌ Không có max items
  videos?: string[];  // ❌ Không có max items
}

export interface Message {
  content: string;  // ❌ Không có max length
  fileSize?: number;  // ❌ Không có max size
}
```

**Vấn đề:**
- Không có validation constraints trong types
- Có thể upload unlimited images/videos
- Không có business rules documentation

**Giải pháp:**
Thêm JSDoc với validation rules:
```typescript
export interface User extends BaseEntity {
  /** User display name (3-50 characters) */
  name: string;
  
  /** Valid email address */
  email: string;
  
  /** User bio (max 500 characters) */
  bio?: string;
}

export interface Post extends BaseEntity {
  /** Post content (max 5000 characters) */
  content: string;
  
  /** Image URLs (max 10 images) */
  images?: string[];
  
  /** Video URLs (max 3 videos) */
  videos?: string[];
}

// Hoặc dùng Zod schema cho runtime validation
```

---

## 3. CÁC VẤN ĐỀ KHÁC (Minor)

### 🟢 **VẤN ĐỀ 9: Missing Index Types**

**Hiện trạng:**
- Có `firestore.indexes.json` nhưng không có corresponding types
- Không có type cho query parameters

**Giải pháp:**
```typescript
export interface PostQueryParams {
  userId?: string;
  visibility?: Visibility;
  limit?: number;
  startAfter?: string;
}
```

### 🟢 **VẤN ĐỀ 10: Missing Error Types**

**Hiện trạng:**
- Không có error types cho API responses
- Không có status code enums

**Giải pháp:**
```typescript
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
}
```

---

## 4. KHUYẾN NGHỊ ƯU TIÊN

### Priority 1 - CRITICAL (Sửa ngay):
1. ✅ **Tạo shared types** - Loại bỏ duplication
2. ✅ **Thống nhất naming** - ReactionType về lowercase
3. ✅ **Fix optional fields** - role, type, creatorId, arrays

### Priority 2 - HIGH (Sửa trong sprint này):
4. ✅ **Thêm timestamp fields** - updatedAt cho tất cả entities
5. ✅ **Thêm audit fields** - deletedAt, deletedBy, editedBy
6. ✅ **Document relationships** - JSDoc cho foreign keys

### Priority 3 - MEDIUM (Sửa trong sprint tới):
7. ✅ **Refactor Conversation** - Tách real-time state
8. ✅ **Create mixin interfaces** - ReactableEntity, SoftDeletableEntity
9. ✅ **Add validation docs** - JSDoc với constraints

### Priority 4 - LOW (Nice to have):
10. ✅ **Add query types** - Type-safe query parameters
11. ✅ **Add error types** - Standardized error handling

---

## 5. KẾ HOẠCH TRIỂN KHAI

### Phase 1: Foundation (1-2 ngày)
```
1. Tạo /shared/types.ts hoặc /types/index.ts
2. Move common enums vào shared
3. Update imports ở src/ và functions/src/
4. Thống nhất naming conventions
```

### Phase 2: Type Safety (2-3 ngày)
```
1. Fix optional → required fields
2. Thêm default values vào application logic
3. Update Firestore rules nếu cần
4. Test thoroughly
```

### Phase 3: Audit Trail (2-3 ngày)
```
1. Thêm updatedAt, deletedAt, editedAt
2. Update Cloud Functions để populate fields
3. Migration script cho existing data (nếu cần)
```

### Phase 4: Documentation (1 ngày)
```
1. Thêm JSDoc cho tất cả interfaces
2. Document relationships và cascade rules
3. Add validation constraints
```

---

## 6. RỦI RO & GIẢM THIỂU

### Rủi ro khi refactor:
- ❌ Breaking changes cho existing code
- ❌ Data migration issues
- ❌ Performance impact

### Cách giảm thiểu:
- ✅ Làm từng phase nhỏ, test kỹ
- ✅ Backward compatible khi có thể
- ✅ Feature flags cho changes lớn
- ✅ Rollback plan cho mỗi phase

---

## 7. KẾT LUẬN

### Đánh giá tổng quan:
- **Thiết kế hiện tại:** 6/10
- **Type safety:** 5/10
- **Maintainability:** 4/10
- **Documentation:** 3/10

### Sau khi fix:
- **Thiết kế:** 8.5/10
- **Type safety:** 9/10
- **Maintainability:** 8.5/10
- **Documentation:** 8/10

### Tổng kết:
Codebase có foundation tốt nhưng cần cải thiện về:
1. Code duplication (critical)
2. Type consistency (high)
3. Audit trail (high)
4. Documentation (medium)

Tất cả issues đều có thể fix trong khả năng sửa đổi nhỏ, không cần refactor lớn, và không ảnh hưởng đến logic nghiệp vụ hiện tại.

---

**Người lập báo cáo:** Senior FullStack Developer  
**Ngày:** 9/3/2026
