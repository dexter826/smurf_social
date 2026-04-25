### 📝 BÁO CÁO TÍNH NĂNG "THAM GIA NHÓM QUA LINK" (CHO MOBILE APP)

#### 1. Thay đổi Database (Realtime Database)

Chỉ bổ sung 1 trường duy nhất vào thông tin nhóm:

| Trường           | Kiểu dữ liệu | Mô tả                                       |
| :--------------- | :----------- | :------------------------------------------ |
| **`inviteLink`** | String       | Mã Token của link mời (ví dụ: `abc123xyz`). |

_Lưu ý: Mã này dùng để ghép vào URL theo định dạng: `https://.../join/{inviteLink}`_

---

#### 2. Quy trình và Tính năng

- **Lấy Link mời:** Chỉ **Admin hoặc Trưởng nhóm** mới thấy và có quyền đọc trường `inviteLink` từ UI để hiển thị hoặc tạo nút Share.
- **Làm mới Link:** Chỉ **Admin hoặc Trưởng nhóm** mới có quyền gọi hàm Backend để đổi mã mới.
- **Gia nhập qua link:**
  1. Mobile nhận mã Token từ URL.
  2. Gọi hàm lấy thông tin nhóm để hiện màn hình xem trước (Preview).
  3. Gọi hàm Join để hoàn tất gia nhập.

---

#### 3. Các hàm Backend (httpsCallable)

Mobile sử dụng 4 hàm sau để tương tác:

1. **`getGroupInviteLink`**: Lấy URL mời hoàn chỉnh.
2. **`regenerateGroupInviteLink`**: Reset mã Token và lấy URL mới.
3. **`getGroupInviteInfo`**: Lấy thông tin nhóm (Tên, Ảnh...) từ mã Token.
   - _Input:_ `{ "token": "..." }`
4. **`joinGroupByLink`**: Thực hiện gia nhập từ mã Token.
   - _Input:_ `{ "token": "..." }`
