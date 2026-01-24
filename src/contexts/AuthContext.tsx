import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut 
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { User } from '../types';
import { userService } from '../services/userService';

interface AuthContextType {
  user: User | null;
  login: (phone: string, pass: string) => Promise<void>;
  register: (phone: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await userService.getUserById(firebaseUser.uid);
          if (userData) {
            setUser(userData);
          }
        } catch (error) {
          console.error("Lỗi đồng bộ user", error);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const phoneToEmail = (phone: string) => `${phone}@smurfy.com`;

  const login = async (phone: string, pass: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, phoneToEmail(phone), pass);
    } catch (error) {
      console.error("Đăng nhập thất bại", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (phone: string, pass: string, name: string) => {
    setIsLoading(true);
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, phoneToEmail(phone), pass);
      
      const newUser = await userService.updateProfile(firebaseUser.uid, {
        id: firebaseUser.uid,
        name: name || 'Người dùng mới',
        avatar: `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
        phone: phone,
      });
      setUser(newUser);
    } catch (error) {
      console.error("Đăng ký thất bại", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Đăng xuất thất bại", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};