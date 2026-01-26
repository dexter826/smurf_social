import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../firebase/config';

export const authService = {
  // Đăng nhập với email và mật khẩu
  login: async (email: string, pass: string): Promise<FirebaseUser> => {
    const { user } = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return user;
  },

  // Đăng ký tài khoản mới
  register: async (email: string, pass: string): Promise<FirebaseUser> => {
    const { user } = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    return user;
  },

  // Gửi email khôi phục mật khẩu
  resetPassword: async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email.trim());
  },

  // Đăng xuất
  logout: async (): Promise<void> => {
    await signOut(auth);
  }
};
