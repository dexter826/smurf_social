import { db } from '../app';

/**
 * Kiểm tra xem người nhận (receiverId) có đang block tin nhắn (blockMessages) từ người gửi (senderId) hay không.
 * @param receiverId ID người nhận
 * @param senderId ID người gửi
 * @returns boolean true nếu bị block tin nhắn, ngược lại false
 */
export const isBlockingMessages = async (receiverId: string, senderId: string): Promise<boolean> => {
  try {
    const blockSnap = await db
      .collection('users')
      .doc(receiverId)
      .collection('blockedUsers')
      .doc(senderId)
      .get();
    
    return blockSnap.exists && blockSnap.data()?.blockMessages === true;
  } catch (error) {
    console.error(`[isBlockingMessages] Lỗi khi kiểm tra block giữa receiver ${receiverId} và sender ${senderId}:`, error);
    return false; // Mặc định false nếu có lỗi để không làm gãy luồng
  }
};
