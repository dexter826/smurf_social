import { StateCreator } from 'zustand';
import { Conversation } from '../../types';
import { groupService } from '../../services/chat/groupService';
import { useAuthStore } from '../authStore';
import { ConversationSlice } from './conversationSlice';

export interface GroupSlice {
  createGroup: (creatorId: string, memberIds: string[], groupName: string, groupAvatar?: File | string) => Promise<string>;
  updateGroupInfo: (conversationId: string, updates: { groupName?: string; groupAvatar?: string }) => Promise<void>;
  addMember: (conversationId: string, userId: string) => Promise<void>;
  removeMember: (conversationId: string, userId: string) => Promise<void>;
  leaveGroup: (conversationId: string, userId: string) => Promise<void>;
  promoteToAdmin: (conversationId: string, userId: string) => Promise<void>;
  demoteFromAdmin: (conversationId: string, userId: string) => Promise<void>;
  disbandGroup: (conversationId: string) => Promise<void>;
}

type GroupSliceWithConversation = GroupSlice & ConversationSlice;

export const createGroupSlice: StateCreator<GroupSliceWithConversation, [], [], GroupSlice> = (set, get) => ({
  createGroup: async (creatorId: string, memberIds: string[], groupName: string, groupAvatar?: File | string) => {
    try {
      const avatarUrl = typeof groupAvatar === 'string' ? groupAvatar : undefined;
      const conversationId = await groupService.createGroupConversation(creatorId, memberIds, groupName, avatarUrl);
      
      // Nếu có file ảnh, upload và cập nhật
      if (groupAvatar instanceof File) {
        try {
          const uploadedUrl = await groupService.uploadGroupAvatar(conversationId, groupAvatar);
          await groupService.updateGroupInfo(conversationId, creatorId, { groupAvatar: uploadedUrl });
          
          // Cập nhật state local
          set((state) => ({
            conversations: state.conversations.map(c => 
              c.id === conversationId ? { ...c, groupAvatar: uploadedUrl } : c
            )
          }));
        } catch (uploadError) {
          console.error("Lỗi upload ảnh nhóm sau khi tạo:", uploadError);
          // Vẫn tiếp tục vì nhóm đã được tạo thành công
        }
      }

      set({ selectedConversationId: conversationId });
      return conversationId;
    } catch (error) {
      console.error("Lỗi tạo nhóm:", error);
      throw error;
    }
  },

  updateGroupInfo: async (conversationId: string, updates: { groupName?: string; groupAvatar?: string }) => {
    const actorId = useAuthStore.getState().user?.id;
    if (!actorId) return;

    set((state) => ({
      conversations: state.conversations.map((c: Conversation) => c.id === conversationId ? { ...c, ...updates } : c)
    }));
    try {
      await groupService.updateGroupInfo(conversationId, actorId, updates);
    } catch (error) {
      console.error("Lỗi cập nhật thông tin nhóm:", error);
      throw error;
    }
  },

  addMember: async (conversationId: string, userId: string) => {
    const actorId = useAuthStore.getState().user?.id;
    if (!actorId) return;
    try {
      await groupService.addGroupMember(conversationId, actorId, userId);
    } catch (error) {
      console.error("Lỗi thêm thành viên:", error);
      throw error;
    }
  },

  removeMember: async (conversationId: string, userId: string) => {
    const actorId = useAuthStore.getState().user?.id;
    if (!actorId) return;
    try {
      await groupService.removeGroupMember(conversationId, actorId, userId);
    } catch (error) {
      console.error("Lỗi xóa thành viên:", error);
      throw error;
    }
  },

  leaveGroup: async (conversationId: string, userId: string) => {
    set((state) => ({
      conversations: state.conversations.filter((c: Conversation) => c.id !== conversationId),
      selectedConversationId: state.selectedConversationId === conversationId ? null : state.selectedConversationId
    }));
    try {
      await groupService.leaveGroup(conversationId, userId);
    } catch (error) {
      console.error("Lỗi rời nhóm:", error);
      throw error;
    }
  },

  promoteToAdmin: async (conversationId: string, userId: string) => {
    const actorId = useAuthStore.getState().user?.id;
    if (!actorId) return;
    try {
      await groupService.promoteToAdmin(conversationId, actorId, userId);
    } catch (error) {
      console.error("Lỗi chỉ định admin:", error);
      throw error;
    }
  },

  demoteFromAdmin: async (conversationId: string, userId: string) => {
    const actorId = useAuthStore.getState().user?.id;
    if (!actorId) return;
    try {
      await groupService.demoteFromAdmin(conversationId, actorId, userId);
    } catch (error) {
      console.error("Lỗi gỡ quyền admin:", error);
      throw error;
    }
  },

  disbandGroup: async (conversationId: string) => {
    set((state) => ({
      conversations: state.conversations.filter((c: Conversation) => c.id !== conversationId),
      selectedConversationId: state.selectedConversationId === conversationId ? null : state.selectedConversationId
    }));
    try {
      await groupService.disbandGroup(conversationId);
    } catch (error) {
      console.error("Lỗi giải tán nhóm:", error);
      throw error;
    }
  },
});
