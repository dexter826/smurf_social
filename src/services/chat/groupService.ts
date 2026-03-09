import {
  collection,
  addDoc,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  setDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { messageService } from './messageService';
import { userService } from '../userService';
import { uploadWithProgress, UploadProgress, deleteStorageFile } from '../../utils/uploadUtils';
import { compressImage } from '../../utils/imageUtils';
import { IMAGE_COMPRESSION, GROUP_LIMITS } from '../../constants';

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
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'conversations'), conversationData);

      // Tạo member docs trong subcollection cho tất cả participants
      const memberPromises = participantIds.map(userId =>
        setDoc(doc(db, 'conversations', docRef.id, 'members', userId), {
          joinedAt: serverTimestamp(),
          isPinned: false,
          isMuted: false,
          isArchived: false,
          markedUnread: false,
          unreadCount: 0
        })
      );
      await Promise.all(memberPromises);

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
      const conversationSnap = await getDoc(conversationRef);

      if (!conversationSnap.exists()) {
        throw new Error('Nhóm không tồn tại');
      }

      const data = conversationSnap.data();
      const currentMemberCount = (data.participantIds || []).length;

      // Kiểm tra giới hạn số thành viên
      if (currentMemberCount >= GROUP_LIMITS.MAX_MEMBERS) {
        throw new Error(`Nhóm đã đạt tối đa ${GROUP_LIMITS.MAX_MEMBERS} thành viên`);
      }

      // Update conversation participantIds
      await updateDoc(conversationRef, {
        participantIds: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });

      // Tạo member doc trong subcollection
      await setDoc(doc(db, 'conversations', conversationId, 'members', userId), {
        joinedAt: serverTimestamp(),
        isPinned: false,
        isMuted: false,
        isArchived: false,
        markedUnread: false,
        unreadCount: 0
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

      // Update conversation participantIds và adminIds
      await updateDoc(conversationRef, {
        participantIds: arrayRemove(userId),
        adminIds: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });

      // Xóa member doc từ subcollection
      await deleteDoc(doc(db, 'conversations', conversationId, 'members', userId));

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
  leaveGroup: async (conversationId: string, userId: string, newAdminId?: string): Promise<void> => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (conversationSnap.exists()) {
        const data = conversationSnap.data();

        // Giải tán nếu nhóm chỉ còn 1 người
        if (data.participantIds.length <= 1) {
          await groupService.disbandGroup(conversationId);
          return;
        }

        const newParticipantIds = data.participantIds.filter((id: string) => id !== userId);
        let newAdminIds = (data.adminIds || []).filter((id: string) => id !== userId);

        const updates: Record<string, unknown> = {
          participantIds: newParticipantIds,
          updatedAt: serverTimestamp()
        };

        // Bắt buộc phải có Chủ nhóm mới
        if (data.creatorId === userId) {
          if (!newAdminId) {
            throw new Error("Bắt buộc chỉ định quản trị viên mới trước khi rời nhóm.");
          }
          if (!newParticipantIds.includes(newAdminId)) {
            throw new Error("Quản trị viên mới không nằm trong nhóm.");
          }
          updates.creatorId = newAdminId;

          if (!newAdminIds.includes(newAdminId)) {
            newAdminIds.push(newAdminId);
          }
        }

        updates.adminIds = newAdminIds;

        await updateDoc(conversationRef, updates);

        // Xóa member doc từ subcollection
        await deleteDoc(doc(db, 'conversations', conversationId, 'members', userId));

        const user = await userService.getUserById(userId);
        await messageService.sendSystemMessage(conversationId, `${user?.name || 'Ai đó'} đã rời khỏi nhóm`);

        if (updates.creatorId && updates.creatorId !== data.creatorId) {
          const newOwner = await userService.getUserById(updates.creatorId as string);
          await messageService.sendSystemMessage(conversationId, `${newOwner?.name || 'Ai đó'} đã trở thành chủ nhóm mới`);
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
