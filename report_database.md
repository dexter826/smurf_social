# BÁO CÁO THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

**Dự án:** Ứng dụng Mạng Xã Hội
**Nền tảng:** Mobile & Web
**Backend:** Firebase (Firestore, Realtime Database, Cloud Storage, Cloud Functions)

---

## I. TỔNG QUAN KIẾN TRÚC LƯU TRỮ

Hệ thống sử dụng kết hợp hai loại cơ sở dữ liệu của Firebase nhằm tối ưu hiệu năng và chi phí:

1. **Cloud Firestore:** Lưu trữ dữ liệu tĩnh, cấu trúc phức tạp và cần truy vấn nhiều chiều (Người dùng, Bài viết, Bình luận, Báo cáo, Thông báo). Sử dụng kiến trúc **Fan-out** cho Bảng tin để tối ưu tốc độ đọc.
2. **Realtime Database (RTDB):** Lưu trữ dữ liệu đòi hỏi tốc độ cập nhật thời gian thực cao, độ trễ thấp (Trạng thái Online, Nhắn tin, Typing, Cấu hình hội thoại cá nhân).
3. **Cloud Storage:** Lưu trữ file vật lý (Ảnh, Video, Tệp đính kèm). Metadata của file được lưu trữ kèm cờ `isSensitive` để phục vụ chức năng tự động làm mờ ảnh nhạy cảm.

---

## II. ĐẶC TẢ OBJECT MEDIA DÙNG CHUNG

Để đáp ứng các giới hạn khắt khe về file upload, mọi tệp tin lưu vào database đều sử dụng chung một cấu trúc Object Metadata sau:

```json
{
  "url": "https://firebasestorage...",
  "fileName": "tailieu.pdf",
  "mimeType": "application/pdf",
  "size": 2048576,
  "thumbnailUrl": "...",
  "isSensitive": false
}
```

_Ghi chú:_

- `size`: Kích thước file (bytes) để validate các giới hạn (5MB ảnh, 50MB video, 10MB file chat).
- `thumbnailUrl`: URL ảnh thu nhỏ (dành riêng cho video).
- `isSensitive`: Cờ đánh dấu nội dung nhạy cảm (Được Cloud Vision API cập nhật tự động).

---

## III. FIRESTORE SCHEMA (Dữ liệu tĩnh & Truy vấn)

### 1. Collection `Users`

Quản lý thông tin cá nhân, định danh người dùng.

- `uid` (String): Document ID (Trùng với Firebase Auth UID).
- `email` (String): Email đăng nhập và dùng để tìm kiếm chính xác.
- `fullName` (String): Tên người dùng (Tối đa 50 ký tự).
- `bio` (String): Tiểu sử giới thiệu (Tối đa 500 ký tự).
- `gender` (String): Giới tính.
- `dob` (Timestamp): Ngày tháng năm sinh.
- `location` (String): Địa điểm.
- `avatar` (Map): Chứa Object Media (Kích thước tối đa 5MB, nén max 512px).
- `cover` (Map): Chứa Object Media (Kích thước tối đa 10MB, nén max 1920px).
- `status` (String): `active` hoặc `locked` (do Admin quản lý).
- `createdAt` / `updatedAt` (Timestamp).

**1.1. Sub-collection `Relationships` (Bên trong `Users/{uid}`)**
Lưu trữ trạng thái kết bạn và danh sách chặn.

- `targetUid` (String): ID người dùng đích (Làm Document ID).
- `status` (String): `friends`, `pending_sent`, `pending_received`, `blocked`.
- `createdAt` (Timestamp).

**1.2. Sub-collection `Feeds` (Bên trong `Users/{uid}`)**
Kiến trúc Fan-out để load bảng tin nhanh.

- `postId` (String): ID bài viết (Làm Document ID).
- `authorId` (String): ID người đăng.
- `createdAt` (Timestamp): Dùng để sắp xếp mới nhất.

### 2. Collection `Posts`

Lưu trữ bài đăng mạng xã hội.

- `id` (String): Document ID.
- `authorId` (String): UID người đăng.
- `content` (String): Nội dung bài viết (Tối đa 5,000 ký tự).
- `visibility` (String): Mức độ hiển thị (`public`, `friends`, `private`).
- `media` (Array of Maps): Mảng các Object Media. Tối đa 10 ảnh hoặc 1 video.
- `isEdited` (Boolean): Đánh dấu đã chỉnh sửa.
- `reactions` (Map): Bộ đếm cảm xúc `{ like: 0, love: 0, haha: 0... }`.
- `commentCount` (Number): Tổng số bình luận.
- `createdAt` / `updatedAt` (Timestamp).

_(Lưu ý: Collection con `Reactions` nằm trong mỗi Post để lưu UID người dùng và loại cảm xúc)._

### 3. Collection `Comments`

Root Collection lưu trữ bình luận.

- `id` (String): Document ID.
- `postId` (String): ID bài viết chứa bình luận.
- `authorId` (String): UID người bình luận.
- `parentId` (String): ID bình luận gốc (`null` nếu là bình luận gốc).
- `content` (String): Nội dung (Tối đa 2,000 ký tự).
- `image` (Map): 1 Object Media đính kèm (Tối đa 0.5MB, nén max 1280px).
- `isEdited` (Boolean).
- `replyCount` (Number): Đếm số lượng phản hồi.
- `reactions` (Map): Bộ đếm cảm xúc.
- `createdAt` / `updatedAt` (Timestamp).

### 4. Collection `Reports`

Lưu trữ báo cáo vi phạm, phân hệ Admin xử lý.

- `id` (String): Document ID.
- `reporterId` (String): UID người gửi báo cáo.
- `targetType` (String): `post`, `comment`, hoặc `user`.
- `targetId` (String): ID của đối tượng bị báo cáo.
- `reason` (String): Lý do (`spam`, `harassment`, `hate_speech`, `sensitive`, `scam`, `other`).
- `description` (String): Mô tả chi tiết (Tối đa 500 ký tự).
- `images` (Array of Maps): Tối đa 5 ảnh bằng chứng.
- `status` (String): Trạng thái (`pending`, `resolved`, `rejected`, `deleted`).
- `createdAt` / `updatedAt` (Timestamp).

### 5. Collection `Notifications`

Quản lý thông báo in-app.

- `id` (String): Document ID.
- `userId` (String): ID người nhận thông báo.
- `type` (String): `reaction`, `comment`, `friend_request`, `report_update`.
- `actorId` (String): ID người kích hoạt sự kiện.
- `targetId` (String): ID bài viết/bình luận/người dùng liên quan.
- `isRead` (Boolean).
- `createdAt` (Timestamp).

---

## IV. REALTIME DATABASE SCHEMA (Dữ liệu thời gian thực)

Được thiết kế theo kiến trúc Flatten (phẳng) để tối ưu Listeners.

```json
{
  "presence": {
    "uid_1": {
      "isOnline": true,
      "lastSeen": 1678900000
    }
  },

  "conversations": {
    "conv_id_1": {
      "type": "group",
      "name": "Nhóm Đồ Án",
      "avatar": { "url": "...", "isSensitive": false },
      "members": {
        "uid_1": "admin",
        "uid_2": "member"
      },
      "memberCount": 2,
      "createdAt": 1678900000,
      "updatedAt": 1678900000
    }
  },

  "messages": {
    "conv_id_1": {
      "msg_id_1": {
        "senderId": "uid_1",
        "type": "text",
        "content": "Nội dung...",
        "media": [
          // Array of Object Media.
        ],
        "replyToMsgId": "msg_id_old",
        "isEdited": false,
        "isRevoked": false,
        "reactions": { "uid_2": "haha" },
        "createdAt": 1678900000,
        "updatedAt": 1678900000
      }
    }
  },

  "user_chats": {
    "uid_1": {
      "conv_id_1": {
        "isPinned": true,
        "isMuted": false,
        "isArchived": false,
        "unreadCount": 5,
        "lastReadMsgId": "msg_id_1",
        "lastMsgTimestamp": 1678900000,
        "hiddenMessages": {
          "msg_id_0": true
        }
      }
    }
  }
}
```

---

## V. TÍCH HỢP TÍNH NĂNG MỞ RỘNG

1. **Gọi thoại / Video (WebRTC):** Sử dụng SDK ZegoCloud. Firebase Realtime Database lưu trữ `call_log` dưới dạng một `type` tin nhắn đặc biệt trong bảng `messages`.
2. **Kiểm duyệt ảnh nhạy cảm:** Kích hoạt tự động qua Firebase Cloud Functions kết hợp Google Cloud Vision API. Khi phát hiện vi phạm, hệ thống cập nhật `isSensitive = true`. Frontend thực hiện làm mờ dựa trên cờ này.
