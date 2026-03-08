# Danh sách nhiệm vụ tối ưu hóa Database (Firestore)

- [ ] **1. Dư thừa và bất đồng bộ dữ liệu**
  - [ ] Sửa `participants: User[]` thành `participantIds: string[]` trong model `Conversation`.
  - [ ] Đồng bộ snapshot `lastMessagePreview` (Conversation) và `replyToSnippet` (Message) qua Cloud Function khi tin nhắn gốc bị sửa hoặc xóa.

- [ ] **2. Điểm nghẽn cổ chai & Giới hạn 1MB Firestore**
  - [ ] Chuyển các mảng lớn (`readBy`, `deliveredTo`, `deletedBy`, `typingUsers`, `pinnedBy`) sang Subcollections nếu dự đoán nhóm chat sẽ đông.
  - [ ] Quản lý trạng thái "Typing" bằng Firebase Realtime Database (RTDB) để giảm tải giới hạn ghi (write limits) của Firestore.
  - [ ] Tách `unreadCount` hoặc `memberJoinedAt` nếu quá lớn ở các group chat.

- [ ] **3. Lỗ hổng / Bất ổn trong Rules và Phân quyền**
  - [ ] Khóa Schema Users: Bổ cụng logic kiểm tra `request.resource.data.keys()` vào rules để ngăn user nhét field rác.
  - [ ] Di chuyển Rule check `messages/create` sang Cloud Functions hoặc dùng custom claims để tránh chi phí read thêm document Conversation mỗi khi gửi tin nhắn.

- [ ] **4. Quản lý dọn dẹp rác dữ liệu (Orphaned Data)**
  - [ ] Tạo Cloud Function (`onDelete`) cho `Post` để xóa đệ quy `comments` và `reactions` liên quan.
  - [ ] Tạo Cloud Function (`onDelete`) cho `Conversation` để xóa toàn bộ `messages` bên trong.

- [ ] **5. Thiết kế thiếu cho tính mở rộng**
  - [ ] Triển khai Subcollection cho `reactions` (để biết chính xác ai đã thả tim) thay vì chỉ lưu Record `reactionSummary`.
