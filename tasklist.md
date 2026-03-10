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
- [x] Thêm `getFeedFromFanout(userId, limitCount, lastDoc)`: đọc từ `users/{uid}/feeds`, lấy `postId` rồi batch fetch `posts/{postId}`
- [x] Thêm `subscribeToFeedFanout(userId, callback)`: subscribe `users/{uid}/feeds` orderBy `createdAt`
- [x] Giữ `getFeed()` và `subscribeToFeed()` (legacy fallback)
- [x] Sửa `createPost()`: **không** còn nhận `customId`; xóa field `type`
- [x] Sửa `updatePost()`: signature đổi từ `(postId, content, images, videos, visibility, videoThumbnails)` → `(postId, content, media: MediaObject[], visibility)`
- [x] Sửa `reactToPost()`: giữ nguyên sub-collection logic, CF `onReactionWrite` sẽ update Map `reactions`
- [x] Giữ `getMyReactionForPost()`, `batchLoadMyReactions()` — vẫn đọc từ sub-collection
- [x] Sửa `uploadPostMedia()`: trả về `MediaObject[]` thay vì `{images[], videos[]}`
- [x] Sửa `deletePost()`: chỉ soft-delete, CF sẽ lo cleanup fan-out
- [x] Sửa `convertDocToPost()`: map `authorId` thay `userId`, `media[]` thay `images/videos`
- [x] Cập nhật tất cả queries: dùng `authorId` thay `userId`

### 4.2 Tạo/cập nhật Cloud Function fan-out
> *Các functions này cần có trong `functions/src/posts/`*
- [x] Tạo `functions/src/posts/onPostCreated.ts`: khi post tạo mới → fan-out `postId` vào `feeds` subcollection của tất cả bạn bè + chính tác giả
- [x] Tạo `functions/src/posts/onPostDeleted.ts`: khi post soft-delete → xóa entries trong tất cả `feeds`
- [x] Tạo `functions/src/posts/onFriendAdded.ts`: khi thêm bạn → fan-out posts cũ của bạn vào feed
- [x] Tạo `functions/src/posts/onFriendRemoved.ts`: khi xóa bạn → remove posts khỏi feed
- [x] Export functions trong `functions/src/index.ts`

### 4.3 Cập nhật `src/store/postStore.ts`
- [x] Cập nhật `fetchPosts()`: dùng `postService.getFeedFromFanout()`, xóa params `friendIds`, `blockedUserIds`
- [x] Cập nhật `subscribeToPosts()`: dùng `postService.subscribeToFeedFanout()`, xóa params `friendIds`, `blockedUserIds`
- [x] Cập nhật `createPost()`: signature mới nhận `media: MediaObject[]`, xóa `images`, `videos`, `videoThumbnails`
- [x] Cập nhật `updatePost()`: signature mới nhận `media: MediaObject[]`
- [x] Cập nhật `reactToPost()`: dùng `reactions` Map thay `reactionCount`, `reactionSummary`
- [x] Cập nhật state `posts[]` để dùng `Post` interface mới (authorId, media[], reactions)

---

## PHASE 5 — COMMENT MODULE REFACTOR

> **Mục tiêu**: Align comment với schema mới (authorId, image: MediaObject, reactions Map).

### 5.1 Cập nhật `src/services/commentService.ts`
- [x] Sửa `convertDocToComment()`: map `authorId` thay `userId`
- [x] Sửa `createComment()`: ghi `authorId` thay `userId`; `image` là `MediaObject` thay string; xóa `replyToUserId`; thêm `reactions: {}`
- [x] Xóa `replyToUserId` khỏi commentData (không có trong schema mới)
- [x] Sửa `reactToComment()`: giữ sub-collection, CF `onCommentReactionWrite` update Map
- [x] Giữ `getMyReactionForComment()`, `batchLoadMyReactionsForComments()`
- [x] Tạo `uploadCommentImage(file, userId)` trong `commentService`: trả về `MediaObject`
- [x] Cập nhật tất cả queries và filters: dùng `authorId`, `status !== 'banned'`

### 5.2 Cập nhật Cloud Functions comments
- [x] Sửa `onCommentReactionWrite.ts`: cập nhật Map `reactions` trực tiếp lên comment doc (tương tự post)
- [x] Cập nhật `functions/src/types.ts`: đổi `senderId` → `actorId` trong `NotificationData`

### 5.3 Cập nhật `src/store/commentStore.ts`
- [x] Thay `c.userId` bằng `c.authorId` trong toàn bộ store
- [x] Cập nhật `addComment()` payload: không còn `replyToUserId`
- [x] Cập nhật signatures: `image` thay `imageUrl`

---

## PHASE 6 — NOTIFICATION MODULE REFACTOR

> **Mục tiêu**: Align notification với schema mới (actorId, type gọn, targetId).

### 6.1 Cập nhật Cloud Functions notifications
- [x] Sửa `onPostReactionWrite.ts`: tạo notification type `reaction` (không phải `like_post`)
- [x] Sửa `onCommentCreated.ts`: tạo notification type `comment` (gộp `comment_post` + `reply_comment`)
- [x] Sửa `onFriendRequest.ts`: tạo notification type `friend_request`
- [x] Xóa `onMessageReactionWrite.ts` — chat reaction không dùng notifications Firestore
- [x] Cập nhật tất cả functions: dùng `actorId` thay `senderId`

### 6.2 Cập nhật `src/services/notificationService.ts`
- [x] Sửa mapper: đọc `actorId` thay `senderId`
- [x] Cập nhật routing theo type mới: `reaction`, `comment`, `friend_request`, `system`

### 6.3 Cập nhật `src/store/notificationStore.ts`
- [x] Thay `n.senderId` → `n.actorId` ở mọi nơi
- [x] Cập nhật switch/case theo `NotificationType` mới

---

## PHASE 7 — CHAT MODULE REFACTOR (LỚN NHẤT)

> **Mục tiêu**: Chuyển toàn bộ chat từ Firestore → RTDB.

### 7.1 Tạo `src/services/chat/rtdbConversationService.ts` (thay thế `conversationService.ts`)
- [x] Xóa `src/services/chat/conversationService.ts`
- [x] `getOrCreateDirect(user1Id, user2Id)`: check `/conversations` trên RTDB; tạo mới nếu chưa có; ghi `/user_chats/{uid}/{convId}` cho cả hai
- [x] `subscribeToUserConversations(userId, callback)`: listen `/user_chats/{uid}`, sau đó batch fetch `/conversations/{convId}` metadata
- [x] `updateConversationMeta(convId, updates)`: cập nhật metadata nhóm
- [x] `togglePin(uid, convId, isPinned)`: ghi vào `/user_chats/{uid}/{convId}/isPinned`
- [x] `toggleMute(uid, convId, isMuted)`: ghi `/user_chats/{uid}/{convId}/isMuted`
- [x] `toggleArchive(uid, convId, isArchived)`: ghi `/user_chats/{uid}/{convId}/isArchived`
- [x] `deleteConversation(uid, convId)`: xóa `/user_chats/{uid}/{convId}` (không xóa conversation chung)
- [x] `resetUnreadCount(uid, convId)`: set `unreadCount: 0` và update `lastReadMsgId`
- [x] `markAllAsRead(uid)`: iterate tất cả `/user_chats/{uid}` và reset unread

### 7.2 Tạo `src/services/chat/rtdbGroupService.ts` (thay thế `groupService.ts`)
- [x] Xóa `src/services/chat/groupService.ts`
- [x] `createGroup(creatorId, name, memberIds, avatar?)`: ghi node `/conversations/{convId}` trên RTDB với `isGroup: true`, `members: {uid: 'admin'|'member'}`, `avatar: MediaObject`; ghi `/user_chats/{uid}/{convId}` cho tất cả
- [x] `addMembers(convId, memberIds)`: update `members` map và tạo `/user_chats/{uid}/{convId}` cho members mới
- [x] `removeMember(convId, uid, byAdmin)`: set `members/{uid}` null; xóa `/user_chats/{uid}/{convId}`
- [x] `updateGroupInfo(convId, name?, avatar?)`: update metadata, `avatar` là MediaObject
- [x] `updateMemberRole(convId, uid, role)`: set `members/{uid}` = `'admin'|'member'`
- [x] `leaveGroup(convId, uid)`: gọi `removeMember`; nếu admin cuối thì promote member khác

### 7.3 Tạo `src/services/chat/rtdbMessageService.ts` (thay thế `messageService.ts`)
- [x] Xóa `src/services/chat/messageService.ts`
- [x] `sendTextMessage(convId, senderId, content, options)`: push vào `/messages/{convId}`; cập nhật `/conversations/{convId}/lastMessage`; tăng `unreadCount` trong `/user_chats/{otherUid}/{convId}`
- [x] `sendMediaMessage(convId, senderId, file, type, options)`: upload Storage → lấy MediaObject → push message
- [x] `subscribeToMessages(convId, limitCount, callback)`: `onChildAdded` + `limitToLast(n)` trên `/messages/{convId}`
- [x] `loadMoreMessages(convId, beforeTimestamp, limitCount)`: query `orderByChild('createdAt').endAt(before).limitToLast(n)`
- [x] `markAsRead(convId, uid, lastMsgId)`: set `readBy/{uid} = Date.now()` trên từng tin chưa đọc; cập nhật `/user_chats/{uid}/{convId}/lastReadMsgId`
- [x] `markAsDelivered(convId, uid)`: set `deliveredTo/{uid} = Date.now()`
- [x] `recallMessage(convId, msgId, uid)`: set `isRecalled: true` trên RTDB; cập nhật `lastMessage` nếu là tin cuối
- [x] `deleteForMe(convId, msgId, uid)`: set `deletedBy/{uid}: true`
- [x] `editMessage(convId, msgId, uid, newContent)`: kiểm tra 5 phút; set `content, isEdited: true, updatedAt`
- [x] `forwardMessage(targetConvId, senderId, srcMsg)`: push message mới với `isForwarded: true`
- [x] `toggleReaction(convId, msgId, uid, emoji)`: toggle `reactions/{uid}` trên RTDB
- [x] `sendSystemMessage(convId, content)`: push system message
- [x] `subscribeToTyping(convId, callback)`: listen `/conversations/{convId}/typing` (nếu cần typing indicator)

### 7.4 Tạo `src/services/chat/rtdbCallService.ts` (thay thế logic call cũ)
- [x] `initiateCall(callerId, calleeId, convId, callType, zegoToken)`: ghi `/call_signaling/{calleeId}`
- [x] `answerCall(calleeId, status)`: update `status: 'accepted'|'rejected'`
- [x] `subscribeToIncomingCall(uid, callback)`: listen `/call_signaling/{uid}`
- [x] `clearSignaling(uid)`: xóa `/call_signaling/{uid}` sau khi call kết thúc

### 7.5 Cập nhật stores chat
- [x] Xóa `src/store/chat/conversationSlice.ts` — viết lại `rtdbConversationSlice.ts`
- [x] Xóa `src/store/chat/groupSlice.ts` — viết lại `rtdbGroupSlice.ts`
- [x] Xóa `src/store/chat/messageSlice.ts` — viết lại `rtdbMessageSlice.ts`
- [x] Cập nhật `src/store/chatStore.ts`: orchestrate 3 slices mới
- [x] Cập nhật `src/store/callStore.ts`: dùng `rtdbCallService` thay Firestore

### 7.6 Cập nhật Cloud Functions (functions/src)
- [x] Xóa `functions/src/conversations/onConversationDeleted.ts` (không còn Firestore conversations)
- [x] Xóa `functions/src/messages/*` (không còn Firestore messages)
- [x] Giữ lại: `generateZegoToken.ts`, `banUser.ts`, `setAdminClaim.ts`, `resolveReport.ts`, `rejectReport.ts`
- [x] Cập nhật `searchUsers.ts`: tìm theo `fullName` thay `name`
- [x] Cập nhật `unfriend.ts`: xóa `users/{uid}/friends` subcollection (Firestore)

---

## PHASE 8 — FRIEND MODULE REFACTOR

> **Mục tiêu**: Align với schema mới — `users/{uid}/friends` subcollection đơn giản hơn.

### 8.1 Cập nhật `src/services/friendService.ts`
- [x] Xóa `FriendRequest.message` field (schema mới không có)
- [x] `sendFriendRequest()`: kiểm tra block dùng subcollection `blockedUsers` thay `private/security`
- [x] `acceptFriendRequest()`: Cloud Function `onFriendRequestStatusChange` sẽ ghi `users/{uid}/friends`
- [x] Xóa trực tiếp call đến `users/{uid}/private/security` trong toàn bộ file

### 8.2 Cập nhật Cloud Functions friends
- [x] `onFriendRequestStatusChange.ts`: khi ACCEPTED ghi `friends/{friendId}: {createdAt}` vào subcollection; khi cần xóa, remove doc
- [x] `unfriend.ts`: xóa doc trong `users/{uid}/friends/{friendId}` cho cả hai phía

---

## PHASE 9 — REPORT MODULE REFACTOR

> **Mục tiêu**: Align `images` field thành `MediaObject[]`.

### 9.1 Cập nhật `src/services/reportService.ts`
- [x] Sửa `createReport()`: `images` nay là `MediaObject[]`
- [x] Sửa `uploadReportImages()`: trả về `MediaObject[]` thay `string[]`

### 9.2 Cập nhật `src/store/reportStore.ts`
- [x] Cập nhật state và UI data để dùng `MediaObject` cho evidence images

### 9.3 Cập nhật UI Components
- [x] Cập nhật `ReportModal.tsx`: dùng `reportService.uploadReportImages()`
- [x] Cập nhật `ReportDetailModal.tsx`: hiển thị `MediaObject[]` cho evidence images
- [x] Cập nhật `PostMediaGrid.tsx`: refactor để dùng `media: MediaObject[]` thay `images[], videos[]`

---

## PHASE 10 — UI COMPONENTS & PAGES

> **Mục tiêu**: Cập nhật toàn bộ tầng UI để dùng data model mới.

### 10.1 Components liên quan Media
- [x] `AvatarComponent`: nhận `MediaObject` thay `string`; fallback khi `isSensitive: true`
- [x] `PostMediaGrid`: nhận `media: MediaObject[]` thay `images[], videos[]`
- [x] `CommentImagePreview`: nhận `MediaObject`

### 10.2 Pages
- [x] `ProfilePage.tsx`: dùng `user.fullName`, `user.avatar.url`, `user.cover.url`, `user.dob`; xóa `friendCount` display
- [x] `FeedPage.tsx`: subscribe feed qua fan-out; dùng `post.authorId`, `post.media[]`
- [x] `ChatPage.tsx`: toàn bộ thay thế Firestore listeners bằng RTDB listeners
- [x] `ContactsPage.tsx`: dùng `fullName`, block từ subcollection `blockedUsers`
- [x] `SettingsPage.tsx`: xóa avatar/cover upload trả về string, dùng `MediaObject`
- [x] `NotificationsPage.tsx`: dùng `actorId` thay `senderId`

### 10.3 Hooks
- [x] `useFeed.ts`: dùng `postService.getFeedFromFanout()`
- [x] `useUserPosts.ts`: dùng `authorId` thay `userId`
- [x] `useChat.ts`: toàn bộ rewrite dùng RTDB services
- [x] `usePresence.ts`: dùng `presenceService`
- [x] `useProfile.ts`: dùng `fullName`, `MediaObject`
- [x] `useContacts.ts`: dùng `blockedUsers` subcollection

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
