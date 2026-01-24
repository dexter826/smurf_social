import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { userService } from '../services/userService';

interface AuthContextType {
  user: User | null;
  login: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
        const storedUser = localStorage.getItem('zalo_user_id');
        if (storedUser) {
            try {
                // In real app, verify token. Here we fetch mock user
                const userData = await userService.getUserById(storedUser);
                if (userData) setUser(userData);
            } catch (error) {
                console.error("Auth check failed", error);
                localStorage.removeItem('zalo_user_id');
            }
        }
        setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async () => {
    setIsLoading(true);
    try {
        const userData = await userService.getCurrentUser();
        setUser(userData);
        localStorage.setItem('zalo_user_id', userData.id);
    } catch (error) {
        console.error("Login failed", error);
    } finally {
        setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('zalo_user_id');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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