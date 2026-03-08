# Tasklist — Smurf Social Audit & Cleanup

> **Quy tắc:** Không backward-compat. Loại bỏ hoàn toàn, clean code. Mỗi task check `[ ]` khi hoàn thành.

---

## 🔴 CRITICAL BUGS — Phá vỡ tính năng

### TASK-01 — `User.friendIds` không bao giờ được ghi vào Firestore

**Vấn đề:** `User.friendIds?: string[]` được dùng rộng rãi trong app nhưng **không có code nào ghi** field này lên user document. Source of truth là subcollection `users/{uid}/friends`. Hệ quả:

- `useFriendIds` hook trả về `[]` mãi mãi
- `ChatPage` truyền `currentUser.friendIds || []` → `currentUserFriendIds` luôn empty → **TẤT CẢ chat 1-1 bị phân loại là "Tin nhắn chờ"** (`requestConversations`)
- `useProfileData` truyền `friendIds = []` → `getUserPosts` chỉ lấy PUBLIC posts → profile của bạn bè hiện sai
- `getUserStats` trả về `friendCount = 0` vì `userDoc.data()?.friendIds` không tồn tại
- `useConversationGroups` không group đúng

**Fix:**

1. Bỏ `friendIds` khỏi `User` type và user document
2. Tất cả nơi cần friend IDs → đọc từ `useContactStore(state => state.friends.map(f => f.id))`
3. Đặt `useFriendIds` hook dùng `contactStore.friends` thay vì `user.friendIds`

**Files cần sửa:**

- `src/types.ts` — xóa `friendIds?: string[]` khỏi `User` interface
- `src/hooks/utils/useFriendIds.ts` — đọc từ `contactStore` thay vì `authStore`
- `src/hooks/profile/useProfileData.ts` — thay `currentUser?.friendIds` bằng hook/selector
- `src/pages/ChatPage.tsx` — thay `currentUser.friendIds || []` bằng `contactStore.friends.map(f=>f.id)`
- `src/components/ui/UserAvatar.tsx` — thay `currentUser?.friendIds?.includes(userId)` bằng contactStore
- `src/components/profile/PhotosTab.tsx` — thay `currentUser.friendIds || []`
- `src/services/userService.ts` — sửa `getUserStats` không dùng `userDoc.data()?.friendIds`

- [x] Bỏ `friendIds` khỏi `User` type
- [x] Sửa `useFriendIds` → đọc contactStore
- [x] Sửa `useProfileData` → dùng contactStore friendIds
- [x] Sửa `ChatPage` → truyền contactStore friend IDs
- [x] Sửa `UserAvatar` → dùng contactStore
- [x] Sửa `PhotosTab` → dùng contactStore
- [x] Sửa `getUserStats` → đếm từ subcollection friends, không dùng user doc

---

### TASK-02 — Block check trong `conversationService` đọc sai location

**Vấn đề:** `getOrCreateConversation` kiểm tra block bằng cách đọc `user.data().blockedUserIds` từ **user document chính**. Nhưng `userService.blockUser()` ghi vào `users/{uid}/private/security` — không bao giờ cập nhật field `blockedUserIds` trên user document. Kết quả: **block check LUÔN trả về false** → người bị chặn vẫn tạo được conversation.

**Fix:** Đọc block list từ `users/{uid}/private/security` (dùng thêm 2 getDoc) khi tạo conversation.

**Files cần sửa:**

- `src/services/chat/conversationService.ts` — `getOrCreateConversation`: thay đọc `user.data().blockedUserIds` bằng đọc `users/{uid}/private/security`

- [x] Sửa `getOrCreateConversation` đọc block từ `private/security`

---

### TASK-03 — `userService.banUser/unbanUser` không revoke token

**Vấn đề:** Admin panel (`UsersView.tsx`) gọi `userService.banUser(userId)` / `userService.unbanUser(userId)` — hàm này **chỉ** cập nhật `status` field trong Firestore, **không set Custom Claims**, **không revoke refresh tokens**. User bị ban vẫn tiếp tục xác thực bình thường. CF `banUser` mới là implementation đúng.

**Fix:** Thay `userService.banUser/unbanUser` trong `UsersView` bằng callable CF `banUser`. Xóa `banUser`/`unbanUser` khỏi `userService`.

**Files cần sửa:**

- `src/components/admin/UsersView.tsx` — gọi CF `banUser` thay vì `userService.banUser`
- `src/services/userService.ts` — xóa `banUser()` và `unbanUser()`

- [x] Sửa `UsersView` gọi CF callable `banUser`
- [x] Xóa `userService.banUser()` và `userService.unbanUser()`

---

### TASK-04 — Orphan fields `pinned: false` và `muted: false` khi tạo conversation

**Vấn đề:** `conversationService.getOrCreateConversation` lưu `pinned: false` (boolean). `groupService.createGroupConversation` lưu `pinned: false` và `muted: false`. App không bao giờ đọc field `pinned` hay `muted` — logic dùng `pinnedBy: string[]` và `mutedUsers: Record<string, boolean>`. Đây là dead data được ghi vào mỗi conversation.

**Fix:** Xóa `pinned: false` và `muted: false` khỏi create payload. Khởi tạo đúng: `pinnedBy: []` và `mutedUsers: {}`.

**Files cần sửa:**

- `src/services/chat/conversationService.ts` — xóa `pinned: false`, thêm `pinnedBy: []` nếu cần
- `src/services/chat/groupService.ts` — xóa `pinned: false`, `muted: false`, thêm `pinnedBy: []`, `mutedUsers: {}`

- [x] Sửa `conversationService.getOrCreateConversation` payload
- [x] Sửa `groupService.createGroupConversation` payload

---

## 🟡 DEAD CODE — Xóa hoàn toàn

### TASK-05 — Dead methods trong `notificationService`

**Vấn đề:**

- `createNotification()` — Firestore rules `allow create: if false` trên collection `notifications`. Hàm này sẽ luôn throw permission error. Không có nơi nào trong frontend gọi `notificationService.createNotification()`. Chỉ CF mới được tạo notification.
- `deleteNotificationsByPostId()` — Không có nơi nào gọi hàm này. CF `onPostDeleted` xử lý việc này server-side.
- `getNotifications()` — Không được gọi ở đâu. Chỉ `subscribeToNotifications` được dùng.

**Fix:** Xóa cả 3 hàm.

**Files cần sửa:**

- `src/services/notificationService.ts` — xóa `createNotification()`, `deleteNotificationsByPostId()`, `getNotifications()`

- [x] Xóa `notificationService.createNotification()`
- [x] Xóa `notificationService.deleteNotificationsByPostId()`
- [x] Xóa `notificationService.getNotifications()`

---

### TASK-06 — Dead methods trong `contactStore` và `authStore`

**Vấn đề:**

- `contactStore.fetchReceivedRequests()` và `fetchSentRequests()` — không bao giờ được gọi. App chỉ dùng `subscribeToRequests()` (realtime). Hai hàm one-time fetch này là dead code.
- `authStore.unfriendUser()` — thân hàm trống hoàn toàn, chỉ có comment. Không làm gì.
- `contactStore.acceptFriendRequest` có params `_userId` và `_friendId` không bao giờ dùng.

**Fix:** Xóa dead methods, làm gọn signature.

**Files cần sửa:**

- `src/store/contactStore.ts` — xóa `fetchReceivedRequests`, `fetchSentRequests`, clean `acceptFriendRequest` params
- `src/store/authStore.ts` — xóa `unfriendUser`

- [x] Xóa `contactStore.fetchReceivedRequests()`
- [x] Xóa `contactStore.fetchSentRequests()`
- [x] Xóa `authStore.unfriendUser()`
- [x] Clean params của `acceptFriendRequest`

---

### TASK-07 — Dead hook `useFriendIds`

**Vấn đề:** `useFriendIds` hook ở `src/hooks/utils/useFriendIds.ts` không được import/sử dụng ở bất kỳ component hay hook nào. Chỉ export từ index. Kết hợp với TASK-01: hook này cần được sửa nội dung (dùng contactStore) và sau đó sử dụng thật sự.

**Fix (kết hợp với TASK-01):** Sửa nội dung hook dùng `contactStore`, sau đó thay thế tất cả `user.friendIds` logic bằng hook này.

**Files cần sửa:**

- `src/hooks/utils/useFriendIds.ts` — Sửa implementation

- [ ] Sửa `useFriendIds` dùng `contactStore` (kết hợp TASK-01)

---

### TASK-08 — Dead fields trong `Message` type

**Vấn đề:**

- `Message.videoThumbnails?: Record<string, string>` — Không có code nào trong `messageService` hay store set field này cho messages. Thumbnails chỉ tồn tại trên `posts`, không phải `messages`.
- `Message.deliveredAt?: Date` — Redundant với `deliveredTo: string[]`. State "đã giao" được track bằng array ID, không cần timestamp riêng. Field này được set trong `createAndSendMediaMessage` nhưng không có logic nào đọc/so sánh nó ở UI.

**Fix:** Xóa `videoThumbnails` và `deliveredAt` khỏi `Message` type và tất cả nơi set chúng.

**Files cần sửa:**

- `src/types.ts` — xóa `videoThumbnails?` và `deliveredAt?` khỏi `Message`
- `src/services/chat/messageService.ts` — xóa `deliveredAt: serverTimestamp()` khi tạo message

- [ ] Xóa `Message.videoThumbnails`
- [ ] Xóa `Message.deliveredAt` và nơi set nó

---

### TASK-09 — `User.blockedUserIds` trên user document là dead field

**Vấn đề:** `User.blockedUserIds?: string[]` định nghĩa trong type. `authStore` load từ `private/security` vào `user.blockedUserIds` khi init — OK. Nhưng field này **không** tồn tại trên user Firestore document (chỉ trong `private/security`). Exposing private data qua public User type gây nhầm lẫn.

Hiện tại:

- `batchGetUsers` trả về User objects — sẽ không có `blockedUserIds` (vì không trên doc)
- `authStore` merge `blockedUserIds` vào user state từ `private/security` — đây là runtime state, không phải Firestore field
- Các component đọc `currentUser.blockedUserIds` — chỉ hoạt động do authStore merge

**Fix:** Tách riêng `blockedUserIds` khỏi `User` interface. Tạo `AuthUser extends User { blockedUserIds: string[] }` hoặc dùng separate state trong authStore.

**Files cần sửa:**

- `src/types.ts` — tách `blockedUserIds` ra khỏi `User`, đặt riêng trong authStore state
- `src/store/authStore.ts` — lưu `blockedUserIds` như state riêng, không merge vào user object
- Tất cả places dùng `user.blockedUserIds` → đọc từ authStore state riêng

- [ ] Tách `blockedUserIds` ra khỏi User type
- [ ] Sửa authStore lưu blockedUserIds riêng
- [ ] Update tất cả consumers

---

## 🟠 CODE DUPLICATION — Refactor

### TASK-10 — `extractStoragePath` + `deleteStorageFile` định nghĩa 2 lần

**Vấn đề:** Hai functions `extractStoragePath` và `deleteStorageFile` được copy-paste giống hệt trong:

- `functions/src/posts/onPostDeleted.ts`
- `functions/src/comments/onCommentDeleted.ts`

**Fix:** Tạo `functions/src/helpers/storageHelper.ts`, export 2 functions, import ở cả 2 file.

**Files cần sửa:**

- Tạo `functions/src/helpers/storageHelper.ts`
- `functions/src/posts/onPostDeleted.ts` — import từ helper
- `functions/src/comments/onCommentDeleted.ts` — import từ helper

- [ ] Tạo `storageHelper.ts` trong functions/helpers
- [ ] Refactor `onPostDeleted` dùng helper
- [ ] Refactor `onCommentDeleted` dùng helper

---

### TASK-11 — `batchGetUsers` bỏ sót conversion `birthDate`

**Vấn đề:** `userService.convertDocToUser()` convert `birthDate: convertTimestamp(data?.birthDate)` nhưng `batchGetUsers` trong `batchUtils.ts` **không** convert `birthDate`. User objects từ `batchGetUsers` có `birthDate` là Firestore Timestamp thay vì JS Date — gây lỗi tiềm ẩn khi so sánh/render date.

**Fix:** Thêm `birthDate: convertTimestamp(doc.data().birthDate)` vào `batchGetUsers`.

**Files cần sửa:**

- `src/utils/batchUtils.ts` — thêm `birthDate` conversion

- [ ] Thêm `birthDate` conversion vào `batchGetUsers`

---

### TASK-12 — `getUserStats` đếm friendCount sai

**Vấn đề:** `getUserStats` tính `friendCount` bằng `userDoc.data()?.friendIds || []`. Field `friendIds` không tồn tại trên user document → luôn trả về 0. Nên đếm từ subcollection `users/{userId}/friends`.

**Fix:** Thay `userDoc.data()?.friendIds` bằng `getCountFromServer(collection(db, 'users', userId, 'friends'))`.

**Files cần sửa:**

- `src/services/userService.ts` — sửa `getUserStats` dùng `getCountFromServer` trên friends subcollection

- [ ] Sửa `getUserStats` đếm từ subcollection

---

## 🔵 SCHEMA & INDEX — Database

### TASK-13 — Thiếu Composite Index cho `notifications`

**Vấn đề:** `subscribeToNotifications` và `getNotifications` query: `where('receiverId', '...).orderBy('createdAt', 'desc')`. Firestore cần composite index cho query này nhưng không có trong `firestore.indexes.json`.

**Fix:** Thêm index vào `firestore.indexes.json`.

- [ ] Thêm index `notifications`: `receiverId ASC` + `createdAt DESC`

---

### TASK-14 — Thiếu Composite Index cho `reports` cleanup

**Vấn đề:** Scheduled cleanup `cleanupOrphanedReports` query: `where('status', '==', 'orphaned').where('createdAt', '<', date)`. Cần composite index.

**Fix:** Thêm vào `firestore.indexes.json`.

- [ ] Thêm index `reports`: `status ASC` + `createdAt ASC`
- [ ] Thêm index `reports`: (cho `cleanupOldNotifications` nếu cần) `isRead ASC` + `createdAt ASC` trên `notifications`

---

### TASK-15 — Làm sạch `BaseEntity.updatedAt` inconsistency

**Vấn đề:** `BaseEntity` định nghĩa `updatedAt?: Date` nhưng nhiều entities không set field này khi update. `posts` dùng `isEdited/editedAt`, `comments` không có `updatedAt`, `users` không set `updatedAt`. Field này là optional noise không mang lại giá trị nhất quán.

**Fix:** Xóa `updatedAt` khỏi `BaseEntity`. Giữ lại nơi thực sự cần (conversations đã dùng `updatedAt` cho sort — cần giữ riêng trong `Conversation` type).

**Files cần sửa:**

- `src/types.ts` — xóa `updatedAt?` khỏi `BaseEntity`, thêm `updatedAt: Date` riêng vào `Conversation` interface

- [ ] Xóa `updatedAt` từ `BaseEntity`
- [ ] Thêm `updatedAt` trực tiếp vào `Conversation` interface

---

## 🟣 TYPE CLEANUP — Tinh gọn types

### TASK-16 — `Message.reactorId` chỉ là lastMessage preview field

**Vấn đề:** `Message.reactorId?: string` trong type chính. Field này chỉ được set trong `onMessageReactionWrite` CF khi cập nhật `lastMessage` snapshot trong conversation document — không phải trên message document thật. Nó không phải thuộc tính của Message entity.

**Fix:** Xóa `reactorId` khỏi `Message` interface. Tạo type riêng `LastMessagePreview` trong `Conversation` để phản ánh đúng cấu trúc.

**Files cần sửa:**

- `src/types.ts` — xóa `reactorId?` khỏi `Message`, thêm inline type cho `lastMessage` trong `Conversation`
- `src/hooks/chat/useConversationItem.ts` — điều chỉnh type access

- [ ] Xóa `Message.reactorId`
- [ ] Tạo `LastMessagePreview` type cho `Conversation.lastMessage`
- [ ] Cập nhật `useConversationItem` type access

---

### TASK-17 — `ReportReason` import trong `notificationService` không dùng

**Vấn đề:** `notificationService.ts` import `ReportReason` từ types nhưng không dùng trong file này (chỉ dùng `REPORT_CONFIG` cho labels).

**Fix:** Xóa import thừa.

**Files cần sửa:**

- `src/services/notificationService.ts` — xóa `ReportReason` import

- [ ] Xóa `ReportReason` import thừa trong notificationService

---

### TASK-18 — `contactStore` interface thừa `addFriend`/`removeFriend` methods

**Vấn đề:** `ContactState` interface khai báo `addFriend(friend: User)` và `removeFriend(friendId: string)` nhưng thực tế không có implementation nào trong store (subscribeToFriends tự update qua snapshot). Cần kiểm tra xem có implementation hay chỉ là dead interface declaration.

**Fix:** Kiểm tra và xóa nếu không có implementation.

**Files cần sửa:**

- `src/store/contactStore.ts` — kiểm tra và xóa dead interface methods

- [ ] Kiểm tra và xóa `addFriend`/`removeFriend` nếu không implemented

---

## ✅ CHECKLIST HOÀN THÀNH

| Task    | Mô tả ngắn                                                        | Priority    | Status |
| ------- | ----------------------------------------------------------------- | ----------- | ------ |
| TASK-01 | Fix `user.friendIds` không được populate — thay bằng contactStore | 🔴 CRITICAL | [x]    |
| TASK-02 | Fix block check trong conversation đọc sai location               | 🔴 CRITICAL | [x]    |
| TASK-03 | Fix admin ban dùng sai API — thay bằng CF callable                | 🔴 CRITICAL | [x]    |
| TASK-04 | Xóa orphan fields `pinned/muted` khi tạo conversation             | 🔴 CRITICAL | [x]    |
| TASK-05 | Xóa 3 dead methods trong notificationService                      | 🟡 HIGH     | [x]    |
| TASK-06 | Xóa dead methods contactStore + authStore                         | 🟡 HIGH     | [x]    |
| TASK-07 | Sửa `useFriendIds` hook (kết hợp TASK-01)                         | 🟡 HIGH     | [ ]    |
| TASK-08 | Xóa `Message.videoThumbnails` và `Message.deliveredAt`            | 🟡 HIGH     | [ ]    |
| TASK-09 | Tách `blockedUserIds` ra khỏi User type                           | 🟡 HIGH     | [ ]    |
| TASK-10 | Tách storage helpers thành file dùng chung (functions)            | 🟠 MEDIUM   | [ ]    |
| TASK-11 | Fix `batchGetUsers` thiếu `birthDate` conversion                  | 🟠 MEDIUM   | [ ]    |
| TASK-12 | Fix `getUserStats` đếm friendCount từ subcollection               | 🟠 MEDIUM   | [ ]    |
| TASK-13 | Thêm missing Firestore index cho `notifications`                  | 🔵 DB       | [ ]    |
| TASK-14 | Thêm missing Firestore indexes cho `reports` cleanup              | 🔵 DB       | [ ]    |
| TASK-15 | Xóa `updatedAt` từ BaseEntity, giữ riêng ở Conversation           | 🔵 DB       | [ ]    |
| TASK-16 | Làm sạch `Message.reactorId` type                                 | 🟣 TYPE     | [ ]    |
| TASK-17 | Xóa `ReportReason` import thừa                                    | 🟣 TYPE     | [ ]    |
| TASK-18 | Kiểm tra `addFriend`/`removeFriend` trong contactStore            | 🟣 TYPE     | [ ]    |

---

## 📊 DATABASE DESIGN — Đánh giá hiện tại

### Collections Schema (Đã triển khai và đúng)

```
users/{uid}
  name, avatar, email, status, bio, coverImage
  location?, gender?, birthDate?, lastSeen?, createdAt

users/{uid}/friends/{friendId}           ← Source of truth cho friends
  friendId, createdAt

users/{uid}/private/security             ← Private, chỉ owner đọc
  blockedUserIds[]

users/{uid}/private/fcm                  ← CF-only write
  tokens[]

posts/{id}
  userId, content, images[], videos[], videoThumbnails{}
  commentCount, reactionCount, reactionSummary{}
  visibility, type?, isEdited, editedAt?, createdAt

posts/{id}/reactions/{userId}
  type (reaction enum)

comments/{id}
  postId, userId, parentId?, replyToUserId?
  content, image?, replyCount, reactionCount, reactionSummary{}
  createdAt

comments/{id}/reactions/{userId}
  type

conversations/{id}
  participantIds[], isGroup
  groupName?, groupAvatar?, creatorId?, adminIds[]
  unreadCount{userId: number}, lastMessage{}
  pinnedBy[], mutedUsers{userId: bool}, archivedBy[]
  markedUnreadBy[], memberJoinedAt{userId: Timestamp}
  deletedBy[], deletedAt{userId: Timestamp}
  updatedAt, createdAt

messages/{id}
  conversationId, senderId, content, type
  fileUrl?, fileName?, fileSize?
  readBy[], deliveredTo[]
  replyToId?, replyToSnippet{}
  isRecalled?, recalledAt?, isEdited?, editedAt?
  deletedBy[], isForwarded?, mentions[]
  reactionCount, reactionSummary{}
  createdAt

messages/{id}/reactions/{userId}
  type

notifications/{id}                       ← CF-only create
  receiverId, senderId, type, data{}, isRead, createdAt

friendRequests/{id}
  senderId, receiverId, status, message?, createdAt, updatedAt?

reports/{id}
  reporterId, targetType, targetId, targetOwnerId
  reason, description?, images[]
  status, resolvedAt?, resolvedBy?, resolution?
  createdAt

config/admins
  adminIds[]
```

### Realtime Database

```
/status/{uid}                  ← Presence (online/offline)
  status, lastSeen

/callNotifications/{userId}    ← WebRTC/ZegoCloud signaling
```

### Đánh giá thiết kế

- **Tốt:** Reactions dùng subcollection → không array-contains limit, CF trigger clean
- **Tốt:** Private data trong subcollection `private/*` → security rules rõ ràng
- **Tốt:** Custom Claims cho admin/banned → không Firestore read trong rules
- **Cần fix:** `friendIds` trên user doc không được maintain (TASK-01)
- **Cần fix:** `blockedUserIds` không trên user doc nhưng code đọc từ đó (TASK-02, TASK-09)
- **Cần fix:** Orphan fields trong conversations mới tạo (TASK-04)
