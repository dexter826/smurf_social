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
  // Tạo hội thoại nhóm mới
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
      console.error("Lỗi tạo nhóm:", error);
      throw error;
    }
  },

  // Cập nhật tên hoặc ảnh đại diện nhóm
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
      console.error("Lỗi cập nhật thông tin nhóm:", error);
      throw error;
    }
  },

  // Thêm thành viên mới vào nhóm
  addGroupMember: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        participantIds: arrayUnion(userId),
        [`unreadCount.${userId}`]: 0,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi thêm thành viên:", error);
      throw error;
    }
  },

  // Xóa thành viên khỏi nhóm
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
      console.error("Lỗi xóa thành viên:", error);
      throw error;
    }
  },

  // Rời khỏi nhóm và xử lý quyền trưởng nhóm
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
        
        // Xóa nhóm nếu không còn thành viên
        if (newParticipantIds.length === 0) {
          await conversationService.deleteConversation(conversationId);
        } else {
          const updates: any = {
            participantIds: newParticipantIds,
            adminIds: newAdminIds,
            unreadCount: newUnreadCount,
            updatedAt: serverTimestamp()
          };
          
          // Chỉ định admin mới nếu trưởng nhóm cũ rời đi
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
      console.error("Lỗi rời nhóm:", error);
      throw error;
    }
  },

  // Chỉ định thành viên làm quản trị viên
  promoteToAdmin: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        adminIds: arrayUnion(userId)
      });
    } catch (error) {
      console.error("Lỗi thăng quản trị viên:", error);
      throw error;
    }
  },

  // Gỡ quyền quản trị viên của thành viên
  demoteFromAdmin: async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        adminIds: arrayRemove(userId)
      });
    } catch (error) {
      console.error("Lỗi hạ quyền quản trị viên:", error);
      throw error;
    }
  },
};
