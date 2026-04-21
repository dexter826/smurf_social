import { db } from '../app';

/**
 * Kiểm tra xem người nhận (receiverId) có đang block tin nhắn từ người gửi (senderId) hay không.
 * Bao gồm cả block cứng và chặn tin nhắn từ người lạ.
 * @param receiverId ID người nhận
 * @param senderId ID người gửi
 * @param creatorId ID người khởi tạo hội thoại (dùng cho Contextual Authorization)
 * @returns boolean true nếu bị block, ngược lại false
 */
export const isBlockingMessages = async (receiverId: string, senderId: string, creatorId?: string): Promise<boolean> => {
  try {
    // 1. Kiểm tra block cứng (collection blockedUsers)
    const blockSnap = await db
      .collection('users')
      .doc(receiverId)
      .collection('blockedUsers')
      .doc(senderId)
      .get();
    
    if (blockSnap.exists && blockSnap.data()?.blockMessages === true) {
      return true;
    }

    // 2. Kiểm tra chặn người lạ (cài đặt allowMessagesFromStrangers)
    const settingsSnap = await db
      .collection('users')
      .doc(receiverId)
      .collection('private')
      .doc('settings')
      .get();
    
    const allowFromStrangers = settingsSnap.exists 
      ? (settingsSnap.data()?.allowMessagesFromStrangers ?? true) 
      : true;

    if (!allowFromStrangers) {
      // Kiểm tra quan hệ bạn bè
      const friendSnap = await db
        .collection('users')
        .doc(receiverId)
        .collection('friends')
        .doc(senderId)
        .get();
      
      const isFriend = friendSnap.exists;

      if (!isFriend) {
        /**
         * Contextual Authorization:
         * Nếu người nhận (receiverId) chính là người khởi tạo hội thoại (creatorId),
         * nghĩa là họ đã chủ động mở lời trước, nên người lạ (senderId) được phép phản hồi.
         * Chỉ chặn nếu người gửi (senderId) là người khởi tạo (hoặc hội thoại mới) 
         * và người nhận đang bật chế độ chặn người lạ.
         */
        if (creatorId !== receiverId) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error(`[isBlockingMessages] Lỗi khi kiểm tra block giữa receiver ${receiverId} và sender ${senderId}:`, error);
    return false;
  }
};
