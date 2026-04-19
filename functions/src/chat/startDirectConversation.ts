import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, rtdb } from '../app';

/**
 * Khởi tạo hội thoại 1-1 an toàn từ Backend
 */
export const startDirectConversation = onCall(
  {
    region: 'asia-southeast1',
    cors: true,
  },
  async (request) => {
    // 1. Kiểm tra xác thực
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Bạn cần đăng nhập để thực hiện hành động này.');
    }

    const { targetUserId } = request.data as { targetUserId: string };
    const currentUserId = request.auth.uid;

    if (!targetUserId || targetUserId === currentUserId) {
      throw new HttpsError('invalid-argument', 'ID người nhận không hợp lệ.');
    }

    try {
      // 2. Kiểm tra quan hệ bạn bè
      const friendSnap = await db
        .collection('users')
        .doc(currentUserId)
        .collection('friends')
        .doc(targetUserId)
        .get();

      const isFriend = friendSnap.exists;

      // 3. Nếu không phải bạn bè, kiểm tra cài đặt riêng tư của người nhận
      if (!isFriend) {
        const settingsSnap = await db
          .collection('users')
          .doc(targetUserId)
          .collection('private')
          .doc('settings')
          .get();

        const settings = settingsSnap.data();
        // Mặc định là true nếu không tìm thấy settings
        const allowStrangers = settings?.allowMessagesFromStrangers ?? true;

        if (!allowStrangers) {
          throw new HttpsError(
            'failed-precondition',
            'Người dùng này đã tắt tính năng nhận tin nhắn từ người lạ.'
          );
        }
      }

      // 4. Kiểm tra Block (Chặn 2 chiều)
      const [block1, block2] = await Promise.all([
        db.collection('users').doc(currentUserId).collection('blockedUsers').doc(targetUserId).get(),
        db.collection('users').doc(targetUserId).collection('blockedUsers').doc(currentUserId).get()
      ]);

      if (block1.exists || block2.exists) {
        throw new HttpsError('permission-denied', 'Không thể bắt đầu trò chuyện với người dùng này.');
      }

      // 5. Khởi tạo hội thoại trong RTDB
      const sortedIds = [currentUserId, targetUserId].sort();
      const convId = `direct_${sortedIds[0]}_${sortedIds[1]}`;
      const now = Date.now();

      const convRef = rtdb.ref(`conversations/${convId}`);
      const convSnap = await convRef.get();

      if (!convSnap.exists()) {
        const updates: Record<string, any> = {};
        
        // Tạo node conversation
        updates[`conversations/${convId}`] = {
          isGroup: false,
          creatorId: currentUserId,
          members: {
            [currentUserId]: 'admin',
            [targetUserId]: 'member'
          },
          createdAt: now,
          updatedAt: now,
          lastMessage: null
        };

        // Tạo node user_chats cho cả 2
        [currentUserId, targetUserId].forEach(uid => {
          updates[`user_chats/${uid}/${convId}`] = {
            isPinned: false,
            isMuted: false,
            isArchived: false,
            unreadCount: 0,
            lastReadMsgId: null,
            lastMsgTimestamp: now,
            clearedAt: 0,
            createdAt: now,
            updatedAt: now
          };
        });

        await rtdb.ref().update(updates);
      }

      return { convId };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      
      console.error('[startDirectConversation] Lỗi:', error);
      throw new HttpsError('internal', 'Đã có lỗi xảy ra khi khởi tạo cuộc trò chuyện.');
    }
  }
);
