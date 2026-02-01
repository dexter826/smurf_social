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

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
