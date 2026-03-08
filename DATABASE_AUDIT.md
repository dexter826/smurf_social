# Database Audit & Redesign Plan — Smurf Social

> **Ngày audit:** 08/03/2026  
> **Phạm vi:** Toàn bộ Firestore schema, Cloud Functions, Firestore Rules, Frontend services  
> **Nguyên tắc:** Không backward-compatible — xóa sạch, thiết kế lại đúng

---

## Mục lục

1. [Schema hiện tại](#1-schema-hiện-tại)
2. [BUGs cần fix ngay](#2-bugs-cần-fix-ngay)
3. [Anti-patterns thiết kế](#3-anti-patterns-thiết-kế)
4. [Security Issues](#4-security-issues)
5. [Performance Issues](#5-performance-issues)
6. [Đề xuất thiết kế mới](#6-đề-xuất-thiết-kế-mới)
7. [Kế hoạch thực hiện chi tiết](#7-kế-hoạch-thực-hiện-chi-tiết)

---

## 1. Schema Hiện Tại

### Collections & Subcollections

```
users/{userId}
friendRequests/{requestId}
posts/{postId}
comments/{commentId}
conversations/{conversationId}
messages/{messageId}
notifications/{notificationId}
reports/{reportId}

RTDB: /status/{uid}, /callNotifications/{userId}
```

### Sơ đồ quan hệ hiện tại

```
User ─── friendIds[] ──────────── User            ← ❌ array trong document
User ─── blockedUserIds[] ──────── User            ← ❌ array trong document
User ─── fcmTokens[] ──────────── (push tokens)   ← ❌ cùng document profile
Post ─── reactions{} ──────────── (userId→type)    ← ❌ unbounded map
Comment ─ reactions{} ──────────── (userId→type)   ← ❌ unbounded map
Message ─ replyToMessage{} ──────── Message        ← ❌ full snapshot lồng nhau
```

---

## 2. BUGs Cần Fix Ngay

### BUG-01 🔴 CRITICAL — `onCommentDeleted` double-decrement commentCount

**File:** `functions/src/comments/onCommentDeleted.ts`

**Mô tả:**
Khi xóa một root comment có N replies:

1. `onCommentDeleted` fires → tính `totalDeleted = 1 + N` → decrement `commentCount` bằng `-(1+N)`
2. Batch delete N replies → mỗi reply kích hoạt `onCommentDeleted` lại
3. Mỗi reply trigger: `totalDeleted = 1 + 0 = 1` → decrement thêm `-1` nữa

**Kết quả:** `commentCount` bị trừ `(1+N) + N = 1 + 2N` thay vì đúng `1+N`

**Root cause:**

```ts
// Hiện tại — sai
const totalDeleted = 1 + repliesSnap.docs.length;
// ...
batch.delete(d.ref); // ← trigger onCommentDeleted lại mỗi reply
// ...
await db
  .collection("posts")
  .doc(postId)
  .update({
    commentCount: FieldValue.increment(-totalDeleted), // ← double-count
  });
```

**Fix:**
Trước khi decrement commentCount, kiểm tra parent có còn tồn tại không. Nếu không → đây là cascade delete → bỏ qua decrement (parent đã xử lý rồi).

```ts
// Trong onCommentDeleted — sau khi lấy commentData
if (parentId) {
  const parentSnap = await db.collection("comments").doc(parentId).get();
  if (!parentSnap.exists) {
    // Cascade delete — parent đã decrement, chỉ dọn sub-replies & reports
    // ... (chỉ dọn replies con và orphan reports, không đụng commentCount)
    return;
  }
}
```

---

### BUG-02 🔴 CRITICAL — `onPostDeleted` chỉ orphan 30 comment reports

**File:** `functions/src/posts/onPostDeleted.ts`

**Mô tả:**
Khi post bị xóa, chỉ 30 comment ID đầu tiên được dùng để tìm reports liên quan:

```ts
.where('targetId', 'in', commentIds.slice(0, 30)) // ← chỉ 30 đầu
```

Nếu post có >30 comments, reports của các comment từ thứ 31 trở đi vĩnh viễn ở trạng thái `PENDING` dù nội dung đã bị xóa.

**Fix:**
Chunk `commentIds` và query nhiều batch:

```ts
const chunks = [];
for (let i = 0; i < commentIds.length; i += 30) {
  chunks.push(commentIds.slice(i, i + 30));
}
const commentReportResults = await Promise.all(
  chunks.map((chunk) =>
    db
      .collection("reports")
      .where("targetType", "==", "comment")
      .where("targetId", "in", chunk)
      .get(),
  ),
);
```

---

### BUG-03 🔴 CRITICAL — `unfriend()` từ client sẽ luôn fail

**File:** `src/services/friendService.ts`

**Mô tả:**
`unfriend()` gọi `arrayRemove` trực tiếp lên `friendIds` của cả 2 users từ client. Nhưng Firestore rule ngăn client sửa `friendIds`:

```
// firestore.rules — dòng quan trọng
isOwner(userId) && isNotBanned() && !changed().hasAny(['role', 'friendIds'])
```

- `batch.update(userRef, { friendIds: arrayRemove(friendId) })` → fail vì owner không được sửa `friendIds`
- `batch.update(friendRef, { friendIds: arrayRemove(userId) })` → fail vì không phải owner

**Kết quả:** Tính năng hủy kết bạn **broken hoàn toàn**. Có thể user đang thấy UI "Hủy kết bạn" nhưng action không thực sự xảy ra.

**Fix:**
Tạo Cloud Function `unfriend` xử lý server-side (tương tự `onFriendRequestStatusChange`), hoặc sử dụng Callable Function.

---

### BUG-04 🟠 HIGH — `onPostReaction` gửi notification trùng khi đổi reaction type

**File:** `functions/src/notifications/onPostReaction.ts`

**Mô tả:**
Hàm dùng `onDocumentWritten` nên trigger với MỌI thay đổi trên post (edit content, commentCount increment, v.v). Khi so sánh reactions:

```ts
if (beforeReactions[userId] === reaction) continue; // ← skip nếu SAME
```

Nếu user đổi từ LIKE → LOVE: `beforeReactions[userId] = 'LIKE'`, `reaction = 'LOVE'` → không skip → tạo notification mới. User đã từng nhận thông báo "ai đó LIKE bài viết của bạn" nay lại nhận thêm "ai đó LOVE bài viết của bạn" dù đây chỉ là thay reaction.

**Fix:**

- Dùng `onDocumentUpdated` thay `onDocumentWritten`
- Chỉ process nếu `reactions` field thực sự thay đổi
- Check `!beforeReactions[userId]` (chưa từng react) thay vì chỉ check giá trị khác

---

### BUG-05 🟠 HIGH — `onCommentDeleted`: replies > 500 không được batch đúng

**File:** `functions/src/comments/onCommentDeleted.ts`

**Mô tả:**
Replies bị delete trong một batch duy nhất mà không chia chunk:

```ts
const batch = db.batch();
repliesSnap.docs.forEach((d) => batch.delete(d.ref)); // ← không giới hạn 500
await batch.commit();
```

Firestore batch tối đa 500 operations. Nếu comment có >500 replies → `batch.commit()` throw error → toàn bộ cleanup thất bại, dữ liệu orphan.

---

### BUG-06 🟡 MEDIUM — `onFriendRequestStatusChange` không cleanup `friendRequests` cũ

**File:** `functions/src/friends/onFriendRequestStatusChange.ts`

**Mô tả:**
Khi accept friend request, CF chỉ cập nhật `friendIds` mà không xóa document `friendRequest` cũ với status `accepted`. Các document này tích lũy vô thời hạn (scheduled cleanup chỉ xóa `pending` > 30 ngày).

---

## 3. Anti-patterns Thiết Kế

### AP-01 — `reactions` là Map trong Post/Comment document

**Vấn đề:**

- Giới hạn Firestore document: 1MB
- Mỗi reaction entry ~30 bytes (userId ≈ 28 chars + reaction value)
- Tại 33,000 reactions → document đạt giới hạn → write fail silently
- `onPostReaction` phải iterate TẤT CẢ reactions mỗi khi post được cập nhật bất kỳ trường nào

**Ảnh hưởng:**

```
Viral post với 50,000 reactions → document size ~1.5MB → vượt giới hạn hard limit
```

**Đề xuất:** Subcollection `reactions/{userId}` + counter aggregation (xem [Phần 6](#6-đề-xuất-thiết-kế-mới))

---

### AP-02 — `friendIds` array trong User document

**Vấn đề:**

- Array unbounded trong document (dù hiếm > 5000 bạn)
- Mỗi lần load profile bất kỳ → download toàn bộ danh sách bạn bè
- Firestore rule visibility check đọc cả array: `request.auth.uid in get(...).data.friendIds`
- Feed query phải chunk array để `where('userId', 'in', chunk)` vì giới hạn 30 elements

**Đề xuất:** `users/{userId}/friends/{friendId}` subcollection

---

### AP-03 — `blockedUserIds` trong User document (public readable)

**Vấn đề:**

```
users/{userId}
└── blockedUserIds: ['uid_abc', 'uid_def', ...]
```

Mọi authenticated user đều có thể đọc document này (Rule: `allow read: if isAuthenticated()`). Điều này lộ danh sách người bị block — violation of privacy.

**Đề xuất:** `users/{userId}/private/security` subcollection với read rule chỉ cho owner.

---

### AP-04 — `fcmTokens` trong User document profile

**Vấn đề:**

- Push tokens là dữ liệu operational, không liên quan đến profile
- Mỗi lần cập nhật token → write toàn bộ document profile
- Tokens visible cho admin (và technically cho chính user khi đọc)

**Đề xuất:** `users/{userId}/private/fcm` subcollection

---

### AP-05 — `replyToMessage` full denormalized snapshot

**Vấn đề:**

```ts
replyToMessage?: Message // ← toàn bộ Message object lồng trong Message
```

- Document size tăng đáng kể với threaded conversations
- Snapshot trở nên stale ngay khi message gốc bị edit/recall
- Hiển thị quoted message bị sai sau khi người gửi recall

**Đề xuất:** Minimal snapshot `replyToSnippet` với chỉ 3 fields.

---

### AP-06 — `commentCount` dual-write (client + server)

**Vấn đề:**

```ts
// commentService.createComment — client write
await updateDoc(postRef, { commentCount: increment(1) });

// onCommentDeleted — server write
await db
  .collection("posts")
  .doc(postId)
  .update({
    commentCount: FieldValue.increment(-totalDeleted),
  });
```

Client increment không có transaction guard → nếu `createComment` thành thành công comment nhưng increment fail → counter drift vĩnh viễn.

---

### AP-07 — Feed pagination với multiple queries

**Vấn đề:**
`getFeed` chạy N+1 queries song song rồi merge trong memory:

```
1 owner query + ceil(friendCount / 10) friend queries
```

Với 100 bạn → 11 queries. `lastDoc` cursor chỉ có nghĩa với 1 query, không thể dùng cross-query → pagination hành xử không nhất quán.

---

### AP-08 — `subscribeToFeed` tạo O(N/10) listeners

**Vấn đề:**

```
subscribeToFeed với 200 bạn → 1 + 20 = 21 Firestore listeners đồng thời
```

Mỗi listener tốn connection, quota và memory. Scaling kém khi user có nhiều bạn.

---

## 4. Security Issues

### SEC-01 🔴 — Admin check bằng Firestore read thay vì Custom Claims

**Vị trí:** Tất cả Callable Functions (`resolveReport`, `rejectReport`, `banUser`)

```ts
// Hiện tại — đọc Firestore mỗi lần gọi
const callerDoc = await db.collection('users').doc(request.auth.uid).get();
if (callerDoc.data()?.role !== 'admin') { ... }
```

**Rủi ro:**

- 1 extra Firestore read mỗi admin operation
- Role có thể bị cache stale nếu có latency giữa Firestore write và CF execution
- Không revoke ngay lập tức nếu admin bị demote (claim chưa expire)

**Đề xuất:** Dùng Firebase Custom Claims:

```ts
if (!request.auth.token.admin) {
  throw new HttpsError("permission-denied", "Không có quyền Admin");
}
```

---

### SEC-02 🟠 — `getUserData()` trong Firestore Rules gây N+1 reads

**File:** `firestore.rules`

```js
function getUserData() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
}

function isAdmin() {
  return isAuthenticated() && getUserData().role == 'admin'; // ← Firestore read
}

function isNotBanned() {
  return isAuthenticated() && getUserData().status != 'banned'; // ← Firestore read
}
```

Mỗi security rule evaluation có thể trigger 2 `get()` calls. Firestore giới hạn 3 `get()` per rule evaluation — nếu rule đang check nhiều conditions cùng lúc, dễ hit limit.

**Đề xuất:** Admin `role` & `status` → Custom Claims (giảm cả SEC-01 và SEC-02 cùng lúc).

---

### SEC-03 🟠 — `messages` read rule requires `get()` on every message access

**File:** `firestore.rules`

```js
match /messages/{messageId} {
  allow read: if isAuthenticated() &&
    request.auth.uid in
      get(/databases/.../conversations/$(resource.data.conversationId)).data.participantIds;
}
```

Mỗi lần đọc 1 message → 1 Firestore read để verify conversation. Với pagination 50 messages/query → 50 rule evaluations → up to 50 extra reads (trong thực tế Firestore cache lại, nhưng quota vẫn bị tính).

---

### SEC-04 🟡 — `blockedUserIds` visible to all authenticated users

Như đã nêu tại AP-03. Danh sách ai bị ai block là thông tin nhạy cảm.

---

### SEC-05 🟡 — `searchUsers` CF: no rate limiting, no name search

```ts
// Chỉ tìm exact email match
.where('email', '==', searchTerm.toLowerCase().trim())
```

Không có rate limiting → có thể bị abused để enumerate users theo email. Cần thêm throttle hoặc reCAPTCHA.

---

## 5. Performance Issues

### PERF-01 — `onReportCreated` full collection scan cho admins

```ts
const adminsSnap = await db
  .collection("users")
  .where("role", "==", "admin")
  .get();
```

Nếu không có composite index trên `role`, đây là full collection scan. Scale tệ theo số lượng users.

**Fix:** Lưu danh sách admin IDs trong document `/config/admins` hoặc dùng Custom Claims + một `/admins` collection nhỏ.

---

### PERF-02 — `subscribeToFriends` fetch tất cả friends mỗi lần user document thay đổi

```ts
return onSnapshot(userRef, async (snapshot) => {
  // Bất kỳ thay đổi nào trên user document → fetch lại tất cả bạn bè
  const friendsMap = await batchGetUsers(friendIds);
```

Nếu user document thay đổi vì `lastSeen` hoặc `status` → trigger batchGetUsers lại toàn bộ danh sách bạn bè (N reads).

---

### PERF-03 — `batchGetUsers` không có proper TTL invalidation

`userCacheStore` có LRU cache 100 users, nhưng không có TTL. User bị ban sẽ tiếp tục xuất hiện trong cache cho đến khi bị evict tự nhiên.

---

## 6. Đề Xuất Thiết Kế Mới

### Schema Mới — Tổng quan

```
users/{userId}                   ← profile công khai
  └── /private/security          ← blockedUserIds (owner-only)
  └── /private/fcm               ← fcmTokens (owner-only)
  └── /friends/{friendId}        ← subcollection thay array

friendRequests/{requestId}       ← giữ nguyên
posts/{postId}                   ← bỏ reactions map
  └── /reactions/{userId}        ← subcollection mới

comments/{commentId}             ← bỏ reactions map
  └── /reactions/{userId}        ← subcollection mới

conversations/{conversationId}   ← giữ nguyên
messages/{messageId}             ← bỏ replyToMessage snapshot đầy đủ
notifications/{notificationId}   ← giữ nguyên
reports/{reportId}               ← giữ nguyên
config/admins                    ← document mới chứa adminIds[]
```

---

### 6.1 User Document — Tách private data

**Trước:**

```ts
users/{userId}: {
  id, name, email, avatar, coverImage, bio, location,
  gender, birthDate, status, role,
  friendIds: string[],      // ← xóa
  blockedUserIds: string[], // ← xóa
  fcmTokens: string[],      // ← xóa
  lastSeen, createdAt
}
```

**Sau:**

```ts
users/{userId}: {
  id, name, email, avatar, coverImage, bio, location,
  gender, birthDate, status,
  lastSeen, createdAt
  // role → Firebase Custom Claim (không lưu trong document)
}

users/{userId}/private/security: {
  blockedUserIds: string[]  // owner-only
}

users/{userId}/private/fcm: {
  tokens: string[]          // owner-only, CF viết
}

users/{userId}/friends/{friendId}: {
  createdAt: Timestamp      // CF viết khi accept friend request
}
```

**Firestore Rules update:**

```js
match /users/{userId}/private/{doc} {
  allow read, write: if isOwner(userId);
}

match /users/{userId}/friends/{friendId} {
  allow read: if isAuthenticated();
  allow write: if false; // CF only
}
```

---

### 6.2 Reactions — Subcollection thay Map

**Trước:**

```ts
posts/{postId}: {
  reactions: { [userId]: 'LIKE' | 'LOVE' | ... } // ← unbounded map
}
```

**Sau:**

```ts
posts/{postId}: {
  reactionCount: number,                          // counter tổng
  reactionSummary: Record<ReactionType, number>   // { LIKE: 120, LOVE: 45, ... }
}

posts/{postId}/reactions/{userId}: {
  type: ReactionType,
  createdAt: Timestamp
}
```

**Logic cập nhật:**

- Client: `setDoc/deleteDoc` vào `posts/{postId}/reactions/{currentUserId}`
- CF trigger `onPostReactionWrite`: cập nhật `reactionCount` và `reactionSummary` trên parent
- Để check "đã react chưa": client `getDoc(reactions/currentUserId)`

**Áp dụng tương tự cho `comments/{commentId}/reactions/{userId}`**

---

### 6.3 Messages — Minimal Reply Snapshot

**Trước:**

```ts
messages/{messageId}: {
  replyToMessage?: Message // full object, stale sau khi edit/recall
}
```

**Sau:**

```ts
messages/{messageId}: {
  replyToId?: string,
  replyToSnippet?: {
    senderId: string,
    content: string,    // truncate 100 chars
    type: MessageType,
    isRecalled: boolean
  }
}
```

Khi message gốc bị recall → CF update tất cả messages có `replyToId` trỏ đến nó: set `replyToSnippet.isRecalled = true`.

---

### 6.4 Admin Role — Custom Claims

**Thêm CF `setAdminClaim`:**

```ts
export const setAdminClaim = onCall(
  { region: "us-central1" },
  async (request) => {
    // Chỉ super-admin (claim level cao hơn) mới gọi được
    if (!request.auth?.token.superAdmin)
      throw new HttpsError("permission-denied", "...");

    const { userId, isAdmin } = request.data;
    await auth.setCustomUserClaims(userId, { admin: isAdmin });
    // Ghi vào config/admins để có thể query
    await db
      .collection("config")
      .doc("admins")
      .update({
        adminIds: isAdmin
          ? FieldValue.arrayUnion(userId)
          : FieldValue.arrayRemove(userId),
      });
  },
);
```

**Update tất cả Callable Functions:**

```ts
if (!request.auth?.token.admin) {
  throw new HttpsError("permission-denied", "Không có quyền Admin");
}
```

**Update Firestore Rules:**

```js
function isAdmin() {
  return request.auth.token.admin == true; // ← không cần Firestore read
}
```

---

### 6.5 `onReportCreated` — Dùng config document

**Trước:**

```ts
const adminsSnap = await db
  .collection("users")
  .where("role", "==", "admin")
  .get();
```

**Sau:**

```ts
const configDoc = await db.collection("config").doc("admins").get();
const adminIds: string[] = configDoc.data()?.adminIds || [];
```

---

### 6.6 Feed Architecture — Server-side fan-out (option)

Thay vì client query N friend chunks, dùng CF để maintain feed index:

```
feeds/{userId}: {
  postIds: string[]  // ordered by createdAt desc, max 200
}
```

Hoặc pragmatic fix ngắn hạn: giới hạn friends per query chunk và accept current multi-query approach nhưng fix pagination cursor dùng timestamp thay DocumentSnapshot.

---

## 7. Kế Hoạch Thực Hiện Chi Tiết

### Phase 1 — Fix Bugs Critical (1-2 ngày)

| #   | Task                                                        | File                                                   | Priority |
| --- | ----------------------------------------------------------- | ------------------------------------------------------ | -------- |
| 1.1 | Fix `onCommentDeleted` double-decrement                     | `functions/src/comments/onCommentDeleted.ts`           | 🔴       |
| 1.2 | Fix `onPostDeleted` 30-comment limit                        | `functions/src/posts/onPostDeleted.ts`                 | 🔴       |
| 1.3 | Fix `unfriend` → move to Callable Function                  | `functions/src/friends/` + client                      | 🔴       |
| 1.4 | Fix `onCommentDeleted` batch > 500                          | `functions/src/comments/onCommentDeleted.ts`           | 🔴       |
| 1.5 | Fix `onPostReaction` duplicate notifications                | `functions/src/notifications/onPostReaction.ts`        | 🟠       |
| 1.6 | Fix `onFriendRequestStatusChange` cleanup accepted requests | `functions/src/friends/onFriendRequestStatusChange.ts` | 🟡       |

---

### Phase 2 — Security Hardening (1-2 ngày)

| #   | Task                                                             | File                                         |
| --- | ---------------------------------------------------------------- | -------------------------------------------- |
| 2.1 | Implement Custom Claims cho admin role                           | `functions/src/admin/setAdminClaim.ts` (mới) |
| 2.2 | Update tất cả Callable Functions dùng `request.auth.token.admin` | `admin/*.ts`                                 |
| 2.3 | Update `isAdmin()` trong firestore.rules bỏ `getUserData()`      | `firestore.rules`                            |
| 2.4 | Tách `blockedUserIds` sang subcollection `private/security`      | schema + rules + client                      |
| 2.5 | Tách `fcmTokens` sang subcollection `private/fcm`                | schema + CF helpers                          |
| 2.6 | Cập nhật `onReportCreated` dùng `config/admins`                  | `notifications/onReportCreated.ts`           |

---

### Phase 3 — Schema Refactor: Reactions (2-3 ngày)

| #   | Task                                                      | File                           |
| --- | --------------------------------------------------------- | ------------------------------ |
| 3.1 | Tạo `posts/{postId}/reactions/{userId}` subcollection     | schema                         |
| 3.2 | Viết CF `onPostReactionWrite` (subcollection trigger)     | `functions/src/notifications/` |
| 3.3 | Update `postService` client dùng subcollection read/write | `src/services/postService.ts`  |
| 3.4 | Update `postStore` optimistic updates                     | `src/store/postStore.ts`       |
| 3.5 | Áp dụng tương tự cho `comments reactions`                 | tương tự 3.1-3.4               |
| 3.6 | Remove `reactions` field khỏi post/comment schema         | cleanup                        |

---

### Phase 4 — Schema Refactor: Friends (2-3 ngày)

| #   | Task                                                          | File                                      |
| --- | ------------------------------------------------------------- | ----------------------------------------- |
| 4.1 | Tạo `users/{userId}/friends/{friendId}` subcollection         | schema                                    |
| 4.2 | Update `onFriendRequestStatusChange` viết vào subcollection   | `functions/src/friends/`                  |
| 4.3 | Viết CF `unfriend` Callable                                   | `functions/src/friends/unfriend.ts` (mới) |
| 4.4 | Update `userService.subscribeToFriends` dùng subcollection    | `src/services/userService.ts`             |
| 4.5 | Update `friendService.unfriend` gọi CF                        | `src/services/friendService.ts`           |
| 4.6 | Update `postService.getFeed` dùng friends subcollection query | `src/services/postService.ts`             |
| 4.7 | Update `firestore.rules` visibility check                     | `firestore.rules`                         |
| 4.8 | Remove `friendIds` khỏi user schema                           | cleanup                                   |

---

### Phase 5 — Messages & Cleanup (1-2 ngày)

| #   | Task                                                           | File                             |
| --- | -------------------------------------------------------------- | -------------------------------- |
| 5.1 | Replace `replyToMessage` với `replyToSnippet`                  | `src/types.ts` + services        |
| 5.2 | CF update `replyToSnippet.isRecalled` khi message bị recall    | `functions/src/`                 |
| 5.3 | Fix `commentCount` — bỏ client-side increment, thêm CF trigger | `src/services/commentService.ts` |
| 5.4 | Thêm CF `onCommentCreated` để increment `commentCount`         | `functions/src/comments/`        |

---

### Phase 6 — Indexes & Rules Update (1 ngày)

| #   | Task                                                   | File                     |
| --- | ------------------------------------------------------ | ------------------------ |
| 6.1 | Add index cho `users/{userId}/friends` subcollection   | `firestore.indexes.json` |
| 6.2 | Add index cho `posts/{postId}/reactions` subcollection | `firestore.indexes.json` |
| 6.3 | Add index cho `config` collection                      | `firestore.indexes.json` |
| 6.4 | Update rules cho subcollections mới                    | `firestore.rules`        |
| 6.5 | Cleanup rules: bỏ `getUserData()` cho admin check      | `firestore.rules`        |

---

## Tóm tắt ưu tiên

### Cần làm ngay (blocking bugs)

1. **BUG-01** - `commentCount` bị sai sau delete (double-decrement)
2. **BUG-02** - Reports không được orphan đúng khi post có >30 comments
3. **BUG-03** - `unfriend()` broken hoàn toàn do rule conflict

### Nên làm sớm (security risk)

4. **SEC-01/02** - Admin role qua Custom Claims
5. **AP-03/SEC-04** - `blockedUserIds` private

### Refactor lớn (cần plan tốt)

6. **AP-01** - Reactions subcollection
7. **AP-02** - Friends subcollection
8. **AP-05** - Message reply snapshot

---

_Tài liệu này phản ánh trạng thái code tại commit hiện tại. Không có backward compatibility — dữ liệu cũ cần được migrated hoặc xóa sạch._
