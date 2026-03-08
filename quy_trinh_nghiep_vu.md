**QUY TRÌNH NGHIỆP VỤ**

---

Ứng dụng mạng xã hội phục vụ hai nhóm tác nhân chính:

- **Người dùng thông thường:** Thực hiện các hoạt động mạng xã hội bao gồm xác thực, đăng bài viết, kết bạn, nhắn tin, gọi điện/video, tương tác với nội dung và gửi báo cáo vi phạm.
- **Quản trị viên (Admin):** Quản lý tài khoản người dùng và xử lý báo cáo vi phạm nội dung.

![][image1]

_Usecase tổng quát của hệ thống_

---

1. # **Quy trình Đăng ký và Đăng nhập**
   1. ## **_Đăng ký tài khoản mới_**

Người dùng điền đầy đủ thông tin gồm họ tên, địa chỉ email, mật khẩu và xác nhận mật khẩu. Hệ thống kiểm tra tính hợp lệ của dữ liệu đầu vào (định dạng email, độ mạnh mật khẩu, mật khẩu xác nhận khớp nhau) trước khi tạo tài khoản.

Sau khi đăng ký thành công, hệ thống gửi một email xác thực đến địa chỉ email mà người dùng đã đăng ký. Người dùng bắt buộc phải xác minh email thông qua đường link trong thư trước khi được sử dụng đầy đủ chức năng của ứng dụng. Trong thời gian chờ, ứng dụng hiển thị trang hướng dẫn và cho phép gửi lại email xác thực nếu cần.

2. ## **_Đăng nhập_**

Người dùng nhập địa chỉ email và mật khẩu để đăng nhập. Ứng dụng cung cấp tùy chọn **“Ghi nhớ đăng nhập”** để lưu lại địa chỉ email cho các lần truy cập sau. Nếu tài khoản chưa xác thực email, hệ thống thông báo và hiển thị nút gửi lại email xác thực.

Trong trường hợp tài khoản bị khóa bởi quản trị viên, hệ thống chuyển hướng người dùng đến trang thông báo khóa tài khoản và ngăn truy cập vào mọi chức năng khác.

3. ## **_Quên mật khẩu_**

Người dùng chọn chức năng “Quên mật khẩu”, nhập địa chỉ email đã đăng ký. Hệ thống gửi email chứa đường link để người dùng thiết lập lại mật khẩu mới.

---

2. # **Quy trình Quản lý Hồ sơ Cá nhân**
   1. ## **_Xem và chỉnh sửa thông tin cá nhân_**

Người dùng có thể xem trang cá nhân của mình và chỉnh sửa các thông tin bao gồm: họ tên, tiểu sử (bio), địa điểm, giới tính và ngày sinh. Thay đổi được lưu và cập nhật ngay sau khi xác nhận.

2. ## **_Cập nhật ảnh đại diện và ảnh bìa_**

Người dùng tải lên ảnh mới từ thiết bị của mình để thay thế ảnh đại diện hoặc ảnh bìa. Trước khi lưu, người dùng có thể cắt ảnh (crop) theo tỷ lệ chuẩn (vuông cho ảnh đại diện, 16:9 cho ảnh bìa) và tùy chọn có chia sẻ lên bảng tin hay không. Sau mỗi lần cập nhật, một bài viết thông báo thay đổi ảnh tự động xuất hiện trên trang cá nhân (nếu được chọn chia sẻ), cho phép bạn bè có thể xem và tương tác.

Người dùng cũng có thể xóa ảnh đại diện hoặc ảnh bìa hiện tại để trở về trạng thái mặc định.  
![][image2]

---

![][image3]

3. # **Quy trình Quản lý Kết bạn**

Mối quan hệ giữa hai người dùng trải qua bốn trạng thái:

| Trạng thái             | Mô tả                                      |
| :--------------------- | :----------------------------------------- |
| Chưa kết bạn           | Hai người chưa có mối quan hệ              |
| Chờ phản hồi (đã gửi)  | Người dùng đã gửi lời mời, chờ đối phương  |
| Chờ phản hồi (đã nhận) | Người dùng nhận được lời mời từ người khác |
| Bạn bè                 | Hai người đã kết bạn thành công            |

1. ## **_Gửi lời mời kết bạn_**

Người dùng tìm kiếm hoặc truy cập trang cá nhân của người khác rồi chọn “Kết bạn”. Hệ thống gửi thông báo đến người nhận để xem xét lời mời.

2. ## **_Phản hồi lời mời kết bạn_**

Người nhận xem danh sách lời mời trong mục Danh bạ và thực hiện một trong hai thao tác: \- **Chấp nhận:** Hai người trở thành bạn bè. Người gửi lời mời nhận được thông báo chấp nhận. \- **Từ chối:** Lời mời bị hủy, người gửi không nhận được thông báo từ chối.

3. ## **_Hủy lời mời / Hủy kết bạn_**

- Người gửi có thể rút lại lời mời bất cứ lúc nào trước khi được phản hồi.
- Khi đã kết bạn, một trong hai bên có thể hủy kết bạn. Mối quan hệ bị gỡ bỏ đối với cả hai.

![][image4]

---

4. # **Quy trình Quản lý Bài viết**
   1. ## **_Đăng bài viết mới_**

Người dùng soạn nội dung bài viết, có thể kèm theo hình ảnh hoặc video (hỗ trợ đính kèm nhiều tệp cùng lúc). Trước khi đăng, người dùng chọn mức độ hiển thị của bài:

![][image5]

| Mức độ hiển thị | Đối tượng xem được                     |
| :-------------- | :------------------------------------- |
| Công khai       | Tất cả mọi người                       |
| Bạn bè          | Chỉ những người trong danh sách bạn bè |
| Chỉ mình tôi    | Chỉ bản thân người đăng                |

2. ## **_Xem Bảng tin (News Feed)_**

Sau khi đăng nhập, người dùng thấy các bài viết của bản thân và bạn bè được sắp xếp theo thứ tự thời gian mới nhất. Bảng tin cập nhật tự động khi có bài viết mới từ bạn bè xuất hiện mà không cần tải lại trang. Người dùng cuộn xuống để tải thêm bài viết cũ (vô hạn cuộn).

Bài viết của tài khoản bị khóa hoặc của người đã bị chặn sẽ không hiển thị trong bảng tin.

![][image6]

1. ## **_Chỉnh sửa bài viết_**

Người dùng chọn “Chỉnh sửa” trên bài viết của mình để thay đổi nội dung văn bản, hình ảnh, video hoặc mức độ hiển thị. Bài viết sau khi chỉnh sửa được đánh dấu là “đã chỉnh sửa”.

![][image7]

3. ## **_Xóa bài viết_**

Người dùng chọn “Xóa” trên bài viết của mình. Bài viết cùng toàn bộ bình luận liên quan bị ẩn khỏi hệ thống.

![][image8]

4. ## **_Bày tỏ cảm xúc với bài viết_**

Người dùng chọn một biểu tượng cảm xúc (Thích, Yêu thích, Haha, Wow, Buồn, Tức giận) để phản hồi bài viết. Chủ bài viết nhận được thông báo khi có người bày tỏ cảm xúc. Mỗi người dùng chỉ được giữ một cảm xúc tại một thời điểm; chọn lại cảm xúc đó sẽ gỡ bỏ phản ứng.

![][image9]

---

5. # **Quy trình Bình luận**

Hệ thống hỗ trợ bình luận hai cấp: **bình luận gốc** và **phản hồi** (reply vào bình luận gốc). Mỗi bình luận có thể kèm theo duy nhất một hình ảnh đính kèm (KHÔNG VIDEO).

| Thao tác            | Điều kiện                               | Kết quả                                                                    |
| :------------------ | :-------------------------------------- | :------------------------------------------------------------------------- |
| Viết bình luận      | Người dùng đã đăng nhập                 | Bình luận xuất hiện trên bài viết; chủ bài viết nhận thông báo             |
| Phản hồi bình luận  | Bình luận gốc phải tồn tại              | Phản hồi hiển thị bên dưới bình luận gốc; tác giả bình luận nhận thông báo |
| Thích bình luận     | —                                       | Tác giả bình luận nhận thông báo                                           |
| Chỉnh sửa bình luận | Chỉ tác giả của bình luận đó            | Nội dung bình luận được cập nhật                                           |
| Xóa bình luận       | Chỉ tác giả của bình luận đó            | Bình luận và toàn bộ phản hồi con bị xóa; số lượng bình luận cập nhật      |
| Báo cáo bình luận   | Chưa báo cáo bình luận này trước đó     | Báo cáo gửi đến Quản trị viên; trạng thái "Chờ xử lý"                      |
| Xem ảnh nhạy cảm    | Ảnh bị hệ thống đánh dấu khi kiểm duyệt | Người dùng nhấn "Xem ảnh" → hiện ảnh gốc; tự động làm mờ khi mở lại        |

Bình luận từ tài khoản bị khóa hoặc bị chặn không hiển thị với người xem.

1. ## **_Viết bình luận_**

| Trường               | Nội dung                                                                                                                                                                                     |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mã use case          | UC-BL01                                                                                                                                                                                      |
| Tên use case         | Viết bình luận                                                                                                                                                                               |
| Tác nhân             | Người dùng đã đăng nhập                                                                                                                                                                      |
| Mô tả                | Người dùng đăng bình luận lên một bài viết                                                                                                                                                   |
| Điều kiện tiên quyết | Người dùng đã đăng nhập; bài viết tồn tại và hiển thị với người dùng                                                                                                                         |
| Điều kiện sau        | Bình luận xuất hiện trên bài viết; số lượng bình luận tăng thêm 1; chủ bài viết nhận thông báo. Nếu bình luận kèm ảnh, hệ thống tự động kiểm duyệt và làm mờ nếu phát hiện nội dung nhạy cảm |

**Luồng sự kiện chính:**

1. Người dùng gửi bình luận.
2. Hệ thống kiểm tra nội dung không rỗng.
3. Hệ thống lưu bình luận, cập nhật số đếm trên bài viết.
4. Bình luận xuất hiện ngay; hệ thống gửi thông báo đến chủ bài viết.
5. \[Nếu có ảnh đính kèm\] Hệ thống tự động quét nội dung ảnh.

   → Phát hiện nhạy cảm: ảnh bị làm mờ, hiển thị nút "Xem ảnh".

   → Không phát hiện: ảnh hiển thị bình thường.

**Luồng thay thế:**

- **\[A1\]** Bước 4 — Nội dung rỗng và không có ảnh: nút Gửi bị vô hiệu hóa, người dùng không thể gửi.
- **\[A2\]** Bước 7 — Người dùng nhấn "Xem ảnh": ảnh hiện ngay lập tức; tự động blur trở lại khi mở lại bình luận.

![][image10]

_Sơ đồ hoạt động \- Viết bình luận_

![][image11]

_Sơ đồ tuần tự \- Viết bình luận_

2. ## **_Phản hồi bình luận_**

| Trường               | Nội dung                                                                                                                                                                    |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mã use case          | UC-BL02                                                                                                                                                                     |
| Tên use case         | Phản hồi bình luận (Reply)                                                                                                                                                  |
| Tác nhân             | Người dùng đã đăng nhập                                                                                                                                                     |
| Mô tả                | Người dùng phản hồi trực tiếp vào một bình luận gốc                                                                                                                         |
| Điều kiện tiên quyết | Bình luận gốc tồn tại                                                                                                                                                       |
| Điều kiện sau        | Phản hồi hiển thị bên dưới bình luận gốc; tác giả bình luận gốc nhận thông báo. Nếu phản hồi kèm ảnh, hệ thống tự động kiểm duyệt và làm mờ nếu phát hiện nội dung nhạy cảm |

**Luồng sự kiện chính:**

1. Người dùng nhấn Phản hồi dưới bình luận gốc.
2. Ô nhập liệu mở ra với tiền tố gợi nhớ tên người được phản hồi.
3. Người dùng nhập nội dung và nhấn **Gửi**.
4. Hệ thống lưu phản hồi, cập nhật số đếm reply trên bình luận gốc.
5. Phản hồi hiển thị; tác giả bình luận gốc nhận thông báo.
6. \[Nếu có ảnh đính kèm\] Hệ thống tự động quét nội dung ảnh.

   → Phát hiện nhạy cảm: ảnh bị làm mờ, hiển thị nút "Xem ảnh".

   → Không phát hiện: ảnh hiển thị bình thường.

**![][image12]**

_Sơ đồ hoạt động \- Phản hồi bình luận_

**![][image13]**

_Sơ đồ tuần tự \- Phản hồi bình luận_

3. ## **_Chỉnh sửa / Xóa bình luận_**

| Trường               | Nội dung                                                                                                                         |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| Mã use case          | UC-BL03                                                                                                                          |
| Tên use case         | Chỉnh sửa hoặc Xóa bình luận                                                                                                     |
| Tác nhân             | Tác giả bình luận                                                                                                                |
| Mô tả                | Người dùng chỉnh sửa toàn bộ nội dung (text và/hoặc ảnh) hoặc xóa bình luận của mình                                             |
| Điều kiện tiên quyết | Người dùng là tác giả của bình luận                                                                                              |
| Điều kiện sau        | Bình luận được cập nhật hoặc bị xóa cùng toàn bộ phản hồi con. Nếu chỉnh sửa có thay ảnh mới, hệ thống tự động kiểm duyệt ảnh đó |

**Luồng chính – Chỉnh sửa:**

1. Người dùng chọn **Chỉnh sửa** trên bình luận của mình.
2. Ô nhập liệu mở lại với nội dung cũ.
3. Người dùng sửa nội dung và nhấn **Lưu**.
4. Hệ thống cập nhật bình luận.
5. \[Nếu ảnh bị thay đổi\] Hệ thống tự động quét nội dung ảnh mới.

   → Phát hiện nhạy cảm: ảnh bị làm mờ, hiển thị nút "Xem ảnh".

   → Không phát hiện: ảnh hiển thị bình thường.

**Luồng chính – Xóa:**

1. Người dùng chọn **Xóa** trên bình luận của mình.
2. Hệ thống hiển thị hộp xác nhận.
3. Người dùng xác nhận.
4. Hệ thống xóa bình luận, toàn bộ phản hồi con và cập nhật số đếm.

**Luồng ngoại lệ:**

- **\[E1\]** Không phải tác giả: tùy chọn Chỉnh sửa/Xóa không hiển thị.

**![][image14]**

_Sơ đồ hoạt động \- Chỉnh sửa / Xóa bình luận_

_![][image15]_

_Sơ đồ tuần tự \- Chỉnh sửa / Xóa bình luận_

4. ## **_Báo cáo bình luận_**

| Trường               | Nội dung                                                              |
| :------------------- | :-------------------------------------------------------------------- |
| Mã use case          | UC-BL04                                                               |
| Tên use case         | Báo cáo bình luận vi phạm                                             |
| Tác nhân             | Người dùng đã đăng nhập (không phải tác giả)                          |
| Mô tả                | Người dùng gửi báo cáo vi phạm về một bình luận đến quản trị viên     |
| Điều kiện tiên quyết | Người dùng chưa báo cáo bình luận này trước đó                        |
| Điều kiện sau        | Báo cáo được tạo trạng thái "Chờ xử lý"; quản trị viên nhận thông báo |

**Luồng sự kiện chính:**

1. Người dùng chọn **Báo cáo** trên bình luận.
2. Hệ thống kiểm tra: người dùng chưa báo cáo bình luận này.
3. Người dùng chọn lý do vi phạm, tùy chọn nhập mô tả thêm.
4. Người dùng nhấn **Gửi báo cáo**.
5. Hệ thống lưu báo cáo và thông báo quản trị viên.

**Luồng thay thế:**

- **\[A1\]** Bước 2 — Đã báo cáo trước đó: hệ thống thông báo không thể báo cáo lần nữa.

![][image16]

_Sơ đồ hoạt động \- Báo cáo bình luận_

![][image17]

_Sơ đồ tuần tự \- Báo cáo bình luận_

---

6. # **Quy trình Nhắn tin**

Hệ thống hỗ trợ hai hình thức nhắn tin: **Chat 1-1** và **Chat nhóm**. Đi kèm là tính năng trạng thái soạn tin nhắn “_Đang nhập…_”. Mỗi tin nhắn trải qua ba mức trạng thái: **Đã gửi → Đã nhận → Đã xem**. Ngoài ra, hệ thống hiển thị trạng thái hoạt động của người dùng (Online/Offline) thông qua dấu chấm xanh trên ảnh đại diện và cập nhật thời gian truy cập gần nhất (last seen).

Người dùng có thể nhắn tin với bất kỳ người dùng nào trong hệ thống. Nếu hai người **chưa là** bạn bè, cuộc trò chuyện sẽ xuất hiện trong mục **"Tin nhắn từ người lạ"** thay vì danh sách hội thoại chính, kèm theo banner thông báo trạng thái kết bạn. Khi cả hai đã là bạn bè, cuộc trò chuyện tự động chuyển về danh sách chính. Trường hợp duy nhất không thể nhắn tin là khi một trong hai người **đã chặn** người kia.

Nhóm chat có tối thiểu 2 và tối đa 100 thành viên với ba vai trò phân quyền:

| Quyền hạn                         | Thành viên | Quản trị viên | Chủ nhóm |
| --------------------------------- | :--------: | :-----------: | :------: |
| Xem và gửi tin nhắn               |     X      |       X       |    X     |
| Đổi tên nhóm / ảnh đại diện nhóm  |     X      |       X       |    X     |
| Rời nhóm                          |     X      |       X       |    X     |
| Thêm thành viên mới               |            |       X       |    X     |
| Xóa thành viên khỏi nhóm          |            |       X       |    X     |
| Gán / Thu hồi quyền Quản trị viên |            |       X       |    X     |
| Giải tán nhóm                     |            |               |    X     |

_Bảng phân quyền trong nhóm chat_

Mọi thay đổi trong nhóm đều tạo tin nhắn hệ thống tự động.

| Loại           | Mô tả                                                                 |
| :------------- | :-------------------------------------------------------------------- |
| Văn bản        | Nội dung chữ Hỗ trợ đề cập (@mention) thành viên (dành cho chat nhóm) |
| Hình ảnh       | Gửi ảnh từ thiết bị                                                   |
| Video          | Gửi tệp video                                                         |
| Tệp đính kèm   | Gửi tài liệu và các định dạng tệp khác                                |
| Tin nhắn thoại | Ghi âm tối đa 5 phút. Hỗ trợ nghe thử (preview) trước khi gửi hoặc hủy. |
| Emoji          | Các biểu tượng cảm xúc                                                |

_Bảng các loại tin nhắn_

Mỗi lần gửi hỗ trợ đính kèm tối đa **10 tệp** cùng lúc. Đi kèm là các giới hạn kích thước file ở mục [Các cấu hình chung cho hệ thống](#bookmark=kix.3jol6qjpefpv).

1. ## **_Quản lý tin nhắn_**
   1. ### **_Gửi tin nhắn_**

| Trường               | Nội dung                                                         |
| :------------------- | :--------------------------------------------------------------- |
| Mã use case          | UC-NT01                                                          |
| Tên use case         | Gửi tin nhắn                                                     |
| Tác nhân             | Người dùng đã đăng nhập                                          |
| Mô tả                | Người dùng gửi tin nhắn trong cuộc trò chuyện 1-1 hoặc nhóm      |
| Điều kiện tiên quyết | Cuộc trò chuyện đã tồn tại; hai bên không chặn nhau              |
| Điều kiện sau        | Tin nhắn hiển thị trạng thái "Đã gửi"; người nhận nhận thông báo |

**Luồng sự kiện chính:**

1. Người dùng mở cuộc trò chuyện.
2. Người dùng nhập nội dung và/hoặc đính kèm tệp (tối đa 10 tệp).
3. Người dùng nhấn **Gửi**.
4. Hệ thống kiểm tra giới hạn kích thước tệp.
5. Hệ thống lưu tin nhắn, cập nhật metadata cuộc trò chuyện.
6. Tin nhắn hiển thị trạng thái **Đã gửi**. Khi người nhận kết nối → **Đã nhận**. Khi người nhận mở trò chuyện → **Đã xem**.

**Luồng thay thế:**

- **\[A1\]** Bước 4 — Tệp vượt giới hạn: hệ thống thông báo lỗi, không gửi.

![][image18]

_Sơ đồ hoạt động \- Gửi tin nhắn_

![][image19]

_Sơ đồ tuần tự \- Gửi tin nhắn_

2. ### **_Thu hồi tin nhắn_**

| Trường               | Nội dung                                                                               |
| :------------------- | :------------------------------------------------------------------------------------- |
| Mã use case          | UC-NT02                                                                                |
| Tên use case         | Thu hồi tin nhắn                                                                       |
| Tác nhân             | Người gửi tin nhắn                                                                     |
| Mô tả                | Người gửi thu hồi tin nhắn đã gửi                                                      |
| Điều kiện tiên quyết | Người dùng là tác giả tin nhắn đó                                                      |
| Điều kiện sau        | Nội dung thay bằng "_Tin nhắn đã thu hồi_" với tất cả thành viên trong cuộc trò chuyện |

**Luồng sự kiện chính:**

1. Người dùng nhấn giữ tin nhắn (trên mobile) hoặc mở menu tùy chọn tin nhắn (trên web) → chọn **Thu hồi**.
2. Hệ thống xác nhận người dùng là tác giả.
3. Hệ thống cập nhật nội dung thành "_Tin nhắn đã thu hồi_" cho tất cả thành viên.

**Luồng ngoại lệ:**

- **\[E1\]** Không phải tác giả: tùy chọn Thu hồi không hiển thị.

**![][image20]**

**![][image21]**

3. ### **_Chỉnh sửa tin nhắn_**

| Trường               | Nội dung                                                            |
| :------------------- | :------------------------------------------------------------------ |
| Mã use case          | UC-NT03                                                             |
| Tên use case         | Chỉnh sửa tin nhắn                                                  |
| Tác nhân             | Người gửi tin nhắn                                                  |
| Mô tả                | Người gửi chỉnh sửa nội dung tin nhắn văn bản trong vòng 5 phút     |
| Điều kiện tiên quyết | Là tác giả; tin nhắn là loại văn bản; chưa quá 5 phút kể từ khi gửi |
| Điều kiện sau        | Tin nhắn hiển thị nội dung mới, được đánh dấu "_Đã chỉnh sửa_"      |

**Luồng sự kiện chính:**

1. Người dùng chọn **Chỉnh sửa** trên tin nhắn.
2. Hệ thống kiểm tra còn trong thời hạn 5 phút.
3. Ô nhập liệu mở với nội dung cũ.
4. Người dùng sửa nội dung và xác nhận.
5. Hệ thống cập nhật, đánh dấu "_Đã chỉnh sửa_".

**Luồng thay thế:**

- **\[A1\]** Bước 2 — Quá 5 phút: tùy chọn **Chỉnh sửa** bị ẩn.

**![][image22]**

**![][image23]**

4. ### **_Trả lời tin nhắn_**

| Trường               | Nội dung                                                                   |
| :------------------- | :------------------------------------------------------------------------- |
| Mã use case          | UC-NT04                                                                    |
| Tên use case         | Trả lời tin nhắn (Reply)                                                   |
| Tác nhân             | Người dùng đã đăng nhập                                                    |
| Mô tả                | Người dùng phản hồi liên kết với một tin nhắn cụ thể trong cuộc trò chuyện |
| Điều kiện tiên quyết | Tin nhắn gốc tồn tại trong cuộc trò chuyện                                 |
| Điều kiện sau        | Tin nhắn phản hồi hiển thị kèm trích dẫn tin nhắn gốc                      |

**Luồng sự kiện chính:**

1. Người dùng chọn **Trả lời** trên tin nhắn gốc.
2. Giao diện hiển thị khối trích dẫn tin nhắn gốc trong ô nhập liệu.
3. Người dùng nhập nội dung và nhấn **Gửi**.
4. Hệ thống lưu tin nhắn mới có liên kết đến tin nhắn gốc.
5. Tin nhắn hiển thị kèm trích dẫn bên trên nội dung.

**![][image24]**

**![][image25]**

5. ### **_Chuyển tiếp tin nhắn_**

| Trường               | Nội dung                                                     |
| :------------------- | :----------------------------------------------------------- |
| Mã use case          | UC-NT05                                                      |
| Tên use case         | Chuyển tiếp tin nhắn (Forward)                               |
| Tác nhân             | Người dùng đã đăng nhập                                      |
| Mô tả                | Người dùng chuyển một tin nhắn sang cuộc trò chuyện khác     |
| Điều kiện tiên quyết | Người dùng có ít nhất một cuộc trò chuyện khác để chuyển đến |
| Điều kiện sau        | Tin nhắn xuất hiện tại cuộc trò chuyện đích                  |

**Luồng sự kiện chính:**

1. Người dùng chọn **Chuyển tiếp** trên tin nhắn.
2. Hệ thống hiển thị danh sách cuộc trò chuyện để chọn.
3. Người dùng chọn cuộc trò chuyện đích và xác nhận.
4. Hệ thống tạo bản sao tin nhắn tại cuộc trò chuyện đích
5. Hệ thống đánh dấu “Đã chuyển tiếp”

**![][image26]**

**![][image27]**

6. ### **_Cảm xúc tin nhắn_**

| Trường               | Nội dung                                                       |
| :------------------- | :------------------------------------------------------------- |
| Mã use case          | UC-NT06                                                        |
| Tên use case         | Cảm xúc tin nhắn                                               |
| Tác nhân             | Người dùng đã đăng nhập                                        |
| Mô tả                | Người dùng phản hồi bằng Emoji trên một tin nhắn cụ thể        |
| Điều kiện tiên quyết | Tin nhắn tồn tại và chưa bị thu hồi                            |
| Điều kiện sau        | Emoji react hiển thị trên tin nhắn; có thể thay đổi hoặc gỡ bỏ |

**Luồng sự kiện chính:**

1. Người dùng giữ/nhấn vào tin nhắn → chọn Emoji từ bảng react.
2. Hệ thống kiểm tra trạng thái react hiện tại của người dùng trên tin nhắn đó.

**Luồng thay thế:**

- **\[A1\]** Chưa react → Thêm Emoji react vào tin nhắn.
- **\[A2\]** Đã react cùng loại → Gỡ bỏ react.
- **\[A3\]** Đã react khác loại → Cập nhật sang Emoji mới.

**![][image28]**

**![][image29]**

7. ### **_Xóa tin nhắn phía mình_**

| Trường               | Nội dung                                                                                  |
| :------------------- | :---------------------------------------------------------------------------------------- |
| Mã use case          | UC-NT07                                                                                   |
| Tên use case         | Xóa tin nhắn phía mình                                                                    |
| Tác nhân             | Người dùng đã đăng nhập                                                                   |
| Mô tả                | Người dùng ẩn tin nhắn khỏi giao diện của riêng mình, không ảnh hưởng đến phía người khác |
| Điều kiện tiên quyết | Tin nhắn tồn tại trong cuộc trò chuyện                                                    |
| Điều kiện sau        | Tin nhắn ẩn khỏi giao diện người dùng; các thành viên khác vẫn thấy bình thường           |

**Luồng sự kiện chính:**

1. Người dùng chọn **Xóa phía mình** trên tin nhắn.
2. Hệ thống thêm ID người dùng vào trường _deletedBy_ của tin nhắn.
3. Tin nhắn ẩn khỏi giao diện người dùng; không ảnh hưởng đến bất kỳ thành viên nào khác.

![][image30]

![][image31]

2. ## **_Quản lý nhóm chat_**
   1. ### **_Tạo nhóm chat_**

| Trường               | Nội dung                                                                |
| :------------------- | :---------------------------------------------------------------------- |
| Mã use case          | UC-NT08                                                                 |
| Tên use case         | Tạo nhóm chat                                                           |
| Tác nhân             | Người dùng đã đăng nhập                                                 |
| Mô tả                | Người dùng tạo một cuộc trò chuyện nhóm mới                             |
| Điều kiện tiên quyết | Chọn tối thiểu 2 và tối đa 100 thành viên                               |
| Điều kiện sau        | Nhóm được tạo; tin nhắn hệ thống xuất hiện; tất cả thành viên thấy nhóm |

**Luồng sự kiện chính:**

1. Người dùng chọn **Tạo nhóm**.
2. Người dùng chọn thành viên (tối thiểu 2, tối đa 100).
3. Người dùng tùy chọn đặt tên và ảnh đại diện nhóm.
4. Người dùng nhấn **Xác nhận tạo nhóm**.
5. Hệ thống tạo nhóm, gửi tin nhắn hệ thống thông báo.

**Luồng thay thế:**

- **\[A1\]** Bước 2 — Chọn ít hơn 2 thành viên: nút xác nhận bị vô hiệu hóa.
- **\[A2\]** Bước 2 — Đạt 100 thành viên: giao diện chặn người dùng không cho chọn thêm, hiển thị thông báo giới hạn.

**![][image32]**

**![][image33]**

2. ### **_Thêm / Xóa thành viên_**

| Trường               | Nội dung                                                   |
| :------------------- | :--------------------------------------------------------- |
| Mã use case          | UC-NT09                                                    |
| Tên use case         | Thêm / Xóa thành viên nhóm                                 |
| Tác nhân             | Quản trị viên hoặc Chủ nhóm                                |
| Mô tả                | Người dùng thêm/xóa thành viên trong nhóm                  |
| Điều kiện tiên quyết | Người dùng có vai trò Quản trị viên hoặc Chủ nhóm          |
| Điều kiện sau        | Danh sách thành viên cập nhật; tin nhắn hệ thống thông báo |

**Luồng sự kiện chính – Thêm:**

1. Quản trị viên chọn **Thêm thành viên**.
2. Hệ thống kiểm tra nhóm chưa đạt 100 thành viên.
3. Quản trị viên chọn người dùng muốn thêm và xác nhận.
4. Hệ thống thêm thành viên, gửi tin nhắn hệ thống thông báo.

**Luồng sự kiện chính – Xóa:**

1. Quản trị viên chọn thành viên cần xóa → chọn **Xóa khỏi nhóm**.
2. Hệ thống xóa thành viên, gửi tin nhắn hệ thống thông báo.

**Luồng thay thế:**

- **\[A1\]** Thêm — Nhóm đã đạt 100: hệ thống từ chối, hiển thị thông báo giới hạn.

**Luồng ngoại lệ:**

- **\[E1\]** Không phải Quản trị viên/Chủ nhóm: tùy chọn không hiển thị.

_![][image34]_

_![][image35]_

3. ### **_Gán / Thu hồi quyền Quản trị viên_**

| Trường               | Nội dung                                                      |
| :------------------- | :------------------------------------------------------------ |
| Mã use case          | UC-NT10                                                       |
| Tên use case         | Gán / Thu hồi quyền Quản trị viên                             |
| Tác nhân             | Quản trị viên hoặc Chủ nhóm                                   |
| Mô tả                | Người dùng gán hoặc thu hồi quyền Quản trị viên               |
| Điều kiện tiên quyết | Người dùng có vai trò Quản trị viên hoặc Chủ nhóm             |
| Điều kiện sau        | Vai trò thành viên được cập nhật; tin nhắn hệ thống thông báo |

**Luồng sự kiện chính:**

1. Quản trị viên chọn thành viên muốn thay đổi vai trò.
2. Chọn thao tác: **Gán quyền Admin** hoặc **Thu hồi quyền Admin**.
3. Hệ thống cập nhật vai trò, gửi tin nhắn hệ thống thông báo.

**Luồng ngoại lệ:**

- **\[E1\]** Không phải Quản trị viên/Chủ nhóm: tùy chọn không hiển thị.

_![][image36]_

_![][image37]_

4. ### **_Rời nhóm_**

| Trường               | Nội dung                                              |
| :------------------- | :---------------------------------------------------- |
| Mã use case          | UC-NT11                                               |
| Tên use case         | Rời nhóm                                              |
| Tác nhân             | Thành viên nhóm                                       |
| Mô tả                | Người dùng rời khỏi nhóm chat                         |
| Điều kiện tiên quyết | Người dùng đang là thành viên của nhóm                |
| Điều kiện sau        | Người dùng rời khỏi nhóm; tin nhắn hệ thống thông báo |

**Luồng sự kiện chính:**

1. Người dùng chọn **Rời nhóm**.
2. Hệ thống kiểm tra số lượng thành viên hiện tại của nhóm.
3. **Nhóm chỉ còn 1 người:** hệ thống tự động thực hiện **Giải tán nhóm** (tương tự UC-NT12) và xóa toàn bộ dữ liệu hội thoại.
4. **Nhóm còn nhiều hơn 1 người:** hệ thống kiểm tra người dùng có phải Chủ nhóm không.
   - **Không phải Chủ nhóm:** người dùng rời ngay, hệ thống gửi tin nhắn thông báo.
   - **Là Chủ nhóm:** hệ thống bắt buộc người dùng chỉ định Chủ nhóm mới trước khi rời. Không cho phép rời nếu chưa có Chủ nhóm mới.
5. Chủ nhóm mới được xác nhận; người dùng rời khỏi nhóm; hệ thống thông báo Chủ nhóm mới.

_![][image38]_

_![][image39]_

5. ### **_Giải tán nhóm_**

| Trường               | Nội dung                                                  |
| :------------------- | :-------------------------------------------------------- |
| Mã use case          | UC-NT12                                                   |
| Tên use case         | Giải tán nhóm                                             |
| Tác nhân             | Chủ nhóm                                                  |
| Mô tả                | Người dùng giải tán nhóm chat                             |
| Điều kiện tiên quyết | Người dùng là Chủ nhóm                                    |
| Điều kiện sau        | Nhóm và toàn bộ dữ liệu bị xóa; tất cả thành viên bị loại |

**Luồng sự kiện chính:**

1. Chủ nhóm chọn **Giải tán nhóm**.
2. Hệ thống hiển thị hộp xác nhận.
3. Chủ nhóm xác nhận.
4. Hệ thống xóa toàn bộ nhóm và dữ liệu liên quan.

**Luồng thay thế:**

- **\[A1\]** Bước 3 — Chủ nhóm hủy: không thực hiện, đóng hộp xác nhận.

**Luồng ngoại lệ:**

- **\[E1\]** Không phải Chủ nhóm: tùy chọn Giải tán không hiển thị.

_![][image40]_

_![][image41]_

6. ### **_Cập nhật thông tin nhóm_**

| Trường               | Nội dung                                                              |
| :------------------- | :-------------------------------------------------------------------- |
| Mã use case          | UC-NT13                                                               |
| Tên use case         | Cập nhật thông tin nhóm                                               |
| Tác nhân             | Bất kỳ thành viên nào                                                 |
| Mô tả                | Người dùng cập nhật các thông tin (tên nhóm / ảnh nhóm) của nhóm chat |
| Điều kiện tiên quyết | Người dùng đang là thành viên của nhóm                                |
| Điều kiện sau        | Tên nhóm / ảnh được cập nhật cho tất cả thành viên                    |

**Luồng sự kiện chính:**

1. Thành viên chọn **Sửa thông tin nhóm**.
2. Nhập tên mới và/hoặc chọn ảnh mới.
3. Nhấn Lưu.
4. Hệ thống cập nhật và đồng bộ cho tất cả thành viên.

_![][image42]_

_![][image43]_

3. ## **_Quản lý hội thoại_**

Người dùng có thể thực hiện các thao tác tổ chức đối với từng cuộc trò chuyện thông qua menu ngữ cảnh trong danh sách hội thoại hoặc từ bảng thông tin chi tiết cuộc trò chuyện.

1. ### **_Ghim / Bỏ ghim hội thoại_**

| Trường               | Nội dung                                                                           |
| :------------------- | :--------------------------------------------------------------------------------- |
| Mã use case          | UC-NT14                                                                            |
| Tên use case         | Ghim / Bỏ ghim hội thoại                                                           |
| Tác nhân             | Người dùng đã đăng nhập                                                            |
| Mô tả                | Người dùng lựa chọn ghim / bỏ ghim cuộc hội thoại trong danh sách đoạn chat của họ |
| Điều kiện tiên quyết | —                                                                                  |
| Điều kiện sau        | Hội thoại được ghim lên đầu hoặc trở về vị trí theo thời gian                      |

**Luồng sự kiện chính:**

1. Người dùng mở menu ngữ cảnh của hội thoại.
2. Người dùng chọn **Ghim** hoặc **Bỏ ghim**.
3. Hệ thống kiểm tra trạng thái ghim hiện tại.

**Luồng thay thế:**

- **\[A1\]** Bước 3 — Chưa ghim: hệ thống đánh dấu hội thoại là đã ghim; hội thoại được đẩy lên đầu danh sách kèm biểu tượng ghim.
- **\[A2\]** Bước 3 — Đã ghim: hệ thống xóa trạng thái ghim; hội thoại trở về vị trí theo thứ tự thời gian, biểu tượng ghim biến mất.

![][image44]

![][image45]

2. ### **_Tắt / Bật thông báo hội thoại_**

| Trường               | Nội dung                                                                                        |
| :------------------- | :---------------------------------------------------------------------------------------------- |
| Mã use case          | UC-NT15                                                                                         |
| Tên use case         | Tắt / Bật thông báo hội thoại                                                                   |
| Tác nhân             | Người dùng đã đăng nhập                                                                         |
| Mô tả                | Người dùng lựa chọn tắt / bật thông báo của một cuộc hội thoại trong danh sách đoạn chat của họ |
| Điều kiện tiên quyết | —                                                                                               |
| Điều kiện sau        | Người dùng không nhận hoặc tiếp tục nhận thông báo từ hội thoại đó                              |

**Luồng sự kiện chính:**

1. Người dùng mở menu ngữ cảnh của hội thoại.
2. Người dùng chọn **Tắt thông báo** hoặc **Bật thông báo**.
3. Hệ thống kiểm tra trạng thái thông báo hiện tại của người dùng trong hội thoại.

**Luồng thay thế:**

- **\[A1\]** Bước 3 — Đang bật: hệ thống ghi nhận trạng thái tắt thông báo; người dùng không còn nhận Push Notification và âm thanh từ hội thoại đó; biểu tượng loa tắt xuất hiện.
- **\[A2\]** Bước 3 — Đang tắt: hệ thống xóa trạng thái tắt thông báo; người dùng nhận lại thông báo bình thường; biểu tượng loa tắt biến mất.

![][image46]

![][image47]

3. ### **_Lưu trữ / Bỏ lưu trữ hội thoại_**

| Trường               | Nội dung                                                                                                                                                      |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mã use case          | UC-NT16                                                                                                                                                       |
| Tên use case         | Lưu trữ / Bỏ lưu trữ hội thoại                                                                                                                                |
| Tác nhân             | Người dùng đã đăng nhập                                                                                                                                       |
| Mô tả                | Người dùng lựa chọn lưu trữ một cuộc hội thoại trong danh sách đoạn chat chính của họ hoặc bỏ lưu trữ một cuộc hội thoại trong danh sách đoạn chat đã lưu trữ |
| Điều kiện tiên quyết | —                                                                                                                                                             |
| Điều kiện sau        | Hội thoại ẩn khỏi danh sách chính hoặc được đưa trở lại                                                                                                       |

**Luồng sự kiện chính:**

1. Người dùng mở menu ngữ cảnh của hội thoại.
2. Người dùng chọn **Lưu trữ** hoặc **Bỏ lưu trữ**.
3. Hệ thống kiểm tra trạng thái lưu trữ hiện tại.

**Luồng thay thế:**

- **\[A1\]** Bước 3 (Chưa lưu trữ): Hệ thống đánh dấu hội thoại là đã lưu trữ; hội thoại ẩn khỏi danh sách chính, chuyển vào mục Lưu trữ.
- **\[A2\]** Bước 3 (Đã lưu trữ): Hệ thống hủy đánh dấu lưu trữ đối với hội thoại; hội thoại xuất hiện trở lại trong danh sách chính.

![][image48]

![][image49]

4. ### **_Đánh dấu chưa đọc / đã đọc_**

| Trường               | Nội dung                                                                                               |
| :------------------- | :----------------------------------------------------------------------------------------------------- |
| Mã use case          | UC-NT17                                                                                                |
| Tên use case         | Đánh dấu chưa đọc / đã đọc                                                                             |
| Tác nhân             | Người dùng đã đăng nhập                                                                                |
| Mô tả                | Người dùng lựa chọn đánh dấu chưa đọc / đã đọc cho một cuộc hội thoại trong danh sách đoạn chat của họ |
| Điều kiện tiên quyết | Hội thoại đang hiển thị trong danh sách                                                                |
| Điều kiện sau        | Badge chưa đọc được bật hoặc tắt theo thao tác người dùng                                              |

**Luồng sự kiện chính:**

1. Người dùng mở menu ngữ cảnh của hội thoại.
2. Người dùng chọn **Đánh dấu chưa đọc** hoặc **Đánh dấu đã đọc**.
3. Hệ thống kiểm tra trạng thái đọc hiện tại của hội thoại.

**Luồng thay thế:**

- **\[A1\]** Bước 3 — Đang ở trạng thái đã đọc: hệ thống đánh dấu hội thoại là chưa đọc; badge chưa đọc xuất hiện trở lại.
- **\[A2\]** Bước 3 — Đang ở trạng thái chưa đọc: hệ thống xóa trạng thái chưa đọc; badge biến mất.

![][image50]

![][image51]

5. ### **_Xóa hội thoại_**

| Trường               | Nội dung                                                                            |
| :------------------- | :---------------------------------------------------------------------------------- |
| Mã use case          | UC-NT18                                                                             |
| Tên use case         | Xóa hội thoại                                                                       |
| Tác nhân             | Người dùng đã đăng nhập                                                             |
| Mô tả                | Người dùng lựa chọn xóa một cuộc hội thoại trong danh sách đoạn chat của họ         |
| Điều kiện tiên quyết | Hội thoại đang hiển thị trong danh sách (chưa bị xóa trước đó)                      |
| Điều kiện sau        | Hội thoại ẩn khỏi danh sách phía người dùng; các thành viên khác không bị ảnh hưởng |

**Luồng sự kiện chính:**

1. Người dùng mở menu ngữ cảnh của hội thoại.
2. Người dùng chọn **Xóa**.
3. Hệ thống hiển thị hộp xác nhận.
4. Người dùng xác nhận.
5. Hệ thống ẩn hội thoại khỏi danh sách của người dùng đó; các thành viên khác không bị ảnh hưởng.
6. Nếu sau đó có tin nhắn mới gửi đến, hội thoại tự động xuất hiện trở lại trong danh sách.

**Luồng thay thế:**

- **\[A1\]** Bước 4 — Người dùng hủy: không thực hiện, đóng hộp xác nhận.

![][image52]

![][image53]

---

7. # **Quy trình Gọi điện Thoại và Video**

Hệ thống hỗ trợ cuộc gọi thoại và video cho cả cuộc trò chuyện 1-1 và cuộc trò chuyện nhóm. Người nhận (hoặc các thành viên nhóm) có thể chấp nhận, từ chối hoặc không trả lời. Sau khi kết thúc, lịch sử cuộc gọi tự động xuất hiện trong cuộc trò chuyện.

1. ### **_Cuộc gọi 1-1_**

**Đặc tả UC-GD01 – Cuộc gọi 1-1**

| Trường               | Nội dung                                                        |
| :------------------- | :-------------------------------------------------------------- |
| Tên use case         | Thực hiện cuộc gọi 1-1                                          |
| Tác nhân chính       | Người gọi                                                       |
| Tác nhân phụ         | Người nhận                                                      |
| Điều kiện tiên quyết | Đang trong cuộc trò chuyện 1-1; hai bên không chặn nhau         |
| Điều kiện sau        | Lịch sử cuộc gọi xuất hiện trong cuộc trò chuyện của cả hai bên |

**Luồng sự kiện chính — Cuộc gọi được chấp nhận:**

1. Người gọi nhấn **Gọi thoại** hoặc **Gọi video**.
2. Hệ thống gửi thông báo cuộc gọi đến Người nhận.
3. Người nhận nhấn **Chấp nhận**.
4. Hệ thống thiết lập kết nối hai bên.
5. Cuộc gọi diễn ra.
6. Một trong hai bên nhấn **Kết thúc**.
7. Hệ thống ghi lịch sử "Cuộc gọi hoàn thành" vào trò chuyện của cả hai.

**Luồng thay thế:**

- **\[A1\]** Bước 3 — Người nhận **Từ chối**: hệ thống thông báo đến người gọi; ghi lịch sử "Cuộc gọi nhỡ" cho cả hai.
- **\[A2\]** Bước 3 — Người nhận **không trả lời**: hệ thống thông báo "Không có phản hồi"; ghi lịch sử "Cuộc gọi nhỡ" cho cả hai.

![][image54]

_Sơ đồ hoạt động \- Cuộc gọi 1-1_

![][image55]

_Sơ đồ tuần tự \- Cuộc gọi 1-1_

2. ### **_Cuộc gọi nhóm_**

**Đặc tả UC-GD02 – Cuộc gọi nhóm**

| Trường               | Nội dung                                              |
| :------------------- | :---------------------------------------------------- |
| Tên use case         | Thực hiện cuộc gọi nhóm                               |
| Tác nhân chính       | Người khởi tạo cuộc gọi                               |
| Tác nhân phụ         | Các thành viên nhóm                                   |
| Điều kiện tiên quyết | Đang trong cuộc trò chuyện nhóm                       |
| Điều kiện sau        | Lịch sử cuộc gọi xuất hiện trong cuộc trò chuyện nhóm |

**Luồng sự kiện chính:**

1. Người dùng nhấn **Gọi thoại** hoặc **Gọi video** trong nhóm chat.
2. Hệ thống gửi thông báo "Cuộc gọi nhóm đến" cho tất cả thành viên.
3. Các thành viên tự do tham gia hoặc bỏ qua.
4. Hệ thống thiết lập phòng gọi nhóm; nhiều người có thể tham gia cùng lúc.
5. Thành viên rời phòng bằng cách nhấn **Kết thúc**.
6. Khi tất cả rời phòng, hệ thống ghi lịch sử cuộc gọi vào cuộc trò chuyện nhóm.

![][image56]

_Sơ đồ hoạt động \- Cuộc gọi nhóm_

![][image57]

_Sơ đồ tuần tự \- Cuộc gọi nhóm_

---

8. # **Quy trình Thông báo**

Hệ thống tự động tạo thông báo in-app khi có sự kiện tương tác. Nếu người dùng đã bật thông báo đẩy, hệ thống gửi thêm Push Notification đến thiết bị.

**Các sự kiện sinh thông báo trong ứng dụng**

| Module    | Sự kiện                              | Người nhận thông báo   |
| :-------- | :----------------------------------- | :--------------------- |
| Bài viết  | Có người bày tỏ cảm xúc với bài viết | Chủ bài viết           |
|           | Có người bình luận bài viết          | Chủ bài viết           |
| Bình luận | Có người phản hồi vào bình luận      | Tác giả bình luận      |
|           | Có người thích bình luận             | Tác giả bình luận      |
| Bạn bè    | Nhận lời mời kết bạn                 | Người nhận lời mời     |
|           | Lời mời kết bạn được chấp nhận       | Người đã gửi lời mời   |
| Báo cáo   | Có báo cáo vi phạm mới               | Quản trị viên hệ thống |
|           | Báo cáo đã được xử lý                | Người đã gửi báo cáo   |
|           | Nội dung bị xóa do vi phạm           | Chủ nội dung vi phạm   |

1. ### **_Nhận và xem thông báo_**

**Đặc tả UC-TB01 – Nhận và xem thông báo**

| Trường               | Nội dung                                                        |
| :------------------- | :-------------------------------------------------------------- |
| Tên use case         | Nhận và xem thông báo                                           |
| Tác nhân             | Người dùng đã đăng nhập                                         |
| Điều kiện tiên quyết | Có sự kiện tương tác liên quan đến người dùng                   |
| Điều kiện sau        | Thông báo xuất hiện trong danh sách; badge hiển thị số chưa đọc |

**Luồng sự kiện chính:**

1. Sự kiện xảy ra (cảm xúc, bình luận, kết bạn, báo cáo...).
2. Hệ thống tạo thông báo in-app cho người dùng liên quan.
3. Nếu người dùng đã bật thông báo đẩy: hệ thống gửi Push Notification.
4. Người dùng mở danh sách thông báo.
5. Hệ thống hiển thị danh sách theo thứ tự mới nhất.
6. Người dùng nhấn vào thông báo → hệ thống chuyển đến nội dung liên quan.

**![][image58]**

_Sơ đồ hoạt động \- Quy trình nhận và xem thông báo_

**![][image59]**

_Sơ đồ tuần tự \- Luồng nhận và xem thông báo_

2. ### **_Quản lý thông báo_**

**Đặc tả UC-TB02 – Quản lý thông báo**

| Trường               | Nội dung                                                 |
| :------------------- | :------------------------------------------------------- |
| Tên use case         | Quản lý thông báo                                        |
| Tác nhân             | Người dùng đã đăng nhập                                  |
| Mô tả                | Người dùng đánh dấu đã đọc hoặc xóa thông báo            |
| Điều kiện tiên quyết | Người dùng có ít nhất một thông báo                      |
| Điều kiện sau        | Trạng thái thông báo được cập nhật hoặc thông báo bị xóa |

**Luồng sự kiện chính:**

1. Người dùng mở danh sách thông báo.
2. Người dùng chọn thao tác:

| Thao tác               | Kết quả                                        |
| :--------------------- | :--------------------------------------------- |
| Nhấn vào 1 thông báo   | Đánh dấu đã đọc; chuyển đến nội dung liên quan |
| Đánh dấu tất cả đã đọc | Toàn bộ chuyển sang đã đọc; badge về 0         |
| Xóa 1 thông báo        | Thông báo bị xóa khỏi danh sách                |
| Xóa tất cả             | Toàn bộ danh sách bị xóa                       |

**Luồng thay thế:**

- **\[A1\]** Danh sách rỗng: hệ thống hiển thị "Không có thông báo mới".

![][image60]

![][image61]

---

9. # **Quy trình Chặn Người dùng**

Người dùng có thể chặn một người dùng khác từ trang cá nhân hoặc từ cài đặt tài khoản. Sau khi bị chặn: \- Hai bên không thể xem bài viết, bình luận của nhau. \- Không thể gửi lời mời kết bạn hoặc nhắn tin với nhau. \- Tên người bị chặn không xuất hiện trong kết quả tìm kiếm.

Người dùng có thể bỏ chặn bất cứ lúc nào để khôi phục lại toàn bộ khả năng tương tác.

| Thành phần     | Nội dung chi tiết                                                                                                                                                                                                                                                                                                                                                        |
| :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên Use Case   | UC_Block_User                                                                                                                                                                                                                                                                                                                                                            |
| Tác nhân       | Người dùng đã đăng nhập                                                                                                                                                                                                                                                                                                                                                  |
| Mô tả tóm tắt  | Cho phép người dùng chặn một người dùng khác từ trang cá nhân hoặc cài đặt tài khoản để vô hiệu hóa mọi tương tác giữa hai bên. Người dùng cũng có thể gỡ bỏ trạng thái này bất cứ lúc nào để khôi phục tương tác.                                                                                                                                                       |
| Tiền điều kiện | Người dùng đã đăng nhập thành công vào ứng dụng. Tài khoản của người bị chặn hoặc được bỏ chặn đang tồn tại trên hệ thống                                                                                                                                                                                                                                                |
| Hậu điều kiện  | Nếu **chặn**: Hệ thống cập nhật trạng thái quan hệ giữa hai tài khoản thành "Không thể nhắn tin cho người này". Cắt đứt mọi liên kết tương tác hiện tại(tự động hủy kết bạn nếu đang là bạn bè). Nếu **bỏ chặn:** Hai bên sẽ nhắn tin với nhau lại như bình thường. Hai bên có thể tìm kiếm và tương tác lại bình thường (nhưng không tự động trở thành bạn bè lại**).** |

**Luồng sự kiện:**

Kịch bản 1: Thực hiện Chặn người dùng

**Bước 1:** Người dùng truy cập vào trang cá nhân của người muốn chặn hoặc trong phần tin nhắn ở mục thông tin hội thoại.

**Bước 2:** Người dùng nhấp vào tùy chọn "Chặn người dùng".

**Bước 3:** Hệ thống hiển thị hộp thoại xác nhận việc chặn, kèm theo cảnh báo "Hai bạn sẽ không thể tìm thấy nhau hoặc gửi tin nhắn mới".

**Bước 4:** Người dùng nhấp "Chặn ngay".

**Bước 5:** Hệ thống ghi nhận yêu cầu, cập nhật cơ sở dữ liệu. Đồng thời, hệ thống tự động hủy trạng thái bạn bè (nếu có) giữa hai người.

**Bước 6:** Hệ thống sẽ ẩn mọi thông tin của người dùng và không thể gửi tin nhắn. Kết thúc use case.

Kịch bản 2: Thực hiện bỏ chặn người dùng

**Bước 1**: Người dùng truy cập vào mục cài đặt, chọn "Người dùng đã chặn".

**Bước 2:** Hệ thống hiển thị danh sách các tài khoản đang bị chặn.

**Bước 3:** Người dùng nhấp vào nút "Bỏ chặn" của một tài khoản bất kỳ.

**Bước 4**: Hệ thống hiển thị hộp thoại yêu cầu xác nhận bỏ chặn.

**Bước 5**: Người dùng nhấp "Bỏ chặn".

**Bước 6:** Hệ thống xóa bản ghi chặn trong cơ sở dữ liệu, khôi phục lại các quyền tương tác cơ bản. Kết thúc use case

**Xử lý ngoại lệ**

**Hủy bỏ thao tác:** Tại bước 3 (Chặn) hoặc bước 4 (Bỏ chặn), nếu người dùng không muốn chặn hay bỏ chặn thì nhấp vào nút "Hủy" hoặc đóng hộp thoại xác nhận.

![][image63]

---

10. # **Quy trình gửi và xử lý báo cáo, quản lý người dùng**

## **_Gửi báo cáo_**

Người dùng có thể báo cáo vi phạm trên ba loại đối tượng: **bài viết**, **bình luận** hoặc **tài khoản người dùng**. Khi gửi báo cáo, người dùng chọn lý do vi phạm phù hợp và điền thêm mô tả tùy chọn. Mỗi người chỉ báo cáo một lần cho cùng một đối tượng.

Các lý do báo cáo được hỗ trợ:

| Lý do             | Diễn giải                                     |
| :---------------- | :-------------------------------------------- |
| Nội dung rác/spam | Tin rác hoặc nội dung lặp lại gây phiền nhiễu |
| Quấy rối, bạo lực | Nội dung đe dọa hoặc khuyến khích bạo lực     |
| Ngôn từ thù ghét  | Phân biệt đối xử hoặc kỳ thị                  |
| Nội dung nhạy cảm | Nội dung khiêu dâm, không phù hợp             |
| Lừa đảo, mạo danh | Giả mạo danh tính hoặc hành vi lừa đảo        |
| Lý do khác        | Trường hợp không thuộc các loại trên          |

Quản trị viên nhận thông báo ngay khi có báo cáo mới.

## **_Xử lý báo cáo (Quản trị viên)_**

Quản trị viên xem danh sách báo cáo, xem xét nội dung bị báo cáo và thực hiện một trong các hành động:

| Hành động           | Mô tả                                  | Thông báo tự động                                                               |
| :------------------ | :------------------------------------- | :------------------------------------------------------------------------------ |
| Xóa nội dung        | Xóa bài viết hoặc bình luận vi phạm    | Gửi cảnh báo vi phạm đến chủ nội dung; gửi thông báo đã xử lý đến người báo cáo |
| Cảnh báo người dùng | Ghi nhận vi phạm mà không xóa nội dung | Gửi cảnh báo đến người dùng vi phạm                                             |
| Khóa tài khoản      | Vô hiệu hóa tài khoản vi phạm          | Tài khoản bị khóa ngay lập tức, không thể đăng nhập                             |
| Từ chối báo cáo     | Xác nhận nội dung không vi phạm        | Thông báo kết quả đến người đã gửi báo cáo                                      |

Vòng đời trạng

| Trạng thái        | Ý nghĩa                                               |
| :---------------- | :---------------------------------------------------- |
| Chờ xử lý         | Mới tạo, chưa được Admin xem xét                      |
| Đã xử lý          | Admin đã xác nhận vi phạm và thực hiện hành động      |
| Đã từ chối        | Admin xác nhận không vi phạm                          |
| Không còn tồn tại | Đối tượng bị báo cáo đã bị xóa trước khi được xem xét |

| Thành phần     | Nội dung chi tiết                                                                                                                                                                                                                                                                                                                                         |
| :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên Use Case   | UC_Report                                                                                                                                                                                                                                                                                                                                                 |
| Tác nhân       | Người dùng đã đăng nhập và quản trị viên(Admin)                                                                                                                                                                                                                                                                                                           |
| Mô tả tóm tắt  | Cho phép người dùng báo cáo các đối tượng vi phạm (bài viết, bình luận, tài khoản) kèm theo lý do cụ thể (spam, quấy rối, ngôn từ thù ghét, nhạy cảm, lừa đảo...). Quản trị viên sẽ tiếp nhận, xem xét và đưa ra quyết định xử lý (xóa nội dung, cảnh báo, khóa tài khoản hoặc từ chối báo cáo) kèm theo thông báo tự động cho các người dùng bị báo cáo. |
| Tiền điều kiện | Người dùng và quản trị viên đã đăng nhập vào hệ thống. Đối tượng bị báo cáo(các bài viết, bình luận,...) vẫn còn tồn tại trên thống. Người dùng chưa từng gửi báo cáo cho chính đối tượng này trước đó.                                                                                                                                                   |
| Hậu điều kiện  | Báo cáo được lưu trữ và cập nhật vòng đời trạng thái: chờ xử lý, đã xử lý, đã từ chối,... Tùy vào quyết định của Admin, đối tượng vi phạm có thể bị xóa, tài khoản bị vô hiệu hóa hoặc bị ghi nhận cảnh báo. Các thông báo tự động được hệ thống gửi đi tương ứng.                                                                                        |

Kịch bản 1: Người dùng Gửi báo cáo

**Bước 1:** Người dùng nhấp vào nút "Báo cáo" (Report) trên một đối tượng cụ thể (Bài viết, Bình luận, hoặc Trang cá nhân của người khác).

**Bước 2:** Hệ thống kiểm tra lịch sử báo cáo để đảm bảo người dùng chưa báo cáo đối tượng này. Sau đó, hiển thị biểu mẫu báo cáo.

**Bước 3:** Người dùng chọn một lý do vi phạm từ danh sách có sẵn (Nội dung rác, Quấy rối/bạo lực, Ngôn từ thù ghét, Nội dung nhạy cảm, Lừa đảo/mạo danh, Lý do khác) và nếu muốn không tương tác đối phương nữa có thể tích vào ô chặn “Chặn người dùng”.

**Bước 4:** Người dùng nhập thêm mô tả chi tiết (không bắt buộc) và nhấn "Gửi báo cáo" .

**Bước 5:** Hệ thống lưu báo cáo với trạng thái "Chờ xử lý", gửi thông báo (Notification) ngay lập tức đến Quản trị viên và hiển thị thông báo "Đã gửi báo cáo thành công" cho người dùng.

![][image64]

Kịch bản 2: Quản trị viên Xử lý báo cáo

**Bước 1:** Quản trị viên truy cập vào hệ thống chọn mục quản lý báo cáo.

**Bước 2:** Hệ thống hiển thị danh sách các báo cáo đang ở trạng thái "Chờ xử lý". Quản trị viên nhấp vào một báo cáo để xem chi tiết (người gửi, lý do, mô tả và nội dung bị báo cáo).

**Bước 3**: Quản trị viên đánh giá nội dung và chọn một trong các hành động xử lý sau:

- Xóa nội dung: Xóa bài/bình luận vi phạm.
- Cảnh báo người dùng: Ghi nhận vi phạm nhưng giữ lại nội dung.
- Khóa tài khoản: Vô hiệu hóa ngay lập tức tài khoản vi phạm (không thể đăng nhập).
- Từ chối báo cáo: Xác nhận nội dung không vi phạm.

**Bước 4**: Quản trị viên nhấn "Xác nhận xử lý".

**Bước 5:** Hệ thống thực thi lệnh (xóa/khóa/cảnh báo) đối với tài khoản/nội dung vi phạm. Cập nhật trạng thái báo cáo thành "Đã xử lý" (hoặc "Đã từ chối" nếu Admin không phạt).

**Bước 6:** Hệ thống tự động gửi thông báo:

- Nếu có vi phạm: Gửi cảnh báo/thông báo khóa đến người vi phạm; Gửi thông báo "Đã xử lý" đến người báo cáo.
- Nếu từ chối: Gửi thông báo "Không có vi phạm" đến người báo cáo. Kết thúc Use Case.

![][image65]

**Xử lý ngoại lệ:**

**Báo cáo trùng lặp:** Tại bước 2 (gửi báo cáo), nếu hệ thống phát hiện người dùng đã từng gửi báo cáo cho đối tượng này. Hệ thống chặn thao tác, hiển thị thông báo _"Bạn đã báo cáo nội dung này rồi"_ **.**

**Đối tượng bị báo cáo không còn tồn tại:** Tại bước 2 (xử lý báo cáo), khi quản trị viên mở báo cáo ra xem, nếu đối tượng (bài viết/bình luận) đã bị chủ sở hữu tự xóa trước đó. Hệ thống không cho phép thực hiện các hành động phạt nội dung, tự động chuyển trạng thái báo cáo thành "Không còn tồn tại"

**Hủy thao tác báo cáo:** Tại bước 3 hoặc 4 (gửi báo cáo), nếu người dùng nhấn "Hủy" hoặc đóng biểu mẫu báo cáo. Hệ thống đóng cửa sổ, không ghi nhận dữ liệu. Kết thúc Use Case**.**

---

Quản trị viên truy cập vào bảng điều hành riêng biệt với hai phân hệ chính:

11. # **Quy trình quản lý người dùng**

- Xem danh sách toàn bộ tài khoản người dùng trong hệ thống với thông tin tổng hợp (tổng số tài khoản, số đang hoạt động, số bị khóa).
- Tìm kiếm tài khoản theo địa chỉ email chính xác.
- **Khóa tài khoản:** Người dùng bị khóa ngay lập tức không thể đăng nhập và bị chuyển hướng đến trang thông báo khóa tài khoản.
- **Mở khóa tài khoản:** Khôi phục quyền đăng nhập cho tài khoản đã bị khóa.

![][image66]

| Thành phần     | Nội dung chi tiết                                                                                                                                       |
| :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tên Use Case   | UC_Sys_Admin                                                                                                                                            |
| Tác nhân       | Quản trị viên(Admin)                                                                                                                                    |
| Mô tả tóm tắt  | Cung cấp giao diện độc lập để quản trị viên có cái nhìn tổng quan về hệ thống. Admin có thể xem danh sách, tìm kiếm, khóa/mở khóa tài khoản người dùng. |
| Tiền điều kiện | Quản trị viên phải đăng nhập thành công vào phân hệ Admin với tài khoản có đủ thẩm quyền.                                                               |
| Hậu điều kiện  | Trạng thái của tài khoản người dùng (hoạt động/bị khóa) và trạng thái của báo cáo được cập nhật vào CSDL dựa trên thao tác của Admin.                   |

**Luồng sự kiện**:

Kịch bản 1: Phân hệ Quản lý Người dùng

Bước 1: Admin truy cập vào ứng dụng, chọn mục "Quản lý người dùng".

Bước 2: Hệ thống hiển thị giao diện tổng quan bao gồm:

- Các tài khoản của người dùng hiện thị các trạng thái hoạt động hay bị khóa.
- Thanh tìm kiếm người dùng.

Bước 3: Admin nhập địa chỉ email chính xác vào thanh tìm kiếm và nhấn Enter.

Bước 4: Hệ thống lọc và hiển thị danh sách người dùng khớp với từ khóa.

Bước 5: Admin nhấp chọn hành động đối với một tài khoản cụ thể:

- Khóa : Admin nhấp nút "Khóa tài khoản". Hệ thống yêu cầu xác nhận. Sau khi xác nhận, hệ thống đổi trạng thái tài khoản thành "Bị khóa", buộc tài khoản này đăng xuất lập tức (nếu đang online) và chuyển hướng đến trang thông báo vi phạm ở lần đăng nhập tới.
- Mở khóa : Admin nhấp "Mở khóa tài khoản". Hệ thống khôi phục quyền đăng nhập, đổi trạng thái thành "Hoạt động".

Bước 6: Hệ thống cập nhật lại danh sách và các thẻ thống kê tổng hợp.

**Xử lý ngoại lệ**

**Không tìm thấy người dùng:** Tại bước 4 (quản lý người dùng), nếu email Admin nhập không khớp với bất kỳ tài khoản nào trong hệ thống. Hệ thống hiển thị thông báo "Không tìm thấy người dùng" và giữ nguyên khung tìm kiếm để Admin nhập lại.

---
