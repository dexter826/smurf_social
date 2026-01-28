import { 
  collection, 
  addDoc, 
  getDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { conversationService } from './conversationService';

export const groupService = {
  // ========== GROUP MANAGEMENT ==========

  /**
   * Tạo group conversation mới
   */
  createGroupConversation: async (
    creatorId: string,
    memberIds: string[],
    groupName: string,
    groupAvatar?: string
  ): Promise<string> => {
    try {
      const participantIds = [creatorId, ...memberIds.filter(id => id !== creatorId)];
      
      const conversationData = {
        participantIds,
        isGroup: true,
        groupName,
        groupAvatar: groupAvatar || null,
        creatorId,
        adminIds: [creatorId],
        unreadCount: participantIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        pinned: false,
        muted: false
      };
      
      const docRef = await addDoc(collection(db, 'conversations'), conversationData);
      return docRef.id;
    } catch (error) {
      console.error("Lỗi tạo group", error);
      throw error;
    }
  },

  /**
   * Cập nhật thông tin group (tên, avatar)
   */
  updateGroupInfo: async (
    conversationId: string,
    updates: { groupName?: string; groupAvatar?: string }
  ): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi cập nhật group info", error);
      throw error;
    }
  },

  /**
   * Thêm thành viên vào group
   */
  addGroupMember: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        participantIds: arrayUnion(userId),
        [`unreadCount.${userId}`]: 0,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi thêm thành viên", error);
      throw error;
    }
  },

  /**
   * Xóa thành viên khỏi group
   */
  removeGroupMember: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const data = conversationSnap.data();
        const newUnreadCount = { ...data.unreadCount };
        delete newUnreadCount[userId];
        
        await updateDoc(conversationRef, {
          participantIds: arrayRemove(userId),
          adminIds: arrayRemove(userId),
          unreadCount: newUnreadCount,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Lỗi xóa thành viên", error);
      throw error;
    }
  },

  /**
   * Rời khỏi group
   */
  leaveGroup: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const data = conversationSnap.data();
        const newUnreadCount = { ...data.unreadCount };
        delete newUnreadCount[userId];
        
        const newParticipantIds = data.participantIds.filter((id: string) => id !== userId);
        const newAdminIds = (data.adminIds || []).filter((id: string) => id !== userId);
        
        // Nếu người rời là creator và còn admin khác -> chuyển creator
        // Nếu không còn ai -> xóa group
        if (newParticipantIds.length === 0) {
          await conversationService.deleteConversation(conversationId);
        } else {
          const updates: any = {
            participantIds: newParticipantIds,
            adminIds: newAdminIds,
            unreadCount: newUnreadCount,
            updatedAt: serverTimestamp()
          };
          
          // Nếu creator rời, chuyển cho admin đầu tiên hoặc member đầu tiên
          if (data.creatorId === userId) {
            updates.creatorId = newAdminIds[0] || newParticipantIds[0];
            if (newAdminIds.length === 0) {
              updates.adminIds = [newParticipantIds[0]];
            }
          }
          
          await updateDoc(conversationRef, updates);
        }
      }
    } catch (error) {
      console.error("Lỗi rời group", error);
      throw error;
    }
  },

  /**
   * Thăng thành viên làm admin
   */
  promoteToAdmin: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        adminIds: arrayUnion(userId)
      });
    } catch (error) {
      console.error("Lỗi thăng admin", error);
      throw error;
    }
  },

  /**
   * Hạ quyền admin
   */
  demoteFromAdmin: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        adminIds: arrayRemove(userId)
      });
    } catch (error) {
      console.error("Lỗi hạ quyền admin", error);
      throw error;
    }
  },
};
