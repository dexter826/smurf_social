import { 
  collection, 
  addDoc, 
  getDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  deleteField,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { conversationService } from './conversationService';
import { messageService } from './messageService';
import { userService } from '../userService';
import { uploadWithProgress, UploadProgress, deleteStorageFile } from '../../utils/uploadUtils';
import { compressImage } from '../../utils/imageUtils';
import { IMAGE_COMPRESSION } from '../../constants';

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
        memberJoinedAt: participantIds.reduce((acc, id) => ({ ...acc, [id]: serverTimestamp() }), {}),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        pinned: false,
        muted: false
      };
      
      const docRef = await addDoc(collection(db, 'conversations'), conversationData);
      
      // Thông báo tạo nhóm
      const creator = await userService.getUserById(creatorId);
      await messageService.sendSystemMessage(docRef.id, `${creator?.name || 'Ai đó'} đã tạo nhóm "${groupName}"`);
      
      return docRef.id;
    } catch (error) {
      console.error("Lỗi tạo nhóm:", error);
      throw error;
    }
  },

  // Cập nhật tên hoặc ảnh đại diện nhóm
  updateGroupInfo: async (
    conversationId: string,
    actorId: string,
    updates: { groupName?: string; groupAvatar?: string }
  ): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Thông báo cập nhật thông tin (tên/ảnh)
      if (updates.groupName || updates.groupAvatar) {
        const actor = await userService.getUserById(actorId);
        const content = updates.groupName 
          ? `${actor?.name || 'Ai đó'} đã đổi tên nhóm thành "${updates.groupName}"`
          : `${actor?.name || 'Ai đó'} đã cập nhật ảnh đại diện của nhóm`;
        await messageService.sendSystemMessage(conversationId, content);
      }
    } catch (error) {
      console.error("Lỗi cập nhật thông tin nhóm:", error);
      throw error;
    }
  },

  // Thêm thành viên mới vào nhóm
  addGroupMember: async (conversationId: string, actorId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        participantIds: arrayUnion(userId),
        [`unreadCount.${userId}`]: 0,
        [`memberJoinedAt.${userId}`]: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Thông báo thêm thành viên
      const [actor, user] = await Promise.all([
        userService.getUserById(actorId),
        userService.getUserById(userId)
      ]);
      await messageService.sendSystemMessage(conversationId, `${actor?.name || 'Ai đó'} đã thêm ${user?.name || 'Thành viên mới'} vào nhóm`);
    } catch (error) {
      console.error("Lỗi thêm thành viên:", error);
      throw error;
    }
  },

  // Xóa thành viên khỏi nhóm
  removeGroupMember: async (conversationId: string, actorId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      
      await updateDoc(conversationRef, {
        participantIds: arrayRemove(userId),
        adminIds: arrayRemove(userId),
        [`unreadCount.${userId}`]: deleteField(),
        [`memberJoinedAt.${userId}`]: deleteField(),
        updatedAt: serverTimestamp()
      });

      const [actor, user] = await Promise.all([
        userService.getUserById(actorId),
        userService.getUserById(userId)
      ]);
      await messageService.sendSystemMessage(conversationId, `${actor?.name || 'Ai đó'} đã xóa ${user?.name || 'thành viên'} ra khỏi nhóm`);
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
        const newParticipantIds = data.participantIds.filter((id: string) => id !== userId);
        const newAdminIds = (data.adminIds || []).filter((id: string) => id !== userId);
        
        if (newParticipantIds.length === 0) {
          await conversationService.deleteConversation(conversationId, userId);
        } else {
          const updates: Record<string, unknown> = {
            participantIds: newParticipantIds,
            adminIds: newAdminIds,
            [`unreadCount.${userId}`]: deleteField(),
            [`memberJoinedAt.${userId}`]: deleteField(),
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

          const user = await userService.getUserById(userId);
          await messageService.sendSystemMessage(conversationId, `${user?.name || 'Ai đó'} đã rời khỏi nhóm`);
          
          if (updates.creatorId && updates.creatorId !== data.creatorId) {
            const newOwner = await userService.getUserById(updates.creatorId as string);
            await messageService.sendSystemMessage(conversationId, `${newOwner?.name || 'Ai đó'} đã trở thành chủ nhóm mới`);
          }
        }
      }
    } catch (error) {
      console.error("Lỗi rời nhóm:", error);
      throw error;
    }
  },

  // Chỉ định thành viên làm quản trị viên
  promoteToAdmin: async (conversationId: string, actorId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        adminIds: arrayUnion(userId)
      });

      // Thông báo thăng chức Admin
      const [actor, user] = await Promise.all([
        userService.getUserById(actorId),
        userService.getUserById(userId)
      ]);
      await messageService.sendSystemMessage(conversationId, `${actor?.name || 'Ai đó'} đã chỉ định ${user?.name || 'thành viên'} làm quản trị viên`);
    } catch (error) {
      console.error("Lỗi thăng quản trị viên:", error);
      throw error;
    }
  },

  // Gỡ quyền quản trị viên của thành viên
  demoteFromAdmin: async (conversationId: string, actorId: string, userId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        adminIds: arrayRemove(userId)
      });

      // Thông báo hạ chức Admin
      const [actor, user] = await Promise.all([
        userService.getUserById(actorId),
        userService.getUserById(userId)
      ]);
      await messageService.sendSystemMessage(conversationId, `${actor?.name || 'Ai đó'} đã xóa quyền quản trị viên của ${user?.name || 'thành viên'}`);
    } catch (error) {
      console.error("Lỗi hạ quyền quản trị viên:", error);
      throw error;
    }
  },

  // Upload ảnh đại diện nhóm
  uploadGroupAvatar: async (
    conversationId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> => {
    try {
      const compressedFile = await compressImage(file, IMAGE_COMPRESSION.AVATAR);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `group_${conversationId}_${Date.now()}.${fileExt}`;
      const path = `group-avatars/${conversationId}/${fileName}`;

      // Lấy avatar cũ để xóa sau
      const convSnap = await getDoc(doc(db, 'conversations', conversationId));
      const oldAvatar = convSnap.exists() ? convSnap.data().groupAvatar : null;

      const downloadURL = await uploadWithProgress(path, compressedFile, onProgress);

      if (oldAvatar) await deleteStorageFile(oldAvatar);

      return downloadURL;
    } catch (error) {
      console.error("Lỗi upload avatar nhóm:", error);
      throw error;
    }
  },
  
  // Giải tán nhóm (Xóa toàn bộ hội thoại cho tất cả thành viên)
  disbandGroup: async (conversationId: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const convSnap = await getDoc(conversationRef);
      const groupAvatar = convSnap.exists() ? convSnap.data().groupAvatar : null;

      await deleteDoc(conversationRef);

      if (groupAvatar) await deleteStorageFile(groupAvatar);
    } catch (error) {
      console.error("Lỗi giải tán nhóm:", error);
      throw error;
    }
  },
};
