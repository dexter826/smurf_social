import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserRole } from '../types';

export const adminService = {
    setUserRole: async (userId: string, role: UserRole): Promise<void> => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                role
            });
        } catch (error) {
            console.error("Lỗi cập nhật role", error);
            throw error;
        }
    },

    banUser: async (userId: string): Promise<void> => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                status: 'banned'
            });
        } catch (error) {
            console.error("Lỗi ban user", error);
            throw error;
        }
    },

    unbanUser: async (userId: string): Promise<void> => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                status: 'active'
            });
        } catch (error) {
            console.error("Lỗi unban user", error);
            throw error;
        }
    }
};
