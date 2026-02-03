import { z } from 'zod';
import { VALIDATION, GROUP_LIMITS, REPORT_CONFIG } from '../constants/appConfig';
import { ReportReason } from '../types';

// Schema cho Đăng nhập
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Vui lòng nhập email')
    .email('Email không hợp lệ'),
  password: z.string()
    .min(1, 'Vui lòng nhập mật khẩu')
    .min(VALIDATION.PASSWORD_MIN_LENGTH, `Mật khẩu phải có ít nhất ${VALIDATION.PASSWORD_MIN_LENGTH} ký tự`),
});

// Schema cho Đăng ký
export const registerSchema = z.object({
  name: z.string()
    .min(1, 'Vui lòng nhập họ tên')
    .max(GROUP_LIMITS.NAME_MAX_LENGTH, `Họ tên không được quá ${GROUP_LIMITS.NAME_MAX_LENGTH} ký tự`),
  email: z.string()
    .min(1, 'Vui lòng nhập email')
    .email('Email không hợp lệ'),
  password: z.string()
    .min(1, 'Vui lòng nhập mật khẩu')
    .min(VALIDATION.PASSWORD_MIN_LENGTH, `Mật khẩu phải có ít nhất ${VALIDATION.PASSWORD_MIN_LENGTH} ký tự`),
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
    .max(GROUP_LIMITS.NAME_MAX_LENGTH, `Tên không được quá ${GROUP_LIMITS.NAME_MAX_LENGTH} ký tự`),
  bio: z.string()
    .max(VALIDATION.BIO_MAX_LENGTH, `Giới thiệu không được quá ${VALIDATION.BIO_MAX_LENGTH} ký tự`)
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
    .min(VALIDATION.PASSWORD_MIN_LENGTH, `Mật khẩu mới phải có ít nhất ${VALIDATION.PASSWORD_MIN_LENGTH} ký tự`),
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
    .max(VALIDATION.POST_CONTENT_MAX_LENGTH, `Nội dung không được quá ${VALIDATION.POST_CONTENT_MAX_LENGTH} ký tự`)
    .optional()
    .or(z.literal('')),
  visibility: z.enum(['public', 'friends', 'private']),
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
    .max(REPORT_CONFIG.DESCRIPTION_MAX_LENGTH, `Mô tả không được quá ${REPORT_CONFIG.DESCRIPTION_MAX_LENGTH} ký tự`)
    .optional()
    .or(z.literal('')),
  images: z.array(z.string()).optional(),
}).refine(data => {
  if (data.reason === ReportReason.OTHER && !data.description?.trim()) return false;
  return true;
}, {
  message: "Vui lòng mô tả chi tiết lý do",
  path: ["description"],
});

// Schema cho Nhóm chat
export const groupSchema = z.object({
  name: z.string()
    .min(1, 'Tên nhóm không được để trống')
    .max(GROUP_LIMITS.NAME_MAX_LENGTH, `Tên nhóm không được quá ${GROUP_LIMITS.NAME_MAX_LENGTH} ký tự`),
  memberIds: z.array(z.string()).min(GROUP_LIMITS.MIN_MEMBERS, `Nhóm phải có ít nhất ${GROUP_LIMITS.MIN_MEMBERS} thành viên`),
});

// Schema cho Bình luận
export const commentSchema = z.object({
  content: z.string()
    .max(VALIDATION.COMMENT_MAX_LENGTH, `Bình luận không được quá ${VALIDATION.COMMENT_MAX_LENGTH} ký tự`)
    .optional()
    .or(z.literal('')),
  image: z.string().optional(),
}).refine(data => data.content?.trim() || data.image, {
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
