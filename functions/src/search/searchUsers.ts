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

      let users: SearchResult[] = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as SearchResult))
        .filter((u) => u.id !== currentUserId);

      if (currentUserId && users.length > 0) {
        const currentUserSecurityDoc = await db
          .collection('users')
          .doc(currentUserId)
          .collection('private')
          .doc('security')
          .get();
        
        const myBlockedUsers: string[] = currentUserSecurityDoc.exists 
          ? (currentUserSecurityDoc.data()?.blockedUsers || []) 
          : [];

        users = users.filter((u) => !myBlockedUsers.includes(u.id));

        if (users.length > 0) {
          const safeUsers: SearchResult[] = [];
          
          for (const targetUser of users) {
             const targetUserSecurityDoc = await db
              .collection('users')
              .doc(targetUser.id)
              .collection('private')
              .doc('security')
              .get();
              
             const theirBlockedUsers: string[] = targetUserSecurityDoc.exists
              ? (targetUserSecurityDoc.data()?.blockedUsers || [])
              : [];
              
             if (!theirBlockedUsers.includes(currentUserId)) {
               safeUsers.push(targetUser);
             }
          }
          
          users = safeUsers;
        }
      }

      return { users };
    } catch (error) {
      console.error('[searchUsers] Lỗi:', error);
      throw new HttpsError('internal', 'Lỗi tìm kiếm người dùng');
    }
  }
);
