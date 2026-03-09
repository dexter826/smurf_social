# Database Types Audit Report - Báo Cáo Đánh Giá Database Types

## 📋 Tổng Quan
Dự án: Social Network Application (Firebase/Firestore)
Ngày audit: 2026-03-09
Phạm vi: `src/types.ts`, `shared/types.ts` và toàn bộ database schema

---

## 🔴 VẤN ĐỀ NGHIÊM TRỌNG CẦN SỬA NGAY

### 1. TIMESTAMP INCONSISTENCY - Vấn đề nghiêm trọng nhất
**Mức độ:** 🔴 CRITICAL

**Vấn đề:**
- Types định nghĩa `Date` nhưng Firestore lưu `Timestamp`
- Conversion logic không nhất quán giữa các services
- Có nơi dùng `serverTimestamp()`, có nơi dùng `Timestamp.now()`, có nơi dùng `new Date()`
- Type casting không an toàn: `serverTimestamp() as unknown as Date`

**Ví dụ lỗi:**
```typescript
// types.ts - định nghĩa Date
interface BaseEntity {
  createdAt: Date;
}

// friendService.ts - lưu Timestamp
createdAt: Timestamp.now()

// messageService.ts - lưu serverTimestamp
createdAt: serverTimestamp() as unknown as Date  // ❌ Type casting nguy hiểm

// userService.ts - lưu cả 2 cách
createdAt: new Date()  // Client-side
updatedAt: serverTimestamp()  // Server-side
```

**Hậu quả:**
- Runtime errors khi access timestamp methods
- Data inconsistency
- Khó debug và maintain

---

### 2. MISSING REQUIRED FIELDS
**Mức độ:** 🔴 CRITICAL

**Vấn đề:**
- `BaseEntity.createdAt` là required nhưng nhiều nơi không set
- `Conversation.updatedAt` là required nhưng có thể undefined khi query
- `ConversationMember` thiếu `id` field trong type definition

**Ví dụ lỗi:**
```typescript
// types.ts
interface BaseEntity {
  id: string;
  createdAt: Date;  // Required
}

// Nhưng khi create:
const messageData = {
  conversationId,
  senderId,
  content,
  // ❌ Thiếu createdAt, id
};
await addDoc(collection(db, 'messages'), messageData);
```

---

### 3. SOFT DELETE KHÔNG NHẤT QUÁN
**Mức độ:** 🔴 CRITICAL

**Vấn đề:**
- `SoftDeletableEntity` interface tồn tại nhưng không được sử dụng đúng cách
- Một số entity có `deletedAt`, một số không
- Logic soft delete không consistent

**Ví dụ:**
```typescript
// types.ts - Có interface nhưng không extend
interface SoftDeletableEntity {
  deletedAt?: Date;
  deletedBy?: string;
}

// Post, Comment có deletedAt + deletedBy
interface Post extends BaseEntity {
  deletedAt?: Date;
  deletedBy?: string;  // ✅
}

// Message chỉ có deletedBy array
interface Message extends BaseEntity {
  deletedBy: string[];  // ❌ Khác logic
}

// ConversationMember có deletedAt nhưng không có deletedBy
interface ConversationMember {
  deletedAt?: Date;  // ❌ Thiếu deletedBy
}

// FriendRequest không có soft delete, dùng hard delete
// ❌ Không consistent
```

---

### 4. REACTION SYSTEM KHÔNG CHUẨN
**Mức độ:** 🔴 CRITICAL

**Vấn đề:**
- `ReactableEntity` interface nhưng không có subcollection type definition
- Reaction data structure không được type-safe
- Reaction counter logic phụ thuộc Cloud Functions nhưng không có backup

**Ví dụ:**
```typescript
// types.ts
interface ReactableEntity {
  reactionCount: number;
  reactionSummary: Record<string, number>;  // ❌ Không type-safe
}

// Service layer - không có type cho reaction document
await setDoc(reactionRef, { type: reaction });  // ❌ Không có type
```

---

### 5. CONVERSATION MEMBER SUBCOLLECTION THIẾT KẾ SAI
**Mức độ:** 🔴 CRITICAL

**Vấn đề:**
- `ConversationMember` là subcollection nhưng có `conversationId` redundant
- Thiếu `id` field trong type
- Mixing conversation-level data với member-level data

**Ví dụ:**
```typescript
// types.ts
interface ConversationMember extends BaseEntity {  // ❌ Extend BaseEntity nhưng không có id
  conversationId: string;  // ❌ Redundant - đã là subcollection
  userId: string;
  joinedAt: Date;
  isPinned: boolean;  // ✅ Member-specific
  isMuted: boolean;   // ✅ Member-specific
  isArchived: boolean;  // ✅ Member-specific
  markedUnread: boolean;  // ✅ Member-specific
  unreadCount: number;  // ✅ Member-specific
  deletedAt?: Date;
}

// Firestore structure:
// conversations/{conversationId}/members/{userId}
// => conversationId là redundant
```

---

### 6. MESSAGE TYPE DEFINITION KHÔNG ĐẦY ĐỦ
**Mức độ:** 🟡 HIGH

**Vấn đề:**
- `Message` interface có quá nhiều optional fields không rõ ràng
- Không có discriminated union cho các message types khác nhau
- File-related fields không được group

**Ví dụ:**
```typescript
interface Message extends BaseEntity, ReactableEntity {
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  
  // File-related - nên group lại
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  
  // Reply-related - nên group lại
  replyToId?: string;
  replyToSnippet?: { senderId: string; content: string; type: MessageType; isRecalled?: boolean };
  
  // Status fields - không rõ ràng
  readBy: string[];
  deliveredTo: string[];
  deliveredAt?: Date;
  mentions?: string[];
  isRecalled?: boolean;
  recalledAt?: Date;
  deletedBy: string[];
  isForwarded?: boolean;
  isEdited?: boolean;
  editedAt?: Date;
}
```

---

### 7. ENUM VS STRING LITERAL KHÔNG NHẤT QUÁN
**Mức độ:** 🟡 HIGH

**Vấn đề:**
- Một số dùng enum, một số dùng string literal
- `User.role` dùng string literal `'admin' | 'user'` thay vì enum

**Ví dụ:**
```typescript
// Dùng enum
export enum UserStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  BANNED = "banned",
}

// Nhưng role dùng string literal
interface User extends BaseEntity {
  role: 'admin' | 'user';  // ❌ Không consistent
}
```

---

### 8. NOTIFICATION DATA STRUCTURE KHÔNG TYPE-SAFE
**Mức độ:** 🟡 HIGH

**Vấn đề:**
- `Notification.data` là object với optional fields không rõ ràng
- Không có discriminated union theo `NotificationType`

**Ví dụ:**
```typescript
interface Notification extends BaseEntity {
  receiverId: string;
  senderId: string;
  type: NotificationType;
  data: {  // ❌ Không type-safe
    postId?: string;
    commentId?: string;
    friendRequestId?: string;
    contentSnippet?: string;
    reportId?: string;
  };
  isRead: boolean;
}
```

---

### 9. MISSING INDEXES & QUERY OPTIMIZATION
**Mức độ:** 🟡 HIGH

**Vấn đề:**
- Nhiều compound queries nhưng không document indexes
- Query patterns không optimal

**Ví dụ:**
```typescript
// friendService.ts - Compound query cần index
query(
  collection(db, 'friendRequests'),
  where('senderId', '==', senderId),
  where('receiverId', '==', receiverId),
  where('status', '==', FriendRequestStatus.PENDING)
);

// commentService.ts - Compound query cần index
query(
  collection(db, 'comments'),
  where('postId', '==', postId),
  where('parentId', '==', null),
  where('status', '==', CommentStatus.ACTIVE),
  orderBy('createdAt', 'desc')
);
```

---

### 10. SECURITY & VALIDATION
**Mức độ:** 🟡 HIGH

**Vấn đề:**
- Không có validation types (Zod, Yup)
- Security checks scattered trong services
- Blocked users logic không centralized

**Ví dụ:**
```typescript
// Scattered security checks
const [receiverSec, senderSec] = await Promise.all([
  getDoc(doc(db, 'users', receiverId, 'private', 'security')),
  getDoc(doc(db, 'users', senderId, 'private', 'security')),
]);
if (receiverSec.data()?.blockedUserIds?.includes(senderId)) {
  throw new Error("Không thể gửi lời mời kết bạn cho người dùng này");
}
```

---

## 🟢 VẤN ĐỀ KHÁC CẦN CẢI THIỆN

### 11. NAMING CONVENTIONS
**Mức độ:** 🟢 MEDIUM

**Vấn đề:**
- Mix giữa camelCase và snake_case
- Một số tên không rõ nghĩa

---

### 12. MISSING DOCUMENTATION
**Mức độ:** 🟢 MEDIUM

**Vấn đề:**
- Không có JSDoc comments
- Không document collection structure
- Không document subcollections

---

### 13. TYPE EXPORTS KHÔNG TỐI ƯU
**Mức độ:** 🟢 LOW

**Vấn đề:**
- Re-export từ shared không cần thiết
- Có thể dùng `export * from` thay vì list từng item

---

## 📊 THỐNG KÊ

| Loại vấn đề | Số lượng | Mức độ |
|-------------|----------|--------|
| Critical | 5 | 🔴 |
| High | 5 | 🟡 |
| Medium | 2 | 🟢 |
| Low | 1 | 🟢 |
| **Tổng** | **13** | |

---

## 🎯 ƯU TIÊN THỰC HIỆN

### Phase 1: Critical Fixes (Tuần 1-2)
- [ ] Fix timestamp inconsistency
- [ ] Fix soft delete pattern
- [ ] Fix ConversationMember structure
- [ ] Add missing required fields
- [ ] Fix reaction system

### Phase 2: High Priority (Tuần 3-4)
- [ ] Refactor Message types
- [ ] Fix Notification data structure
- [ ] Standardize enums
- [ ] Document indexes
- [ ] Add security layer

### Phase 3: Improvements (Tuần 5-6)
- [ ] Add JSDoc documentation
- [ ] Optimize exports
- [ ] Add validation schemas
- [ ] Naming conventions cleanup

---

## ✅ CHECKLIST HOÀN THÀNH

### Critical Issues
- [ ] Timestamp inconsistency fixed
- [ ] Missing required fields added
- [ ] Soft delete pattern standardized
- [ ] Reaction system refactored
- [ ] ConversationMember structure fixed

### High Priority Issues
- [ ] Message types refactored
- [ ] Enum standardization complete
- [ ] Notification data type-safe
- [ ] Indexes documented
- [ ] Security layer added

### Medium Priority Issues
- [ ] Naming conventions applied
- [ ] Documentation added

### Low Priority Issues
- [ ] Exports optimized

---

## 📝 GHI CHÚ

1. **Không backward compatible**: Theo yêu cầu, tất cả changes sẽ là breaking changes
2. **Clean slate approach**: Loại bỏ hoàn toàn logic cũ, thiết kế lại từ đầu
3. **Type-first design**: Ưu tiên type safety và developer experience
4. **Production ready**: Đảm bảo scalability và maintainability

---

**Người thực hiện audit:** Kiro AI Assistant
**Ngày hoàn thành:** 2026-03-09
