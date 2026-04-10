# Cloud Functions

Tài liệu mô tả đầy đủ Cloud Functions đang export tại `functions/src/index.ts`.

## Cấu hình chung

- Runtime options toàn cục: `region = us-central1`, `memory = 512MiB`, `cpu = 0.5`, `concurrency = 1`.
- Nhóm function: Callable, Firestore Trigger, RTDB Trigger, Scheduled.

---

## 1. Callable Functions

Client gọi qua `httpsCallable(functions, '<name>')`. Tất cả callable hiện tại đều yêu cầu đã đăng nhập.

### `banUser`

Mục đích: Khóa hoặc mở khóa tài khoản. Chỉ Admin, không cho tự ban chính mình.

| Param    | Type                 | Mô tả                       |
| :------- | :------------------- | :-------------------------- |
| `userId` | String               | ID người dùng cần xử lý     |
| `action` | `"ban"` \| `"unban"` | Hành động, mặc định `"ban"` |

Hành vi:

- `ban`: cập nhật `users/{userId}.status = "banned"`, revoke refresh token, xóa `users/{userId}/private/fcm`, xóa friend request `pending`, cập nhật `presence` offline trên RTDB.
- `unban`: cập nhật `status = "active"`.

### `resolveReport`

Mục đích: Xử lý báo cáo ở trạng thái `pending`. Chỉ Admin.

| Param        | Type                                                | Mô tả                                  |
| :----------- | :-------------------------------------------------- | :------------------------------------- |
| `reportId`   | String                                              | ID báo cáo                             |
| `resolution` | String                                              | Nội dung xử lý, mặc định `"Đã xử lý"`  |
| `action`     | `"delete_content"` \| `"warn_user"` \| `"ban_user"` | Hành động, mặc định `"delete_content"` |

Hành vi:

- Cập nhật report sang `resolved`.
- `delete_content`: soft-delete post/comment mục tiêu.
- `warn_user`: gửi cảnh báo cho user mục tiêu.
- `ban_user`: ban user mục tiêu.
- Gửi notification + push cho người báo cáo và người bị tác động.

### `rejectReport`

Mục đích: Từ chối báo cáo. Chỉ Admin.

| Param      | Type   | Mô tả      |
| :--------- | :----- | :--------- |
| `reportId` | String | ID báo cáo |

Hành vi: cập nhật report sang `rejected`, gán `resolution = "Không phát hiện vi phạm"`, gửi notification + push cho người báo cáo.

### `searchUsers`

Mục đích: Tìm user theo email exact match, lọc hai chiều block và lọc user bị ban.

| Param           | Type   | Mô tả                            |
| :-------------- | :----- | :------------------------------- |
| `searchTerm`    | String | Email cần tìm (>= 1 ký tự)       |
| `currentUserId` | String | ID người đang tìm (để lọc block) |

Response: `{ users: User[] }`.

### `generateFriendSuggestions`

Mục đích: Sinh gợi ý bạn bè dựa trên cosine similarity của `userVector`.

| Param   | Type   | Mô tả                       |
| :------ | :----- | :-------------------------- |
| `limit` | Number | Giới hạn 1..50, mặc định 20 |

Response: `{ userId, count, suggestionIds: string[] }`.

Hành vi:

- Lọc: chính mình, bạn bè, block hai chiều.
- Ghi cache: `suggestedFriends`, `suggestionsLastUpdated`.
- Có REST fallback khi lỗi token/network của Admin SDK.

### `generateZegoToken`

Mục đích: Cấp token gọi Zego cho đúng người dùng đăng nhập.

| Param      | Type   | Mô tả         |
| :--------- | :----- | :------------ |
| `roomId`   | String | ID phòng gọi  |
| `userId`   | String | UID người gọi |
| `userName` | String | Tên hiển thị  |

Ràng buộc: `userId` phải trùng `auth.uid`.

Response: `{ token: string }` (TTL 3600 giây).

---

## 2. Firestore Triggers

### `onUserProfileUpdated`

- Trigger: `users/{userId}` (`onDocumentWritten`).
- Khi các trường hồ sơ thay đổi (interests/location/school/generation) hoặc chưa có vector:
- Tạo profile text.
- Gọi Gemini embedding (`gemini-embedding-2-preview`).
- Cập nhật `userVector` vào user document.

### `onPostWrite`

- Trigger: `posts/{postId}` (`onDocumentWritten`).
- Tạo post: fan-out vào feed tác giả và bạn bè (friends/public), có lọc user ẩn hoạt động tác giả.
- Soft-delete: xóa feed entry của tác giả và bạn bè.
- Đổi `friends -> private`: xóa khỏi feed bạn bè, giữ feed tác giả.
- Đổi `private -> friends/public`: fan-out lại cho bạn bè.
- Đổi nội dung/media: cập nhật `updatedAt` feed để kích hoạt listener client.

### `onFriendWrite`

- Trigger: `users/{userId}/friends/{friendId}` (`onDocumentWritten`).
- Add: fan-out tối đa 100 post `active` có visibility `friends/public` của friend vào feed user.
- Remove: xóa post của friend khỏi feed user.

### `onBlockedUserWrite`

- Trigger: `users/{userId}/blockedUsers/{blockedUid}` (`onDocumentWritten`).
- `isFullyBlocked: false -> true`: xóa bài viết hai chiều khỏi feed của nhau.
- `isFullyBlocked: true -> false`: khôi phục bài viết hai chiều nếu vẫn là bạn bè.

### `onPostReactionWrite`

- Trigger: `posts/{postId}/reactions/{userId}` (`onDocumentWritten`).
- Tăng/giảm `reactionCount` trên post.
- Khi tạo reaction mới và không phải self-react: tạo notification + push cho tác giả post.

### `onCommentReactionWrite`

- Trigger: `comments/{commentId}/reactions/{userId}` (`onDocumentWritten`).
- Tăng/giảm `reactionCount` trên comment.
- Khi tạo reaction mới và không phải self-react: tạo notification + push cho tác giả comment.

### `onCommentWrite`

- Trigger: `comments/{commentId}` (`onDocumentWritten`).
- Tạo comment: tăng `commentCount` post, tăng `replyCount` nếu là reply, gửi notification + push.
- Soft-delete comment:
- Giảm counter tương ứng.
- Xóa notification liên quan comment.
- Nếu là comment gốc thì soft-delete cascade replies con.

### `onFriendRequestWrite`

- Trigger: `friendRequests/{reqId}` (`onDocumentWritten`).
- Create: gửi notification + push cho người nhận.
- Delete: xóa notification liên quan request.
- Update `pending -> accepted`: gửi notification type `system` + push cho người gửi.

### `onReportCreated`

- Trigger: `reports/{reportId}` (`onDocumentCreated`).
- Khi tạo report mới: gửi notification + push cho toàn bộ user có role `admin`.

---

## 3. RTDB Trigger

### `onMessageCreated`

- Trigger: `/messages/{convId}/{msgId}` (`onValueCreated`).
- Bỏ qua nếu `type = system` hoặc message đã recall.
- Mapping `type -> contentSnippet` cho push body.
- `share_post`: parse JSON, ưu tiên `snippet` <= 80 ký tự.
- `call`: chỉ push khi `status = started`.
- `text`/fallback: normalize mention `@[id:name]`, cắt 100 ký tự.
- Với mỗi thành viên (trừ sender):
- Nếu bị mute và không mention thì bỏ qua.
- Mention trong group gửi type `mention`.
- Còn lại gửi type `chat`.
- Không ghi notification Firestore cho luồng chat/mention.

---

## 4. Scheduled Function

### `systemCleanup`

- Lịch chạy: Chủ nhật 03:00 (`Asia/Ho_Chi_Minh`).
- Bước 1: xóa notification đã đọc cũ hơn 90 ngày.
- Bước 2: xóa friend request `pending` cũ hơn 30 ngày.
- Bước 3: hard-delete post soft-delete cũ hơn 90 ngày, xóa media Storage và sub-collection `reactions`.
- Bước 4: hard-delete comment soft-delete cũ hơn 90 ngày, xóa ảnh Storage và sub-collection `reactions`.
