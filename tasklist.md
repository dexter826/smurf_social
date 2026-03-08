# Tasklist V2 — Business Process Audit (Smurf Social)

> **Nguồn gốc:** So sánh `quy_trinh_nghiep_vu.md` với code đã triển khai.
> **Phân loại:**
>
> - MISSING — Tính năng trong spec chưa được viết code
> - 🟠 DRIFT — Code đúng logic nhưng khác với mô tả trong spec
> - 🔵 SPEC UPDATE — Spec cần cập nhật để phản ánh đúng thực tế đã triển khai

---

## MISSING — Tính năng trong spec chưa triển khai

### MISSING-01 — Kiểm duyệt ảnh bình luận (Sensitive Image Moderation) — **CHƯA TRIỂN KHAI HOÀN TOÀN**

**Spec mô tả (UC-BL01, UC-BL02, UC-BL03):**

> "Nếu bình luận kèm ảnh, hệ thống tự động kiểm duyệt và làm mờ nếu phát hiện nội dung nhạy cảm. Người dùng nhấn 'Xem ảnh' → hiện ảnh gốc; tự động làm mờ khi mở lại bình luận."

**Hiện trạng:** Không có gì được triển khai:

- `Comment` type: không có field `isSensitive: boolean`
- Cloud Functions (`functions/src/`): không có function nào gọi Vision API hoặc bất kỳ service kiểm duyệt nào
- `CommentItem.tsx`: ảnh hiển thị trực tiếp, không blur/unblur
- Không có UI "Xem ảnh" button

**Nhận xét khách quan:** Đây là tính năng phức tạp yêu cầu tích hợp Google Cloud Vision API (hoặc tương đương) và phát sinh chi phí. Nên cân nhắc:

1. Dùng Firebase Extension "Moderate Images" (dễ tích hợp)
2. Tự implement CF với Cloud Vision API
3. Bỏ khỏi spec nếu không có kế hoạch triển khai

**Files cần tạo/sửa (nếu triển khai):**

- `src/types.ts` — thêm `isSensitive?: boolean` vào `Comment`
- `functions/src/comments/onCommentCreated.ts` — sau khi lưu comment có ảnh, gọi Vision API
- `src/components/feed/comment/CommentItem.tsx` — blur ảnh nhạy cảm, button "Xem ảnh"

- [ ] Thêm `isSensitive?: boolean` vào `Comment` type
- [ ] Tạo Cloud Function kiểm duyệt ảnh bình luận (Vision API)
- [ ] Implement blur UI + "Xem ảnh" button trong `CommentItem`
- [ ] Tương tự cho ảnh bài viết (nếu spec bổ sung)

---

### MISSING-02 — Block không ngăn gửi tin nhắn trong conversation đã tồn tại

**Spec:** "Trường hợp duy nhất không thể nhắn tin là khi một trong hai người **đã chặn** người kia."

**Hiện trạng:**

- `conversationService.getOrCreateConversation` ✅ — kiểm tra block, không tạo conversation mới
- `messageService.sendTextMessage` / `sendImageMessage` / v.v. — **KHÔNG** kiểm tra block
- Firestore rules cho `/messages/{id}` — chỉ kiểm tra `participantIds`, không kiểm tra block status
- Kết quả: nếu conversation đã được tạo trước khi block, người bị chặn vẫn gửi được tin nhắn

**Giải pháp được đề xuất:** Thêm check block trong Firestore security rules cho message create, hoặc thêm Cloud Function `beforeMessageCreate`. Phức tạp vì rules không có quyền đọc `private/security` của user khác.

**Nhận xét khách quan:** Có thể giải quyết bằng:

1. CF Trigger `onMessageCreated` → kiểm tra block → xóa message nếu bị chặn (eventual consistency)
2. Hoặc giữ nguyên và accept trade-off (UX đơn giản hơn, block trong conversation đã có không hoàn toàn)

**Files cần sửa:**

- `firestore.rules` hoặc tạo `functions/src/messages/onMessageCreated.ts`

- [ ] Quyết định approach xử lý block trong existing conversations
- [ ] Implement block enforcement cho message creation

---

### MISSING-03 — Không có thông báo khi ai đó react vào tin nhắn của bạn

**Spec (UC-NT06 - Cảm xúc tin nhắn):** Không nêu rõ có notification hay không, nhưng đây là gap đáng chú ý so với hành vi react comment (có notification `REACT_COMMENT`).

**Hiện trạng:**

- `onMessageReactionWrite` CF: cập nhật conversation `lastMessage` hiển thị reaction, nhưng **không tạo AppNotification** cho chủ tin nhắn
- `NotificationType` enum: không có `REACT_MESSAGE`
- So sánh: comment reaction → `REACT_COMMENT` notification ✅, message reaction → không có

**Nhận xét khách quan:** Notification cho message reaction có thể gây spam nếu chat nhóm đông người. Có thể giới hạn: chỉ notify trong chat 1-1, hoặc không notify (điều chỉnh spec).

**Files cần sửa (nếu triển khai):**

- `src/types.ts` — thêm `REACT_MESSAGE = "react_message"` vào `NotificationType`
- `functions/src/notifications/onMessageReactionWrite.ts` — thêm createNotification
- `src/services/notificationService.ts` — thêm case `REACT_MESSAGE` trong `getNotificationText`

- [ ] Quyết định có notify message reaction hay không
- [ ] Nếu có: thêm `NotificationType.REACT_MESSAGE` và implement trong CF

---

### MISSING-04 — Notification "lời mời kết bạn" không bị xóa khi sender hủy lời mời

**Vấn đề:** Khi sender gọi `friendService.cancelFriendRequest()` (xóa document khỏi `friendRequests`), không có Cloud Function nào xử lý việc xóa notification tương ứng cho receiver. Receiver vẫn thấy thông báo "X muốn kết bạn với bạn" dù lời mời đã bị hủy. Nhấn vào notification sẽ lỗi vì document không tồn tại.

**Files cần tạo:**

- `functions/src/friends/onFriendRequestDeleted.ts` — Khi `friendRequest` bị xóa, tìm và xóa notification `FRIEND_REQUEST` tương ứng

- [ ] Tạo `onFriendRequestDeleted` CF để cleanup notification khi hủy lời mời
- [ ] Xử lý navigation trong `NotificationItem` khi click vào notification có data bị xóa

---

## 🟠 DRIFT — Hành vi khác với spec nhưng hợp lý hơn

### DRIFT-01 — Rời nhóm: tự động chuyển owner vs. UI cho chọn

**Spec:** "Là Chủ nhóm: hệ thống yêu cầu chỉ định Chủ nhóm mới trước khi rời."

**Thực tế:**

- UI (`useChatGroups.handleLeaveGroup`) → hiển thị `TransferAdminModal` cho user chọn ✅ (đúng spec)
- Service (`groupService.leaveGroup`) → cũng có fallback tự động set `creatorId = newAdminIds[0] || newParticipantIds[0]` nếu không qua UI

Behavior thực tế hơi khác: nếu gọi `leaveGroup` trực tiếp mà không qua modal, server sẽ tự assign owner mà không cần user chọn. **Đây là behavior hợp lý** hơn spec (đảm bảo nhóm không mất owner trong bất kỳ trường hợp nào). **Spec nên cập nhật** để phản ánh: "nếu user không chọn, hệ thống tự chỉ định admin đầu tiên làm chủ nhóm mới."

**Đề xuất:** Không cần fix code. **Cập nhật spec.**

- [ ] Cập nhật quy trình nghiệp vụ UC-NT11: bổ sung fallback khi không chọn được owner

---

### DRIFT-02 — Từ chối lời mời kết bạn: document bị update vs. bị xóa

**Spec:** "Từ chối: Lời mời bị hủy, người gửi không nhận được thông báo từ chối." — Không nêu rõ document Firestore bị xóa hay chỉ update status.

**Thực tế:**

- `friendService.rejectFriendRequest` → `updateDoc` với `status: REJECTED` (cập nhật, không xóa)
- Nhưng `onFriendRequestStatusChange` CF chỉ xử lý `PENDING → ACCEPTED`, không xử lý `PENDING → REJECTED`
- Kết quả: document với `status: REJECTED` tồn tại mãi trong Firestore + không được dọn dẹp

**Nhận xét:** Nên thêm cleanup cho rejected requests hoặc đổi thành xóa document như cách `cancelFriendRequest` làm.

**Files cần sửa:**

- `src/services/friendService.ts` — đổi `rejectFriendRequest` thành `deleteDoc` thay vì `updateDoc`  
  **HOẶC** tạo scheduled cleanup để xóa các `friendRequests` có status `REJECTED`

- [ ] Quyết định approach: delete rejected request document hay scheduled cleanup

---

### DRIFT-03 — Chỉ subscription bắt lời mời chứ không có one-time fetch trong ContactsPage

**Spec:** Không nêu cụ thể realtime hay one-time fetch. Thực tế App dùng `subscribeToSentRequests` / `subscribeToReceivedRequests` — hoàn toàn hợp lý hơn spec, không cần fix.

- [ ] Cập nhật spec: lời mời kết bạn được theo dõi realtime (không cần refresh)

---

## � MISSING (bổ sung)

### MISSING-05 — `searchUsers` CF không lọc user bị chặn khỏi kết quả tìm kiếm

**Spec (Section 9 — Quy trình Chặn Người dùng):** "Tên người bị chặn không xuất hiện trong kết quả tìm kiếm."

**Hiện trạng:** `functions/src/search/searchUsers.ts` chỉ lọc `status != 'banned'` và `id != currentUserId`. Không có bất kỳ logic nào kiểm tra quan hệ block giữa người tìm và kết quả trả về. Kết quả: người dùng có thể tìm thấy và nhìn thấy profile của người đã chặn mình (hoặc người mình đã chặn) qua thanh tìm kiếm.

**Files cần sửa:**

- `functions/src/search/searchUsers.ts` — sau khi lấy kết quả, đọc `private/security` của `currentUserId` để lọc bỏ các user có quan hệ block với người tìm kiếm

- [ ] Sửa `searchUsers` CF: lọc bỏ user có quan hệ block (cả hai chiều) khỏi kết quả tìm kiếm

---

## 🔵 SPEC UPDATE — Cập nhật quy trình nghiệp vụ

### SPEC-01 — Ghi âm tin nhắn thoại: UI đã có nhưng không được mô tả rõ

**Spec:** Bảng loại tin nhắn có "Tin nhắn thoại: Ghi âm và gửi ngay trong ứng dụng" — nhưng không nêu:

- Không có thời gian ghi âm tối đa
- Không nêu rõ có thể preview trước khi gửi không

**Thực tế:**

- `RecordingUI.tsx` hiển thị duration khi đang ghi
- `ChatInput.tsx`: sau khi dừng ghi, file voice xuất hiện trong preview queue, user xem trước rồi mới gửi
- `useAudioRecorder` hook xử lý `MediaRecorder` API

**Đề xuất:** Bổ sung giới hạn thời gian ghi âm (ví dụ 5 phút) và mô tả flow preview trước khi gửi vào spec.

- [ ] Bổ sung giới hạn thời gian ghi âm vào `appConfig.ts` (hiện chưa có `VOICE_MAX_DURATION`)
- [ ] Cập nhật spec: flow ghi âm → preview → gửi

---

### SPEC-02 — Cắt ảnh (Image Cropper) khi đổi avatar/ảnh bìa chưa được đề cập

**Thực tế:** `ProfileHeader.tsx` mở `ImageCropper` modal trước khi upload, cho phép:

- Crop ảnh với tỷ lệ cố định (avatar: vuông, cover: 16:9)
- Checkbox "Chia sẻ lên bảng tin" (true/false)

Spec chỉ nói "Người dùng tải lên ảnh mới", không đề cập đến crop flow. Đây là UX tốt cần document lại.

- [ ] Bổ sung bước crop ảnh vào quy trình "Cập nhật ảnh đại diện và ảnh bìa"

---

### SPEC-03 — Tìm kiếm người dùng: chỉ hỗ trợ email chính xác, spec Admin nêu "tên hoặc email"

**Spec Section 11 (Admin):** "Tìm kiếm tài khoản theo tên hoặc email."

**Thực tế:** `searchUsers` CF chỉ hỗ trợ tìm kiếm bằng email chính xác (`.where('email', '==', ...)`). Không hỗ trợ tìm theo tên. Admin panel cũng dùng chung logic này nên không thể tìm user theo tên như spec mô tả.

- [ ] Cân nhắc bổ sung tìm kiếm theo tên hoặc điều chỉnh spec Admin để chỉ tìm theo email

---

### SPEC-04 — Trạng thái online/offline: spec không nhắc đến

**Đã triển khai:**

- `usePresenceStore` + Realtime Database `/status/{uid}`
- `UserAvatar` hiển thị dot trạng thái (online/offline)
- `lastSeen` được cập nhật

**Đề xuất:** Bổ sung vào spec quy tắc hiển thị trạng thái.

- [ ] Bổ sung quy tắc hiển thị online/offline vào spec

---

## ✅ CHECKLIST HOÀN THÀNH

| Task       | Mô tả ngắn                                                    | Priority   | Status |
| ---------- | ------------------------------------------------------------- | ---------- | ------ |
| MISSING-01 | Triển khai kiểm duyệt ảnh nhạy cảm (Vision API)               | 🟡 MISSING | [ ]    |
| MISSING-02 | Block phải ngăn message trong existing conversation           | 🟡 MISSING | [ ]    |
| MISSING-03 | Notification khi react message                                | 🟡 MISSING | [ ]    |
| MISSING-04 | Cleanup notification khi hủy lời mời kết bạn                  | 🟡 MISSING | [ ]    |
| MISSING-05 | `searchUsers` CF không lọc user bị chặn khỏi kết quả tìm kiếm | 🟡 MISSING | [ ]    |
| DRIFT-01   | Spec về rời nhóm: cập nhật fallback auto-assign owner         | 🟠 DRIFT   | [ ]    |
| DRIFT-02   | Reject friend request: xóa document thay vì update            | 🟠 DRIFT   | [ ]    |
| DRIFT-03   | Spec: ghi nhận realtime subscription cho friend request       | 🟠 DRIFT   | [ ]    |
| SPEC-01    | Bổ sung giới hạn ghi âm + cập nhật flow                       | 🔵 SPEC    | [ ]    |
| SPEC-02    | Bổ sung bước Image Cropper vào flow đổi avatar/cover          | 🔵 SPEC    | [ ]    |
| SPEC-03    | Điều chỉnh search Admin: tên hoặc email vs. chỉ email         | 🔵 SPEC    | [ ]    |
| SPEC-04    | Bổ sung quy tắc online/offline vào spec                       | 🔵 SPEC    | [ ]    |

---

## 📋 GHI CHÚ PHÂN TÍCH

### Những thứ HOẠT ĐỘNG ĐÚNG với spec

| Quy trình                                                        | Trạng thái                            |
| ---------------------------------------------------------------- | ------------------------------------- |
| Đăng ký → Xác thực email → Đăng nhập                             | ✅ Hoàn toàn đúng                     |
| Quên mật khẩu (email reset)                                      | ✅ Đúng                               |
| Tài khoản bị ban → BannedPage                                    | ✅ Đúng                               |
| Ghi nhớ email đăng nhập (rememberMe)                             | ✅ Đúng                               |
| Chỉnh sửa thông tin cá nhân                                      | ✅ Đúng                               |
| Đổi avatar/cover → tạo bài viết (với lựa chọn người dùng)        | ✅ Đúng                               |
| Xóa avatar/cover                                                 | ✅ Đúng                               |
| Gửi/Hủy/Chấp nhận/Từ chối lời mời kết bạn                        | ✅ Đúng                               |
| Không notify khi bị từ chối kết bạn                              | ✅ Đúng (spec yêu cầu)                |
| Tạo/Sửa/Xóa bài viết                                             | ✅ Đúng                               |
| Visibility PUBLIC/FRIENDS/PRIVATE cho bài viết                   | ✅ Đúng                               |
| Feed realtime, pagination vô hạn                                 | ✅ Đúng                               |
| Không hiển thị bài viết của user bị ban/bị chặn                  | ✅ Đúng                               |
| 6 loại reaction cho bài viết                                     | ✅ Đúng                               |
| Bình luận 2 cấp (root + reply)                                   | ✅ Đúng                               |
| Max 1 ảnh / bình luận                                            | ✅ Đúng                               |
| Sửa/Xóa bình luận                                                | ✅ Đúng                               |
| React bình luận + notify tác giả                                 | ✅ Đúng                               |
| Báo cáo bình luận + check đã báo cáo chưa                        | ✅ Đúng                               |
| Lọc bình luận từ user bị ban/bị chặn                             | ✅ Đúng                               |
| Chat 1-1: nhắn tin với anyone, không cần là bạn                  | ✅ Đúng                               |
| Stranger messages → "Tin nhắn chờ" section                       | ✅ Đúng                               |
| MessageRequestBanner trong ChatBox với trạng thái friend request | ✅ Đúng                               |
| Không nhắn tin khi TẠO conversation mới với người đã chặn        | ✅ Đúng                               |
| Trạng thái Đã gửi → Đã nhận → Đã xem                             | ✅ Đúng                               |
| Thu hồi tin nhắn (hiện "Tin nhắn đã được thu hồi")               | ✅ Đúng                               |
| Chỉnh sửa tin nhắn trong 5 phút                                  | ✅ Đúng                               |
| Reply / Forward / React tin nhắn                                 | ✅ Đúng                               |
| Xóa tin nhắn phía mình (deletedBy)                               | ✅ Đúng                               |
| @mention trong nhóm                                              | ✅ Đúng                               |
| Chặn/Bỏ chặn từ profile và ChatBox (UC_Block_User)               | ✅ Đúng                               |
| Block: tự động unfriend + ẩn khỏi search                         | ✅ Đúng (trừ search — xem MISSING-05) |
| Ghim hội thoại (UC-NT14)                                         | ✅ Đúng                               |
| Tắt/bật thông báo hội thoại (UC-NT15)                            | ✅ Đúng                               |
| Lưu trữ/bỏ lưu trữ hội thoại (UC-NT16)                           | ✅ Đúng                               |
| Đánh dấu chưa/đã đọc hội thoại (UC-NT17)                         | ✅ Đúng                               |
| Xóa hội thoại phía mình (UC-NT18, soft delete)                   | ✅ Đúng                               |
| Cập nhật thông tin nhóm (UC-NT13)                                | ✅ Đúng                               |
| Gọi âm thanh/video 1-1 (UC-GD01, qua ZegoCloud)                  | ✅ Đúng                               |
| Gọi nhóm (UC-GD02, tất cả thành viên)                            | ✅ Đúng                               |
| Ghi âm và gửi tin nhắn thoại                                     | ✅ Đúng                               |
| Max 10 file / lần gửi                                            | ✅ Đúng                               |
| Tạo nhóm (min 2, max 100 thành viên)                             | ✅ Đúng                               |
| Thêm/xóa thành viên nhóm (chỉ admin/owner)                       | ✅ Đúng                               |
| Gán/thu hồi quyền admin                                          | ✅ Đúng                               |
| Rời nhóm (tự động assign owner mới nếu owner rời)                | ✅ Đúng (có UI chọn + fallback)       |
| Giải tán nhóm (chỉ owner)                                        | ✅ Đúng                               |
| Tin nhắn hệ thống cho tất cả thay đổi nhóm                       | ✅ Đúng                               |
| Push notification (FCM) cho reactions, comments, friends         | ✅ Triển khai                         |
| Ban/Unban user (CF callable với token revoke)                    | ✅ Đúng                               |
| Resolve/Reject report (CF callable)                              | ✅ Đúng                               |
| Kiểm tra đã báo cáo trước chưa (`hasUserReported`)               | ✅ Đúng                               |
