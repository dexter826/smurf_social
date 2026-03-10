# TASKLIST: BIG REFACTOR THEO DATABASE SCHEMA MỚI

> **Nguyên tắc**: Không backward-compat, xóa sạch logic cũ, build fresh theo `report_database.md`.
> Thực hiện tuần tự từ Phase 0 → Phase 6. Mỗi phase hoàn chỉnh trước khi sang phase kế tiếp.

---

## PHÂN TÍCH DELTA (HIỆN TẠI → MỚI)

| Khu vực | Hiện tại | Schema mới |
|---|---|---|
| **User.avatar** | `string` (URL đơn) | `MediaObject` (`{url, fileName, mimeType, size, isSensitive}`) |
| **User.cover** | `coverImage: string` | `cover: MediaObject` |
| **User.blockedUsers** | `users/{uid}/private/security` (doc ẩn) | `users/{uid}/blockedUsers` (subcollection riêng) |
| **User.status** | `online/offline/banned` | Chỉ `active/banned` (presence → RTDB) |
| **User fields** | `name`, `birthDate`, `role` | `fullName`, `dob`, không có `role` (dùng Custom Claims) |
| **Feed** | Query trực tiếp `posts` collection | Fan-out: `users/{uid}/feeds` subcollection |
| **Post.media** | `images[]`, `videos[]`, `videoThumbnails{}` | `media: MediaObject[]` (max 10) |
| **Post.reactions** | Sub-collection `posts/{id}/reactions` | Map trực tiếp `{ like: 10, love: 5 }` trên doc |
| **Comment.image** | `string` (URL) | `image: MediaObject` |
| **Comment.userId** | `userId` | `authorId` |
| **Notification.type** | `like_post`, `comment_post`... | Gọn hơn: `reaction`, `comment`, `friend_request`, `system` |
| **Notification.senderId** | `senderId` | `actorId` |
| **Chat - Storage** | **Firestore** (`conversations`, `messages` collections) | **RTDB** (`/conversations`, `/messages`, `/user_chats`, `/presence`, `/call_signaling`) |
| **Chat - Conversation** | `participantIds[]`, `adminIds[]`, sub-collection `members` | RTDB: `members: {uid: "admin"/"member"}` trên chính node |
| **Chat - Message** | `readBy: string[]`, `deliveredTo: string[]` | RTDB: `readBy: {uid: timestamp}`, `deliveredTo: {uid: timestamp}` |
| **Chat - UserChats** | Sub-collection `conversations/{id}/members/{uid}` | RTDB: `/user_chats/{uid}/{conv_id}` |
| **Presence** | `status` field trong Firestore user doc | RTDB: `/presence/{uid}` |
| **Call Signaling** | Firestore sub-collection `calls` | RTDB: `/call_signaling/{uid}` |

---

## PHASE 0 — FOUNDATION: TYPES & SHARED

> **Mục tiêu**: Chuẩn hóa toàn bộ kiểu dữ liệu trước khi đụng vào bất kỳ service nào.

### 0.1 Cập nhật `shared/types.ts`
- [x] Xóa enum `UserStatus` (bỏ `ONLINE`, `OFFLINE` — chỉ giữ `ACTIVE`, `BANNED`)
- [x] Xóa enum `UserRole` (không lưu trong Firestore nữa — dùng Custom Claims)
- [x] Cập nhật `NotificationType`: gộp thành `reaction`, `comment`, `friend_request`, `system`
- [x] Xóa `PostType` (không còn `AVATAR_UPDATE`, `COVER_UPDATE` theo schema mới)
- [x] Thêm type `MemberRole = "admin" | "member"`
- [x] Giữ nguyên: `Gender`, `Visibility`, `FriendRequestStatus`, `ReactionType`, `MessageType`, `ReportType`, `ReportReason`, `ReportStatus`, `PostStatus`, `CommentStatus`

### 0.2 Cập nhật `src/types.ts`
- [x] Thêm interface `MediaObject` : `{ url, fileName, mimeType, size, thumbnailUrl?, isSensitive }`
- [x] Refactor interface `User`:
  - Đổi `name` → `fullName`
  - Đổi `avatar: string` → `avatar: MediaObject`
  - Đổi `coverImage: string` → `cover: MediaObject`
  - Đổi `birthDate` → `dob`
  - Xóa `role`, `lastSeen` (presence vào RTDB)
  - Đổi `status: UserStatus` → `status: 'active' | 'banned'`
  - Thêm `updatedAt`, `deletedAt`
- [x] Refactor interface `Post`:
  - Xóa `images[]`, `videos[]`, `videoThumbnails{}`
  - Thêm `media: MediaObject[]`
  - Đổi `reactions: ReactableEntity` → `reactions: Partial<Record<ReactionType, number>>`
  - Đổi `userId` → `authorId`
  - Xóa `type: PostType`
- [x] Refactor interface `Comment`:
  - Đổi `userId` → `authorId`
  - Đổi `image?: string` → `image?: MediaObject`
  - Xóa `replyToUserId` (không có trong schema mới)
  - Đổi `reactions` → Map trực tiếp
- [x] Refactor interface `Notification`:
  - Đổi `senderId` → `actorId`
  - Cập nhật `type` theo enum mới
- [x] **Xóa hoàn toàn** interfaces liên quan Firestore Chat: `Conversation`, `ConversationMember`, `Message`, `LastMessagePreview`
- [x] Thêm RTDB Chat interfaces:
  - `RtdbConversation`: `{ isGroup, name, avatar, creatorId, members: {[uid]: MemberRole}, lastMessage, createdAt, updatedAt }`
  - `RtdbMessage`: `{ senderId, type, content, media[], mentions[], isForwarded, replyToId, replyToSnippet, isEdited, isRecalled, deletedBy: {[uid]: true}, readBy: {[uid]: timestamp}, deliveredTo: {[uid]: timestamp}, reactions: {[uid]: string}, createdAt, updatedAt }`
  - `RtdbUserChat`: `{ isPinned, isMuted, isArchived, unreadCount, lastReadMsgId, lastMsgTimestamp }`
  - `RtdbPresence`: `{ isOnline, lastSeen }`
  - `RtdbCallSignaling`: `{ callerId, conversationId, callType, status, zegoToken, timestamp }`
- [x] Xóa `FriendStatus` enum nếu không còn dùng, hoặc giữ lại nếu UI vẫn cần
- [x] Xóa `ConversationRealtimeState` (logic typing sẽ dùng RTDB)

---

## PHASE 1 — FIREBASE CONFIG & RTDB SETUP

> **Mục tiêu**: Kết nối RTDB, tạo module riêng cho RTDB.

### 1.1 Cấu hình Firebase
- [x] Kiểm tra `src/firebase/config.ts` — export thêm `rtdb` (Realtime Database instance)
- [x] Cập nhật `database.rules.json` theo security rules của schema mới:
  - `/presence/{uid}`: User chỉ ghi được presence của chính mình
  - `/conversations/{convId}`: Members có thể đọc, chỉ admin/creator mới sửa metadata
  - `/messages/{convId}/{msgId}`: Member đọc được; chỉ senderId mới sửa/thu hồi
  - `/user_chats/{uid}`: Chỉ uid đó đọc/ghi
  - `/call_signaling/{uid}`: Caller ghi, callee đọc

### 1.2 Tạo RTDB helper module
- [x] Tạo `src/firebase/rtdb.ts`: export các helper refs (`presenceRef`, `conversationRef`, `messagesRef`, `userChatsRef`, `callSignalingRef`)

---

## PHASE 2 — USER MODULE REFACTOR

> **Mục tiêu**: Align `userService` và `authStore` với schema User mới.

### 2.1 Cập nhật `src/services/userService.ts`
- [x] Xóa `updateUserStatus()` — presence chuyển sang RTDB (Phase 3)
- [x] Sửa `convertDocToUser()`: map `fullName`, `dob`, `avatar` (MediaObject), `cover` (MediaObject), `status: 'active'|'banned'`
- [x] Sửa `updateProfile()`: không còn field `role`, `lastSeen`, `status: ONLINE/OFFLINE`
- [x] Sửa `uploadAvatar()`: upload xong trả về `MediaObject` thay vì string URL
- [x] Sửa `uploadCoverImage()`: upload xong trả về `MediaObject`
- [x] Xóa `deleteAvatar()`, `deleteCoverImage()` — gộp vào `updateProfile()` khi set `avatar: null`
- [x] Sửa `getBlockedUserIds()`: đọc từ `users/{uid}/blockedUsers` subcollection thay vì `users/{uid}/private/security`
- [x] Sửa `blockUser()`: ghi vào subcollection `blockedUsers` với doc `{blockedUid, createdAt}`, **xóa** logic update `conversations` blockedBy
- [x] Sửa `unblockUser()`: xóa doc trong subcollection `blockedUsers`
- [x] Xóa `getUserStats()` — friendCount bỏ theo yêu cầu, postCount giữ nếu cần
- [x] Sửa `searchUsers()`, `searchFriends()`: dùng `fullName` thay vì `name`

### 2.2 Cập nhật `src/store/authStore.ts`
- [x] Xóa `updateUserStatus()` calls trong `login`, `logout`, `initialize`, `checkVerificationStatus`
- [x] Sửa `register()`: tạo profile với `fullName`, không set `role`
- [x] Sửa `initialize()`: không kiểm tra `UserStatus.ONLINE/OFFLINE`; kiểm tra banned bằng `status === 'banned'`
- [x] Xóa `blockedUserIds` state — sẽ load riêng từ subcollection `blockedUsers`

### 2.3 Cập nhật `src/services/authService.ts`
- [x] Sửa flow đăng ký: khi tạo user doc, dùng field `fullName` thay `name`

---

## PHASE 3 — PRESENCE MODULE (RTDB)

> **Mục tiêu**: Chuyển toàn bộ logic online/offline từ Firestore → RTDB `/presence`.

### 3.1 Tạo `src/services/presenceService.ts` (mới hoàn toàn)
- [x] `setOnline(uid)`: ghi `{ isOnline: true, lastSeen: serverTimestamp }` vào `/presence/{uid}`; cài `.onDisconnect().update({ isOnline: false, lastSeen: serverTimestamp })`
- [x] `setOffline(uid)`: ghi `{ isOnline: false, lastSeen: Date.now() }`
- [x] `subscribeToPresence(uids[], callback)`: lắng nghe `/presence/{uid}` cho nhiều user

### 3.2 Cập nhật `src/store/presenceStore.ts`
- [x] Xóa logic cũ dùng Firestore `userService.updateUserStatus()`
- [x] Dùng `presenceService.setOnline()` khi login, `setOffline()` khi logout
- [x] Subscribe `/presence/{uid}` cho danh sách bạn bè để cập nhật trạng thái online

---

## PHASE 4 — FEED MODULE REFACTOR (FAN-OUT)

> **Mục tiêu**: Thay query trực tiếp `posts` collection bằng fan-out `users/{uid}/feeds`.

### 4.1 Cập nhật `src/services/postService.ts`
- [ ] **Xóa** `getFeed()` (query cũ dùng `friendIds` to filter posts)
- [ ] **Xóa** `subscribeToFeed()` (logic subscribe cũ)
- [ ] Thêm `getFeedFromFanout(userId, limitCount, lastDoc)`: đọc từ `users/{uid}/feeds`, lấy `postId` rồi batch fetch `posts/{postId}`
- [ ] Thêm `subscribeToFeedFanout(userId, callback)`: subscribe `users/{uid}/feeds` orderBy `createdAt`
- [ ] Sửa `createPost()`: **không** còn nhận `customId`; Cloud Function sẽ lo fan-out
- [ ] Sửa `updatePost()`: signature đổi từ `(postId, content, images, videos, visibility, videoThumbnails)` → `(postId, content, media: MediaObject[], visibility)`; xóa storage cleanup cũ (Cloud Function lo)
- [ ] Sửa `reactToPost()`: **không** dùng sub-collection `reactions` nữa; Cloud Function `onReactionWrite` sẽ update Map `reactions` trực tiếp trên post doc
- [ ] Xóa `getMyReactionForPost()`, `batchLoadMyReactions()` — đọc từ Map trực tiếp
- [ ] Sửa `uploadPostMedia()`: trả về `MediaObject[]` thay vì `{images[], videos[]}`
- [ ] Sửa `deletePost()`: chỉ soft-delete, Cloud Function lo cleanup fan-out
- [ ] Sửa `convertDocToPost()`: map `authorId` thay `userId`, `media[]` thay `images/videos`

### 4.2 Tạo/cập nhật Cloud Function fan-out
> *Các functions này cần có trong `functions/src/posts/`*
- [ ] Tạo `functions/src/posts/onPostCreated.ts`: khi post tạo mới → fan-out `postId` vào `feeds` subcollection của tất cả bạn bè + chính tác giả
- [ ] Tạo `functions/src/posts/onPostDeleted.ts`: khi post soft-delete → xóa entries trong tất cả `feeds`
- [ ] Tạo `functions/src/posts/onFriendAdded.ts`: khi thêm bạn → fan-out posts cũ của bạn vào feed
- [ ] Tạo `functions/src/posts/onFriendRemoved.ts`: khi xóa bạn → remove posts khỏi feed

### 4.3 Cập nhật `src/store/postStore.ts`
- [ ] Xóa logic `friendIds` trong `loadFeed()`, `subscribeToFeed()`
- [ ] Dùng `postService.getFeedFromFanout()` và `subscribeToFeedFanout()`
- [ ] Cập nhật state `posts[]` để dùng `Post` interface mới (authorId, media[])

---

## PHASE 5 — COMMENT MODULE REFACTOR

> **Mục tiêu**: Align comment với schema mới (authorId, image: MediaObject, reactions Map).

### 5.1 Cập nhật `src/services/commentService.ts`
- [ ] Sửa `convertDocToComment()`: map `authorId` thay `userId`
- [ ] Sửa `createComment()`: ghi `authorId` thay `userId`; `image` là `MediaObject` thay string
- [ ] Xóa `replyToUserId` khỏi commentData (không có trong schema mới)
- [ ] Sửa `reactToComment()`: không dùng sub-collection nữa, CF `onCommentReactionWrite` update Map
- [ ] Xóa `getMyReactionForComment()`, `batchLoadMyReactionsForComments()`
- [ ] Xóa `uploadCommentImage()` từ `postService` — gộp vào comment module
- [ ] Tạo `uploadCommentImage(file, userId)` trong `commentService`: trả về `MediaObject`

### 5.2 Cập nhật Cloud Functions comments
- [ ] Sửa `onCommentReactionWrite.ts`: cập nhật Map `reactions` trực tiếp lên comment doc (tương tự post)

### 5.3 Cập nhật `src/store/commentStore.ts`
- [ ] Thay `c.userId` bằng `c.authorId` trong toàn bộ store
- [ ] Cập nhật `addComment()` payload: không còn `replyToUserId`

---

## PHASE 6 — NOTIFICATION MODULE REFACTOR

> **Mục tiêu**: Align notification với schema mới (actorId, type gọn, targetId).

### 6.1 Cập nhật Cloud Functions notifications
- [ ] Sửa `onPostReactionWrite.ts`: tạo notification type `reaction` (không phải `like_post`)
- [ ] Sửa `onCommentCreated.ts`: tạo notification type `comment` (gộp `comment_post` + `reply_comment`)
- [ ] Sửa `onFriendRequest.ts`: tạo notification type `friend_request`
- [ ] Xóa `onMessageReactionWrite.ts` — chat reaction không dùng notifications Firestore
- [ ] Cập nhật tất cả functions: dùng `actorId` thay `senderId`

### 6.2 Cập nhật `src/services/notificationService.ts`
- [ ] Sửa mapper: đọc `actorId` thay `senderId`
- [ ] Cập nhật routing theo type mới: `reaction`, `comment`, `friend_request`, `system`

### 6.3 Cập nhật `src/store/notificationStore.ts`
- [ ] Thay `n.senderId` → `n.actorId` ở mọi nơi
- [ ] Cập nhật switch/case theo `NotificationType` mới

---

## PHASE 7 — CHAT MODULE REFACTOR (LỚN NHẤT)

> **Mục tiêu**: Chuyển toàn bộ chat từ Firestore → RTDB.

### 7.1 Tạo `src/services/chat/rtdbConversationService.ts` (thay thế `conversationService.ts`)
- [ ] Xóa `src/services/chat/conversationService.ts`
- [ ] `getOrCreateDirect(user1Id, user2Id)`: check `/conversations` trên RTDB; tạo mới nếu chưa có; ghi `/user_chats/{uid}/{convId}` cho cả hai
- [ ] `subscribeToUserConversations(userId, callback)`: listen `/user_chats/{uid}`, sau đó batch fetch `/conversations/{convId}` metadata
- [ ] `updateConversationMeta(convId, updates)`: cập nhật metadata nhóm
- [ ] `togglePin(uid, convId, isPinned)`: ghi vào `/user_chats/{uid}/{convId}/isPinned`
- [ ] `toggleMute(uid, convId, isMuted)`: ghi `/user_chats/{uid}/{convId}/isMuted`
- [ ] `toggleArchive(uid, convId, isArchived)`: ghi `/user_chats/{uid}/{convId}/isArchived`
- [ ] `deleteConversation(uid, convId)`: xóa `/user_chats/{uid}/{convId}` (không xóa conversation chung)
- [ ] `resetUnreadCount(uid, convId)`: set `unreadCount: 0` và update `lastReadMsgId`
- [ ] `markAllAsRead(uid)`: iterate tất cả `/user_chats/{uid}` và reset unread

### 7.2 Tạo `src/services/chat/rtdbGroupService.ts` (thay thế `groupService.ts`)
- [ ] Xóa `src/services/chat/groupService.ts`
- [ ] `createGroup(creatorId, name, memberIds, avatar?)`: ghi node `/conversations/{convId}` trên RTDB với `isGroup: true`, `members: {uid: 'admin'|'member'}`, `avatar: MediaObject`; ghi `/user_chats/{uid}/{convId}` cho tất cả
- [ ] `addMembers(convId, memberIds)`: update `members` map và tạo `/user_chats/{uid}/{convId}` cho members mới
- [ ] `removeMember(convId, uid, byAdmin)`: set `members/{uid}` null; xóa `/user_chats/{uid}/{convId}`
- [ ] `updateGroupInfo(convId, name?, avatar?)`: update metadata, `avatar` là MediaObject
- [ ] `updateMemberRole(convId, uid, role)`: set `members/{uid}` = `'admin'|'member'`
- [ ] `leaveGroup(convId, uid)`: gọi `removeMember`; nếu admin cuối thì promote member khác

### 7.3 Tạo `src/services/chat/rtdbMessageService.ts` (thay thế `messageService.ts`)
- [ ] Xóa `src/services/chat/messageService.ts`
- [ ] `sendTextMessage(convId, senderId, content, options)`: push vào `/messages/{convId}`; cập nhật `/conversations/{convId}/lastMessage`; tăng `unreadCount` trong `/user_chats/{otherUid}/{convId}`
- [ ] `sendMediaMessage(convId, senderId, file, type, options)`: upload Storage → lấy MediaObject → push message
- [ ] `subscribeToMessages(convId, limitCount, callback)`: `onChildAdded` + `limitToLast(n)` trên `/messages/{convId}`
- [ ] `loadMoreMessages(convId, beforeTimestamp, limitCount)`: query `orderByChild('createdAt').endAt(before).limitToLast(n)`
- [ ] `markAsRead(convId, uid, lastMsgId)`: set `readBy/{uid} = Date.now()` trên từng tin chưa đọc; cập nhật `/user_chats/{uid}/{convId}/lastReadMsgId`
- [ ] `markAsDelivered(convId, uid)`: set `deliveredTo/{uid} = Date.now()`
- [ ] `recallMessage(convId, msgId, uid)`: set `isRecalled: true` trên RTDB; cập nhật `lastMessage` nếu là tin cuối
- [ ] `deleteForMe(convId, msgId, uid)`: set `deletedBy/{uid}: true`
- [ ] `editMessage(convId, msgId, uid, newContent)`: kiểm tra 5 phút; set `content, isEdited: true, updatedAt`
- [ ] `forwardMessage(targetConvId, senderId, srcMsg)`: push message mới với `isForwarded: true`
- [ ] `toggleReaction(convId, msgId, uid, emoji)`: toggle `reactions/{uid}` trên RTDB
- [ ] `sendSystemMessage(convId, content)`: push system message
- [ ] `subscribeToTyping(convId, callback)`: listen `/conversations/{convId}/typing` (nếu cần typing indicator)

### 7.4 Tạo `src/services/chat/rtdbCallService.ts` (thay thế logic call cũ)
- [ ] `initiateCall(callerId, calleeId, convId, callType, zegoToken)`: ghi `/call_signaling/{calleeId}`
- [ ] `answerCall(calleeId, status)`: update `status: 'accepted'|'rejected'`
- [ ] `subscribeToIncomingCall(uid, callback)`: listen `/call_signaling/{uid}`
- [ ] `clearSignaling(uid)`: xóa `/call_signaling/{uid}` sau khi call kết thúc

### 7.5 Cập nhật stores chat
- [ ] Xóa `src/store/chat/conversationSlice.ts` — viết lại `rtdbConversationSlice.ts`
- [ ] Xóa `src/store/chat/groupSlice.ts` — viết lại `rtdbGroupSlice.ts`
- [ ] Xóa `src/store/chat/messageSlice.ts` — viết lại `rtdbMessageSlice.ts`
- [ ] Cập nhật `src/store/chatStore.ts`: orchestrate 3 slices mới
- [ ] Cập nhật `src/store/callStore.ts`: dùng `rtdbCallService` thay Firestore

### 7.6 Cập nhật Cloud Functions (functions/src)
- [ ] Xóa `functions/src/conversations/onConversationDeleted.ts` (không còn Firestore conversations)
- [ ] Xóa `functions/src/messages/*` (không còn Firestore messages)
- [ ] Giữ lại: `generateZegoToken.ts`, `banUser.ts`, `setAdminClaim.ts`, `resolveReport.ts`, `rejectReport.ts`
- [ ] Cập nhật `searchUsers.ts`: tìm theo `fullName` thay `name`
- [ ] Cập nhật `unfriend.ts`: xóa `users/{uid}/friends` subcollection (Firestore)

---

## PHASE 8 — FRIEND MODULE REFACTOR

> **Mục tiêu**: Align với schema mới — `users/{uid}/friends` subcollection đơn giản hơn.

### 8.1 Cập nhật `src/services/friendService.ts`
- [ ] Xóa `FriendRequest.message` field (schema mới không có)
- [ ] `sendFriendRequest()`: kiểm tra block dùng subcollection `blockedUsers` thay `private/security`
- [ ] `acceptFriendRequest()`: Cloud Function `onFriendRequestStatusChange` sẽ ghi `users/{uid}/friends`
- [ ] Xóa trực tiếp call đến `users/{uid}/private/security` trong toàn bộ file

### 8.2 Cập nhật Cloud Functions friends
- [ ] `onFriendRequestStatusChange.ts`: khi ACCEPTED ghi `friends/{friendId}: {createdAt}` vào subcollection; khi cần xóa, remove doc
- [ ] `unfriend.ts`: xóa doc trong `users/{uid}/friends/{friendId}` cho cả hai phía

---

## PHASE 9 — REPORT MODULE REFACTOR

> **Mục tiêu**: Align `images` field thành `MediaObject[]`.

### 9.1 Cập nhật `src/services/reportService.ts`
- [ ] Sửa `createReport()`: `images` nay là `MediaObject[]`
- [ ] Sửa `uploadReportImages()`: trả về `MediaObject[]` thay `string[]`

### 9.2 Cập nhật `src/store/reportStore.ts`
- [ ] Cập nhật state và UI data để dùng `MediaObject` cho evidence images

---

## PHASE 10 — UI COMPONENTS & PAGES

> **Mục tiêu**: Cập nhật toàn bộ tầng UI để dùng data model mới.

### 10.1 Components liên quan Media
- [ ] `AvatarComponent`: nhận `MediaObject` thay `string`; fallback khi `isSensitive: true`
- [ ] `PostMediaGrid`: nhận `media: MediaObject[]` thay `images[], videos[]`
- [ ] `CommentImagePreview`: nhận `MediaObject`

### 10.2 Pages
- [ ] `ProfilePage.tsx`: dùng `user.fullName`, `user.avatar.url`, `user.cover.url`, `user.dob`; xóa `friendCount` display
- [ ] `FeedPage.tsx`: subscribe feed qua fan-out; dùng `post.authorId`, `post.media[]`
- [ ] `ChatPage.tsx`: toàn bộ thay thế Firestore listeners bằng RTDB listeners
- [ ] `ContactsPage.tsx`: dùng `fullName`, block từ subcollection `blockedUsers`
- [ ] `SettingsPage.tsx`: xóa avatar/cover upload trả về string, dùng `MediaObject`
- [ ] `NotificationsPage.tsx`: dùng `actorId` thay `senderId`

### 10.3 Hooks
- [ ] `useFeed.ts`: dùng `postService.getFeedFromFanout()`
- [ ] `useUserPosts.ts`: dùng `authorId` thay `userId`
- [ ] `useChat.ts`: toàn bộ rewrite dùng RTDB services
- [ ] `usePresence.ts`: dùng `presenceService`
- [ ] `useProfile.ts`: dùng `fullName`, `MediaObject`
- [ ] `useContacts.ts`: dùng `blockedUsers` subcollection

---

## PHASE 11 — FIRESTORE RULES & INDEXES

### 11.1 Cập nhật `firestore.rules`
- [ ] Thêm rules cho `users/{uid}/friends` subcollection
- [ ] Thêm rules cho `users/{uid}/blockedUsers` subcollection  
- [ ] Thêm rules cho `users/{uid}/feeds` subcollection
- [ ] Xóa rules cho `conversations`, `messages` collections (chuyển sang RTDB)
- [ ] Cập nhật rules `posts`: `authorId` thay `userId`
- [ ] Cập nhật rules `comments`: `authorId` thay `userId`

### 11.2 Cập nhật `firestore.indexes.json`
- [ ] Xóa indexes cho `messages`, `conversations` collections
- [ ] Thêm composite index: `comments(postId, parentId, status, createdAt)`
- [ ] Thêm composite index: `posts(authorId, status, visibility, createdAt)`
- [ ] Thêm composite index: `notifications(receiverId, createdAt)`

---

## PHASE 12 — CLEANUP & VERIFICATION

### 12.1 Cleanup code
- [ ] Xóa file `src/services/chat/realtimeService.ts` (cũ)
- [ ] Xóa toàn bộ import/export `Conversation`, `ConversationMember`, `Message`, `LastMessagePreview` từ Firestore schema
- [ ] Xóa `ReactableEntity` interface khỏi `shared/types.ts` (không còn phù hợp)
- [ ] Remove dead code: `PostType` usage, `UserRole` usage ở frontend, `UserStatus.ONLINE/OFFLINE`
- [ ] Xóa `functions/src/posts` folder nếu trống; xóa các functions không còn dùng

### 12.2 Chạy TypeScript diagnostics
- [ ] `tsc --noEmit` trong `src/` — phải 0 errors
- [ ] `tsc --noEmit` trong `functions/src/` — phải 0 errors
- [ ] Kiểm tra ESLint: `npm run lint` không có warnings về unused vars

### 12.3 Cập nhật `README.md`
- [ ] Cập nhật mô tả kiến trúc (Hybrid Firestore + RTDB)
- [ ] Cập nhật Environment Variables nếu cần thêm RTDB URL

---

## BẢNG ƯU TIÊN & DEPENDENCY

```
Phase 0 (Types) 
  └→ Phase 1 (Firebase config)
      ├→ Phase 2 (User module)
      │     └→ Phase 3 (Presence - RTDB)
      ├→ Phase 4 (Feed fan-out)
      ├→ Phase 5 (Comment)
      ├→ Phase 6 (Notification)
      └→ Phase 7 (Chat - RTDB) ← Phức tạp nhất, làm sau cùng
            └→ Phase 8 (Friend)
Phase 9 (Report) — độc lập
Phase 10 (UI) — sau tất cả services
Phase 11 (Rules/Indexes) — song song với Phase 10
Phase 12 (Cleanup) — cuối cùng
```
