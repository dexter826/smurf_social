/**
 * Confirm Dialog Messages
 * Các hằng số thông báo xác nhận trên toàn bộ ứng dụng
 */

export const CONFIRM_MESSAGES = {
  FRIEND: {
    UNFRIEND: {
      TITLE: 'Hủy kết bạn',
      MESSAGE: (name: string) => `Bạn có chắc chắn muốn hủy kết bạn với ${name}?`,
      CONFIRM: 'Hủy kết bạn',
    },
    BLOCK: {
      TITLE: 'Chặn người dùng',
      MESSAGE: (name: string) => `Bạn có chắc chắn muốn chặn ${name}? Hai bạn sẽ không thể tìm thấy nhau hoặc gửi tin nhắn mới.`,
      CONFIRM: 'Chặn ngay',
    },
    UNBLOCK: {
      TITLE: 'Bỏ chặn người dùng',
      MESSAGE: (name: string) => `Bạn có chắc chắn muốn bỏ chặn ${name}? Họ sẽ có thể gửi tin nhắn cho bạn.`,
      CONFIRM: 'Bỏ chặn',
    },
  },
  MEDIA: {
    DELETE_AVATAR: {
      TITLE: 'Xóa ảnh đại diện',
      MESSAGE: 'Bạn có chắc chắn muốn xóa ảnh đại diện hiện tại? Bạn sẽ quay về sử dụng ảnh mặc định.',
      CONFIRM: 'Xóa ngay',
    },
    DELETE_COVER: {
      TITLE: 'Xóa ảnh bìa',
      MESSAGE: 'Bạn có chắc chắn muốn xóa ảnh bìa hiện tại?',
      CONFIRM: 'Xóa ngay',
    },
  },
  FEED: {
    DELETE_POST: {
      TITLE: 'Xóa bài viết',
      MESSAGE: 'Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.',
      CONFIRM: 'Xóa bài viết',
    },
    DELETE_COMMENT: {
      TITLE: 'Xóa bình luận',
      MESSAGE: (hasReplies: boolean) => hasReplies 
        ? 'Xóa bình luận này sẽ mất hết các câu trả lời liên quan. Bạn có chắc chắn?' 
        : 'Bạn có chắc chắn muốn xóa bình luận này?',
      CONFIRM: 'Xóa',
    },
  },
  ADMIN: {
    RESOLVE_REPORT: {
      TITLE: 'Xác nhận xử lý',
      MESSAGE: 'Nội dung vi phạm sẽ bị xóa vĩnh viễn khỏi hệ thống. Bạn có chắc chắn?',
      CONFIRM: 'Đồng ý xóa',
    },
    REJECT_REPORT: {
      TITLE: 'Bỏ qua báo cáo',
      MESSAGE: 'Báo cáo sẽ được đóng lại và nội dung vẫn được giữ nguyên. Tiếp tục?',
      CONFIRM: 'Xác nhận',
    },
    WARN_USER: {
      TITLE: 'Gửi cảnh báo',
      MESSAGE: 'Người dùng sẽ nhận được thông báo cảnh báo về vi phạm này.',
      CONFIRM: 'Gửi cảnh báo',
    },
    BAN_USER: {
      TITLE: 'Khóa tài khoản',
      MESSAGE: 'Tài khoản người dùng sẽ bị KHÓA và đăng xuất khỏi mọi thiết bị. Hành động này rất nghiêm trọng.',
      CONFIRM: 'Khóa ngay',
    },
    UNBAN_USER: {
      TITLE: 'Mở khóa tài khoản',
      MESSAGE: 'Người dùng sẽ có thể đăng nhập và sử dụng ứng dụng bình thường trở lại.',
      CONFIRM: 'Mở khóa',
    },
  },
  AUTH: {
    LOGOUT: {
      TITLE: 'Đăng xuất',
      MESSAGE: 'Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc này?',
      CONFIRM: 'Đăng xuất',
    }
  }
};
