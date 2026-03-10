import { useCallback } from 'react';
import { MediaObject } from '../../types';
import { useRtdbChatStore } from '../../store';

interface UseChatGroupsProps {
  selectedConversationId: string | null;
  currentUserId: string | null;
  conversations: Array<{ id: string; data: any }>;
}

// Quản lý nhóm chat
export const useChatGroups = ({
  selectedConversationId,
  currentUserId,
  conversations
}: UseChatGroupsProps) => {
  const {
    createGroup,
    updateGroupInfo,
    addMember,
    removeMember,
    leaveGroup,
    updateMemberRole,
  } = useRtdbChatStore();

  const handleCreateGroup = useCallback(async (
    memberIds: string[],
    groupName: string,
    groupAvatar?: File | MediaObject
  ) => {
    if (!currentUserId) return;
    await createGroup(currentUserId, memberIds, groupName, groupAvatar);
  }, [currentUserId, createGroup]);

  const handleAddMembers = useCallback(async (userIds: string[]) => {
    if (!selectedConversationId) return;
    for (const userId of userIds) {
      await addMember(selectedConversationId, userId);
    }
  }, [selectedConversationId, addMember]);

  const handleRemoveMember = useCallback(async (userId: string) => {
    if (!selectedConversationId) return;
    await removeMember(selectedConversationId, userId);
  }, [selectedConversationId, removeMember]);

  const handleLeaveGroup = useCallback(async (): Promise<{ needAssignAdmin: boolean }> => {
    if (!selectedConversationId || !currentUserId) return { needAssignAdmin: false };

    const conv = conversations.find(c => c.id === selectedConversationId);

    // RTDB structure: check if user is creator and if there are other members
    if (conv?.data?.isGroup && conv.data.creatorId === currentUserId) {
      const memberCount = Object.keys(conv.data.members || {}).length;
      if (memberCount > 1) {
        return { needAssignAdmin: true };
      }
    }

    await leaveGroup(selectedConversationId, currentUserId);
    return { needAssignAdmin: false };
  }, [selectedConversationId, currentUserId, conversations, leaveGroup]);

  const handleAssignAdminAndLeave = useCallback(async (newAdminId: string) => {
    if (!selectedConversationId || !currentUserId) return;
    // First promote the new admin
    await updateMemberRole(selectedConversationId, newAdminId, 'admin');
    // Then leave
    await leaveGroup(selectedConversationId, currentUserId);
  }, [selectedConversationId, currentUserId, updateMemberRole, leaveGroup]);

  const handlePromoteToAdmin = useCallback(async (userId: string) => {
    if (!selectedConversationId) return;
    await updateMemberRole(selectedConversationId, userId, 'admin');
  }, [selectedConversationId, updateMemberRole]);

  const handleDemoteFromAdmin = useCallback(async (userId: string) => {
    if (!selectedConversationId) return;
    await updateMemberRole(selectedConversationId, userId, 'member');
  }, [selectedConversationId, updateMemberRole]);

  const handleEditGroup = useCallback(async (updates: { name?: string; avatar?: MediaObject }) => {
    if (!selectedConversationId) return;
    await updateGroupInfo(selectedConversationId, updates);
  }, [selectedConversationId, updateGroupInfo]);

  const handleDisbandGroup = useCallback(async () => {
    if (!selectedConversationId || !currentUserId) return;
    // Disband = remove all members then leave
    const conv = conversations.find(c => c.id === selectedConversationId);
    if (conv?.data?.members) {
      const memberIds = Object.keys(conv.data.members).filter(id => id !== currentUserId);
      for (const memberId of memberIds) {
        await removeMember(selectedConversationId, memberId);
      }
    }
    await leaveGroup(selectedConversationId, currentUserId);
  }, [selectedConversationId, currentUserId, conversations, removeMember, leaveGroup]);

  return {
    handleCreateGroup,
    handleAddMembers,
    handleRemoveMember,
    handleLeaveGroup,
    handleAssignAdminAndLeave,
    handlePromoteToAdmin,
    handleDemoteFromAdmin,
    handleEditGroup,
    handleDisbandGroup,
  };
};
