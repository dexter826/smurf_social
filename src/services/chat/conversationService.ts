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
  limit,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Conversation, User } from '../../types';
import { batchGetUsers } from '../../utils/batchUtils';
import { convertTimestamp } from '../../utils/dateUtils';

export const conversationService = {
  getOrCreateConversation: async (user1Id: string, user2Id: string): Promise<string> => {
    try {
      const [sec1Snap, sec2Snap] = await Promise.all([
        getDoc(doc(db, 'users', user1Id, 'private', 'security')),
        getDoc(doc(db, 'users', user2Id, 'private', 'security')),
      ]);
      if (sec1Snap.data()?.blockedUserIds?.includes(user2Id)) {
        throw new Error('Bạn đã chặn người dùng này');
      }
      if (sec2Snap.data()?.blockedUserIds?.includes(user1Id)) {
        throw new Error('Không thể nhắn tin cho người dùng này');
      }

      const participantIds = [user1Id, user2Id].sort();
      
      const q = query(
        collection(db, 'conversations'),
        where('participantIds', '==', participantIds),
        where('isGroup', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        if (data.deletedBy?.includes(user1Id)) {
          const newDeletedBy = data.deletedBy.filter((id: string) => id !== user1Id);
          await updateDoc(docSnap.ref, { deletedBy: newDeletedBy });
        }
        
        return docSnap.id;
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
        pinnedBy: [],
        mutedUsers: {}
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
          updatedAt: convertTimestamp(data.updatedAt, new Date())!,
          createdAt: convertTimestamp(data.createdAt, new Date())!,
          memberJoinedAt: data.memberJoinedAt ? Object.keys(data.memberJoinedAt).reduce((acc, uid) => ({
            ...acc,
            [uid]: convertTimestamp(data.memberJoinedAt[uid], new Date())!
          }), {}) : undefined,
          lastMessage: data.lastMessage ? {
            ...data.lastMessage,
            createdAt: convertTimestamp(data.lastMessage.createdAt, new Date())!
          } : undefined
        } as Conversation;
      }).filter(c => c !== null) as Conversation[];

      callback(conversations);
    }, (error) => {
      console.error("Lỗi đăng ký danh sách hội thoại:", error);
    });
  },

  // Ghim hoặc bỏ ghim hội thoại
  togglePin: async (conversationId: string, userId: string, pinned: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { 
        pinnedBy: pinned ? arrayUnion(userId) : arrayRemove(userId)
      });
    } catch (error) {
      console.error("Lỗi ghim hội thoại:", error);
      throw error;
    }
  },

  // Bật hoặc tắt thông báo hội thoại cho người dùng cụ thể
  toggleMute: async (conversationId: string, userId: string, muted: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { 
        [`mutedUsers.${userId}`]: muted 
      });
    } catch (error) {
      console.error("Lỗi tắt thông báo hội thoại:", error);
      throw error;
    }
  },

  // Lưu trữ hoặc bỏ lưu trữ hội thoại
  toggleArchive: async (conversationId: string, userId: string, archived: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { 
        archivedBy: archived ? arrayUnion(userId) : arrayRemove(userId)
      });
    } catch (error) {
      console.error("Lỗi lưu trữ hội thoại:", error);
      throw error;
    }
  },

  // Đánh dấu hội thoại là chưa đọc hoặc đã đọc
  toggleMarkUnread: async (conversationId: string, userId: string, markedUnread: boolean): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { 
        markedUnreadBy: markedUnread ? arrayUnion(userId) : arrayRemove(userId)
      });
    } catch (error) {
      console.error("Lỗi đánh dấu chưa đọc:", error);
      throw error;
    }
  },

  // Ẩn hội thoại và lưu thời điểm xóa (Soft delete)
  deleteConversation: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        deletedBy: arrayUnion(userId),
        [`deletedAt.${userId}`]: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi xóa hội thoại:", error);
      throw error;
    }
  },

  // Đánh dấu tất cả hội thoại là đã đọc cho người dùng hiện tại
  markAllConversationsAsRead: async (userId: string): Promise<void> => {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      let hasUpdates = false;

      querySnapshot.docs.forEach(d => {
        const data = d.data();
        if (data.unreadCount && data.unreadCount[userId] > 0) {
          batch.update(d.ref, {
            [`unreadCount.${userId}`]: 0,
            markedUnreadBy: arrayRemove(userId)
          });
          hasUpdates = true;
        } else if (data.markedUnreadBy?.includes(userId)) {
          batch.update(d.ref, { markedUnreadBy: arrayRemove(userId) });
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        await batch.commit();
      }
    } catch (error) {
      console.error("Lỗi đánh dấu tất cả đã đọc:", error);
      throw error;
    }
  }
};
