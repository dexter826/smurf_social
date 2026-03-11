# BÁO CÁO THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

**Dự án:** Ứng dụng Mạng Xã Hội (Mobile & Web)
**Kiến trúc Dữ liệu:** Hybrid (Firestore + Realtime Database)

## I. TỔNG QUAN KIẾN TRÚC

1. **Cloud Firestore:** Dùng để lưu trữ dữ liệu tĩnh, cấu trúc phức tạp, cần query nhiều chiều (Người dùng, Bảng tin, Bài viết, Bình luận, Báo cáo, Thông báo). Áp dụng kiến trúc **Fan-out** cho Bảng tin.
2. **Realtime Database (RTDB):** Dùng chuyên biệt cho **Hệ thống Chat và Hiện diện** (Trạng thái Online, Tin nhắn, Đã xem/Đang gõ, Signaling cuộc gọi). Giúp hệ thống chịu tải hàng triệu tin nhắn mà không bị quá giới hạn quota đọc/ghi của Firestore.
3. **Cloud Storage:** Lưu trữ file vật lý.

---

## II. ĐẶC TẢ OBJECT MEDIA (DÙNG CHUNG)

Mọi tệp tin (ảnh, video, tệp đính kèm chat) đều lưu dưới dạng Object này để quản lý giới hạn và tự động làm mờ ảnh nhạy cảm (thông qua Cloud Vision API).

```json
{
  "url": "https://firebasestorage...",
  "fileName": "tailieu_hoctap.pdf",
  "mimeType": "application/pdf",
  "size": 2048576, // Dùng để chặn nếu Ảnh > 5MB, Video > 50MB, File > 10MB
  "thumbnailUrl": "...", // (Chỉ có ở Video)
  "isSensitive": false // Cờ đánh dấu nội dung nhạy cảm
}
```

---

## III. FIRESTORE SCHEMA (Dữ liệu Core & Mạng Xã Hội)

### 1. Collection `users` (Quản lý Hồ sơ)

- `uid` (String): Document ID (Firebase Auth UID).
- `email` (String): Dùng để đăng nhập và tìm kiếm chính xác duy nhất.
- `fullName` (String): Tên hiển thị (Max 50 ký tự).
- `bio` (String): Tiểu sử (Max 500 ký tự).
- `avatar` (MediaObject): Ảnh đại diện.
- `cover` (MediaObject): Ảnh bìa.
- `dob` (Timestamp): Ngày sinh.
- `gender` (String): `male`, `female`, `other`.
- `location` (String): Vị trí.
- `status` (String): `active`, `banned`.
- `createdAt` / `updatedAt` / `deletedAt` (Timestamp).

_(Lưu ý: Quyền Admin sẽ được set bằng Firebase Auth Custom Claims, không lưu ở đây để bảo mật)._

**1.1. Sub-collection `friends` (Bên trong `users/{uid}`)**

- `friendId` (String): Document ID.
- `createdAt` (Timestamp).

**1.2. Sub-collection `blockedUsers` (Bên trong `users/{uid}`)**

- `blockedUid` (String): Document ID.
- `createdAt` (Timestamp).

**1.3. Sub-collection `feeds` (Bên trong `users/{uid}` - Bảng tin Fan-out)**

- `postId` (String): Document ID.
- `authorId` (String).
- `createdAt` (Timestamp).

### 2. Collection `friendRequests`

Quản lý luồng gửi/nhận lời mời độc lập.

- `id` (String): Document ID.
- `senderId` (String): UID người gửi.
- `receiverId` (String): UID người nhận.
- `status` (String): `pending`, `accepted`, `rejected`.
- `createdAt` / `updatedAt` (Timestamp).

### 3. Collection `posts`

Hỗ trợ giới hạn 5000 ký tự, Soft-delete và kiểm duyệt.

- `id` (String): Document ID.
- `authorId` (String).
- `content` (String).
- `visibility` (String): `public`, `friends`, `private`.
- `media` (Array of MediaObject): Tối đa 10 file.
- `reactions` (Map): `{ like: 10, love: 5, haha: 2... }`.
- `commentCount` (Number).
- `isEdited` (Boolean).
- `status` (String): `active`, `deleted`.
- `createdAt` / `updatedAt` / `deletedAt` (Timestamp).

### 4. Collection `comments`

Thiết kế Root Collection để dễ phân trang (5 comment/trang theo yêu cầu).

- `id` (String): Document ID.
- `postId` (String).
- `authorId` (String).
- `parentId` (String): `null` nếu là bình luận gốc.
- `content` (String): Max 2000 ký tự.
- `image` (MediaObject): Tối đa 1 ảnh.
- `reactions` (Map).
- `replyCount` (Number).
- `isEdited` (Boolean).
- `status` (String): `active`, `deleted`.
- `createdAt` / `updatedAt` / `deletedAt` (Timestamp).

### 5. Collection `reports` (Quản trị viên)

- `id` (String): Document ID.
- `reporterId` (String).
- `targetType` (String): `post`, `comment`, `user`.
- `targetId` (String).
- `reason` (String): `spam`, `harassment`, `hate_speech`, `sensitive`...
- `description` (String): Max 500 ký tự.
- `images` (Array of MediaObject): Tối đa 5 ảnh bằng chứng.
- `status` (String): `pending`, `resolved`, `rejected`.
- `resolution` (String): Hướng xử lý của Admin.
- `createdAt` / `updatedAt` / `resolvedAt` (Timestamp).

### 6. Collection `notifications`

- `id` (String): Document ID.
- `receiverId` (String).
- `type` (String): `reaction`, `comment`, `friend_request`, `system`.
- `actorId` (String).
- `targetId` (String): Post/Comment ID liên quan.
- `isRead` (Boolean).
- `createdAt` (Timestamp).

---

## IV. REALTIME DATABASE SCHEMA (Hệ thống Chat & Tốc độ cao)

Được thiết kế theo kiến trúc Flatten (phẳng) để tối ưu Listeners. Giải quyết toàn bộ bài toán Mention, Trả lời, Chuyển tiếp, Xóa tin nhắn, Đã xem...

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
      "isGroup": true,
      "name": "Nhóm Đồ Án", // Tối đa 50 ký tự
      "avatar": { "url": "...", "isSensitive": false },
      "creatorId": "uid_1",
      "members": {
        "uid_1": "admin",
        "uid_2": "member"
      },
      "lastMessage": {
        "senderId": "uid_1",
        "content": "Chào mọi người",
        "type": "text",
        "timestamp": 1678900000,
        "messageId": "msg_id_1",
        "readBy": {
          "uid_2": 1678900100
        },
        "deliveredTo": {
          "uid_2": 1678900050
        }
      },
      "createdAt": 1678900000,
      "updatedAt": 1678900000
    }
  },

  "messages": {
    "conv_id_1": {
      "msg_id_1": {
        "senderId": "uid_1",
        "type": "text", // text, image, video, file, voice, system, call
        "content": "Nội dung tin nhắn...",
        "media": [
          // Array of MediaObject. Tối đa 10 files
        ],
        "mentions": ["uid_2", "uid_3"], // Lưu UID người bị nhắc tên
        "isForwarded": false,

        "replyToId": "msg_id_old",
        "replyToSnippet": {
          "senderId": "uid_2",
          "content": "Tin nhắn gốc",
          "type": "text"
        },

        "isEdited": false, // Giới hạn sửa trong 5 phút
        "isRecalled": false, // Thu hồi phía mọi người

        "deletedBy": {
          // Chức năng "Xóa phía tôi"
          "uid_2": true
        },

        "readBy": {
          // Trạng thái "Đã xem"
          "uid_2": 1678900100
        },
        "deliveredTo": {
          // Trạng thái "Đã nhận"
          "uid_2": 1678900050
        },

        "reactions": {
          "uid_2": "haha"
        },
        "createdAt": 1678900000,
        "updatedAt": 1678900000
      }
    }
  },

  "user_chats": {
    "uid_1": {
      "conv_id_1": {
        "isPinned": true, // Ghim hội thoại
        "isMuted": false, // Tắt thông báo
        "isArchived": false, // Lưu trữ hội thoại
        "unreadCount": 5, // Bộ đếm tin nhắn chưa đọc
        "lastReadMsgId": "msg_id_1",
        "lastMsgTimestamp": 1678900000 // Để sort danh sách chat
      }
    }
  },

  "call_signaling": {
    "uid_2": {
      "callerId": "uid_1",
      "conversationId": "conv_id_1",
      "callType": "video",
      "status": "ringing", // ringing, accepted, rejected
      "zegoToken": "eyJhb...", // Token tham gia ZegoCloud
      "timestamp": 1678900000
    }
  }
}
```
