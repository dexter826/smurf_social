import { StateCreator } from 'zustand';
import { chatService } from '../../services/chatService';

export interface GroupSlice {
  createGroup: (creatorId: string, memberIds: string[], groupName: string, groupAvatar?: string) => Promise<string>;
  updateGroupInfo: (conversationId: string, updates: { groupName?: string; groupAvatar?: string }) => Promise<void>;
  addMember: (conversationId: string, userId: string) => Promise<void>;
  removeMember: (conversationId: string, userId: string) => Promise<void>;
  leaveGroup: (conversationId: string, userId: string) => Promise<void>;
  promoteToAdmin: (conversationId: string, userId: string) => Promise<void>;
  demoteFromAdmin: (conversationId: string, userId: string) => Promise<void>;
}

type GroupSliceWithConversation = GroupSlice & {
  conversations: any[];
  selectedConversationId: string | null;
};

export const createGroupSlice: StateCreator<GroupSliceWithConversation, [], [], GroupSlice> = (set, get) => ({
  createGroup: async (creatorId: string, memberIds: string[], groupName: string, groupAvatar?: string) => {
    try {
      const conversationId = await chatService.createGroupConversation(creatorId, memberIds, groupName, groupAvatar);
      set({ selectedConversationId: conversationId } as any);
      return conversationId;
    } catch (error) {
      console.error("Lỗi tạo nhóm:", error);
      throw error;
    }
  },

  updateGroupInfo: async (conversationId: string, updates: { groupName?: string; groupAvatar?: string }) => {
    set((state) => ({
      conversations: state.conversations.map((c: any) => c.id === conversationId ? { ...c, ...updates } : c)
    } as any));
    try {
      await chatService.updateGroupInfo(conversationId, updates);
    } catch (error) {
      console.error("Lỗi cập nhật thông tin nhóm:", error);
      throw error;
    }
  },

  addMember: async (conversationId: string, userId: string) => {
    try {
      await chatService.addGroupMember(conversationId, userId);
    } catch (error) {
      console.error("Lỗi thêm thành viên:", error);
      throw error;
    }
  },

  removeMember: async (conversationId: string, userId: string) => {
    try {
      await chatService.removeGroupMember(conversationId, userId);
    } catch (error) {
      console.error("Lỗi xóa thành viên:", error);
      throw error;
    }
  },

  leaveGroup: async (conversationId: string, userId: string) => {
    set((state) => ({
      conversations: state.conversations.filter((c: any) => c.id !== conversationId),
      selectedConversationId: state.selectedConversationId === conversationId ? null : state.selectedConversationId
    } as any));
    try {
      await chatService.leaveGroup(conversationId, userId);
    } catch (error) {
      console.error("Lỗi rời nhóm:", error);
      throw error;
    }
  },

  promoteToAdmin: async (conversationId: string, userId: string) => {
    try {
      await chatService.promoteToAdmin(conversationId, userId);
    } catch (error) {
      console.error("Lỗi chỉ định admin:", error);
      throw error;
    }
  },

  demoteFromAdmin: async (conversationId: string, userId: string) => {
    try {
      await chatService.demoteFromAdmin(conversationId, userId);
    } catch (error) {
      console.error("Lỗi gỡ quyền admin:", error);
      throw error;
    }
  },
});
