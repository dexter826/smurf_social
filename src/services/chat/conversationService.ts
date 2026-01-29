import { 
  collection, 
  addDoc, 
  getDocs,
  getDoc, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  onSnapshot,
  writeBatch,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Conversation, User } from '../../types';
import { batchGetUsers } from '../../utils/batchUtils';

export const conversationService = {
  // Lấy hoặc tạo hội thoại 1-1 giữa hai người dùng
  getOrCreateConversation: async (user1Id: string, user2Id: string): Promise<string> => {
    try {
      const participantIds = [user1Id, user2Id].sort();
      
      const q = query(
        collection(db, 'conversations'),
        where('participantIds', '==', participantIds),
        where('isGroup', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
      }
      
      const conversationData = {
        participantIds,
        isGroup: false,
        unreadCount: {
          [user1Id]: 0,
          [user2Id]: 0
        },
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        pinned: false,
        muted: false
      };
      
      const docRef = await addDoc(collection(db, 'conversations'), conversationData);
      return docRef.id;
    } catch (error) {
      console.error("Lỗi tạo hội thoại:", error);
      throw error;
    }
  },

  // Đăng ký nhận cập nhật danh sách hội thoại theo thời gian thực
  subscribeToConversations: (userId: string, callback: (conversations: Conversation[]) => void) => {
    const q = query(
      collection(db, 'conversations'), 
      where('participantIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc'),
      limit(50) // Giới hạn 50 hội thoại gần nhất
    );

    return onSnapshot(q, async (snapshot) => {
      const allParticipantIds = new Set<string>();
      snapshot.docs.forEach(d => {
        const data = d.data();
        data.participantIds.forEach((id: string) => {
          if (id !== userId) allParticipantIds.add(id);
        });
      });

      // Lấy thông tin cache cho tất cả người tham gia
      const usersMap = await batchGetUsers([...allParticipantIds, userId]);

      const conversations = snapshot.docs.map((d) => {
        const data = d.data();
        
        let participants;
        if (data.isGroup) {
          // Lấy tất cả thành viên bao gồm cả người dùng hiện tại
          participants = data.participantIds
            .map((id: string) => usersMap[id])
            .filter((p: User | undefined) => !!p);
        } else {
          // Chỉ lấy thông tin đối phương trong chat 1-1
          const otherParticipantIds = data.participantIds.filter((id: string) => id !== userId);
          participants = otherParticipantIds
            .map((id: string) => usersMap[id])
            .filter((p: User | undefined) => !!p);
        }

        return {
          ...data,
          id: d.id,
          participants,
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          lastMessage: data.lastMessage ? {
            ...data.lastMessage,
            timestamp: data.lastMessage.timestamp?.toDate() || new Date()
          } : undefined
        } as Conversation;
      });

      callback(conversations);
    }, (error) => {
      console.error("Lỗi đăng ký danh sách hội thoại:", error);
    });
  },

  // Ghim hoặc bỏ ghim hội thoại
  togglePinConversation: async (conversationId: string, pinned: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { pinned });
    } catch (error) {
      console.error("Lỗi ghim hội thoại:", error);
      throw error;
    }
  },

  // Bật hoặc tắt thông báo hội thoại
  toggleMuteConversation: async (conversationId: string, muted: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { muted });
    } catch (error) {
      console.error("Lỗi tắt thông báo hội thoại:", error);
      throw error;
    }
  },

  // Lưu trữ hoặc bỏ lưu trữ hội thoại
  toggleArchiveConversation: async (conversationId: string, archived: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { archived });
    } catch (error) {
      console.error("Lỗi lưu trữ hội thoại:", error);
      throw error;
    }
  },

  // Đánh dấu hội thoại là chưa đọc hoặc đã đọc
  toggleMarkUnreadConversation: async (conversationId: string, markedUnread: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { markedUnread });
    } catch (error) {
      console.error("Lỗi đánh dấu chưa đọc:", error);
      throw error;
    }
  },

  // Xóa hội thoại và tất cả tin nhắn liên quan
  deleteConversation: async (conversationId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);
      
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      batch.delete(doc(db, 'conversations', conversationId));
      
      await batch.commit();
    } catch (error) {
      console.error("Lỗi xóa hội thoại:", error);
      throw error;
    }
  }
};
