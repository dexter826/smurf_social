import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../firebase/config';

export const authService = {
  login: async (email: string, pass: string): Promise<FirebaseUser> => {
    const { user } = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return user;
  },

  register: async (email: string, pass: string): Promise<FirebaseUser> => {
    const { user } = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    return user;
  },

  resetPassword: async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email.trim());
  },

  logout: async (): Promise<void> => {
    await signOut(auth);
  }
};
