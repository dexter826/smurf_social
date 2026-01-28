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
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Conversation, User } from '../../types';
import { batchGetUsers } from '../../utils/batchUtils';

export const conversationService = {
  // ========== CONVERSATIONS ==========
  
  /**
   * Lấy hoặc tạo conversation 1-1 giữa 2 users
   */
  getOrCreateConversation: async (user1Id: string, user2Id: string): Promise<string> => {
    try {
      const participantIds = [user1Id, user2Id].sort();
      
      // Tìm conversation có sẵn
      const q = query(
        collection(db, 'conversations'),
        where('participantIds', '==', participantIds),
        where('isGroup', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
      }
      
      // Tạo conversation mới
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
      console.error("Lỗi tạo conversation", error);
      throw error;
    }
  },

  /**
   * Subscribe realtime conversations của user
   */
  subscribeToConversations: (userId: string, callback: (conversations: Conversation[]) => void) => {
    const q = query(
      collection(db, 'conversations'), 
      where('participantIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, async (snapshot) => {
      // Thu thập tất cả participant IDs
      const allParticipantIds = new Set<string>();
      snapshot.docs.forEach(d => {
        const data = d.data();
        data.participantIds.forEach((id: string) => {
          if (id !== userId) allParticipantIds.add(id);
        });
      });

      // Batch load tất cả users một lần (bao gồm cả currentUser cho group)
      const usersMap = await batchGetUsers([...allParticipantIds, userId]);

      const conversations = snapshot.docs.map((d) => {
        const data = d.data();
        
        let participants;
        if (data.isGroup) {
          // Group: lấy TẤT CẢ participants bao gồm cả currentUser
          participants = data.participantIds
            .map((id: string) => usersMap[id])
            .filter((p: User | undefined) => !!p);
        } else {
          // Chat 1-1: chỉ lấy đối phương
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
      console.error("Lỗi subscribe conversations", error);
    });
  },

  /**
   * Pin/Unpin conversation
   */
  togglePinConversation: async (conversationId: string, pinned: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { pinned });
    } catch (error) {
      console.error("Lỗi pin conversation", error);
      throw error;
    }
  },

  /**
   * Mute/Unmute conversation
   */
  toggleMuteConversation: async (conversationId: string, muted: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { muted });
    } catch (error) {
      console.error("Lỗi mute conversation", error);
      throw error;
    }
  },

  /**
   * Lưu trữ/Bỏ lưu trữ conversation
   */
  toggleArchiveConversation: async (conversationId: string, archived: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { archived });
    } catch (error) {
      console.error("Lỗi archive conversation", error);
      throw error;
    }
  },

  /**
   * Đánh dấu chưa đọc/đã đọc conversation
   */
  toggleMarkUnreadConversation: async (conversationId: string, markedUnread: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { markedUnread });
    } catch (error) {
      console.error("Lỗi mark unread conversation", error);
      throw error;
    }
  },

  /**
   * Xóa conversation
   */
  deleteConversation: async (conversationId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);
      
      // Xóa tất cả messages
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Xóa conversation
      batch.delete(doc(db, 'conversations', conversationId));
      
      await batch.commit();
    } catch (error) {
      console.error("Lỗi xóa conversation", error);
      throw error;
    }
  }
};
