import { getDocs, query, collection, where, documentId, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from '../types';

export const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const batchGetUsers = async (userIds: string[]): Promise<Record<string, User>> => {
  if (!userIds || userIds.length === 0) return {};

  const uniqueIds = [...new Set(userIds)];
  const chunks = chunkArray(uniqueIds, 10);
  
  try {
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const q = query(
          collection(db, 'users'),
          where(documentId(), 'in', chunk)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
          lastSeen: doc.data().lastSeen?.toDate ? doc.data().lastSeen.toDate() : doc.data().lastSeen,
        })) as User[];
      })
    );

    return results.flat().reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, User>);
  } catch (error) {
    console.error('Lỗi lấy dữ liệu người dùng:', error);
    return {};
  }
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
