import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../app';

interface SearchResult {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

// Thay thế getDocs toàn collection — tìm user theo email chính xác
export const searchUsers = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Chưa đăng nhập');

    const { searchTerm, currentUserId } = request.data as {
      searchTerm: string;
      currentUserId?: string;
    };

    if (!searchTerm || searchTerm.trim().length < 1) {
      throw new HttpsError('invalid-argument', 'Vui lòng nhập từ khóa tìm kiếm');
    }

    try {
      const snap = await db
        .collection('users')
        .where('email', '==', searchTerm.toLowerCase().trim())
        .where('status', '!=', 'banned')
        .limit(10)
        .get();

      const users: SearchResult[] = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as SearchResult))
        .filter((u) => u.id !== currentUserId);

      return { users };
    } catch (error) {
      console.error('[searchUsers] Lỗi:', error);
      throw new HttpsError('internal', 'Lỗi tìm kiếm người dùng');
    }
  }
);
