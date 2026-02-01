import { z } from 'zod';

// Schema cho Đăng nhập
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Vui lòng nhập email')
    .email('Email không hợp lệ'),
  password: z.string()
    .min(1, 'Vui lòng nhập mật khẩu')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

// Schema cho Đăng ký
export const registerSchema = z.object({
  name: z.string()
    .min(1, 'Vui lòng nhập họ tên')
    .max(50, 'Họ tên không được quá 50 ký tự'),
  email: z.string()
    .min(1, 'Vui lòng nhập email')
    .email('Email không hợp lệ'),
  password: z.string()
    .min(1, 'Vui lòng nhập mật khẩu')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string()
    .min(1, 'Vui lòng xác nhận mật khẩu'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

// Schema cho Quên mật khẩu
export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Vui lòng nhập email')
    .email('Email không hợp lệ'),
});

// Schema cho Chỉnh sửa hồ sơ
export const profileSchema = z.object({
  name: z.string()
    .min(1, 'Tên không được để trống')
    .max(50, 'Tên không được quá 50 ký tự'),
  bio: z.string()
    .max(150, 'Giới thiệu không được quá 150 ký tự')
    .optional(),
  location: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  birthDate: z.number().optional(),
});

// Schema cho Đổi mật khẩu
export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string()
    .min(1, 'Vui lòng nhập mật khẩu mới')
    .min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
  confirmPassword: z.string()
    .min(1, 'Vui lòng xác nhận mật khẩu mới'),
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: "Mật khẩu mới không được trùng với mật khẩu hiện tại",
  path: ["newPassword"],
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

// Schema cho Bài viết
export const postSchema = z.object({
  content: z.string()
    .max(5000, 'Nội dung không được quá 5000 ký tự')
    .optional()
    .or(z.literal('')),
  visibility: z.enum(['friends', 'private']),
  images: z.array(z.string()),
  videos: z.array(z.string()),
}).refine(data => data.content?.trim() || data.images.length > 0 || data.videos.length > 0, {
  message: "Bài viết không được để trống",
  path: ["content"],
});

// Schema cho Báo cáo
export const reportSchema = z.object({
  reason: z.string().min(1, 'Vui lòng chọn lý do báo cáo'),
  description: z.string()
    .max(500, 'Mô tả không được quá 500 ký tự')
    .optional()
    .or(z.literal('')),
}).refine(data => {
  if (data.reason === 'OTHER' && !data.description?.trim()) return false;
  return true;
}, {
  message: "Vui lòng mô tả chi tiết lý do",
  path: ["description"],
});

// Schema cho Nhóm chat
export const groupSchema = z.object({
  name: z.string()
    .min(1, 'Tên nhóm không được để trống')
    .max(50, 'Tên nhóm không được quá 50 ký tự'),
  memberIds: z.array(z.string()).min(2, 'Nhóm phải có ít nhất 2 thành viên'),
});

// Schema cho Bình luận
export const commentSchema = z.object({
  content: z.string()
    .max(1000, 'Bình luận không được quá 1000 ký tự')
    .optional()
    .or(z.literal('')),
  image: z.string().optional(),
  video: z.string().optional(),
}).refine(data => data.content?.trim() || data.image || data.video, {
  message: "Bình luận không được để trống",
  path: ["content"],
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type PostFormValues = z.infer<typeof postSchema>;
export type ReportFormValues = z.infer<typeof reportSchema>;
export type GroupFormValues = z.infer<typeof groupSchema>;
export type CommentFormValues = z.infer<typeof commentSchema>;
