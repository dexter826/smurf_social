import { useCallback } from 'react';
import { Conversation } from '../../types';
import { useChatStore } from '../../store/chatStore';

interface UseChatGroupsProps {
  selectedConversationId: string | null;
  currentUserId: string | null;
  conversations: Conversation[];
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
    promoteToAdmin,
    demoteFromAdmin,
  } = useChatStore();

  const handleCreateGroup = useCallback(async (
    memberIds: string[], 
    groupName: string, 
    groupAvatar?: string
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
    
    if (conv?.isGroup && conv.creatorId === currentUserId && conv.participantIds.length > 1) {
      return { needAssignAdmin: true };
    }

    await leaveGroup(selectedConversationId, currentUserId);
    return { needAssignAdmin: false };
  }, [selectedConversationId, currentUserId, conversations, leaveGroup]);

  const handleAssignAdminAndLeave = useCallback(async (newAdminId: string) => {
    if (!selectedConversationId || !currentUserId) return;
    
    await promoteToAdmin(selectedConversationId, newAdminId);
    await leaveGroup(selectedConversationId, currentUserId);
  }, [selectedConversationId, currentUserId, promoteToAdmin, leaveGroup]);

  const handlePromoteToAdmin = useCallback(async (userId: string) => {
    if (!selectedConversationId) return;
    await promoteToAdmin(selectedConversationId, userId);
  }, [selectedConversationId, promoteToAdmin]);

  const handleDemoteFromAdmin = useCallback(async (userId: string) => {
    if (!selectedConversationId) return;
    await demoteFromAdmin(selectedConversationId, userId);
  }, [selectedConversationId, demoteFromAdmin]);

  const handleEditGroup = useCallback(async (updates: { groupName?: string; groupAvatar?: string }) => {
    if (!selectedConversationId) return;
    await updateGroupInfo(selectedConversationId, updates);
  }, [selectedConversationId, updateGroupInfo]);

  return {
    handleCreateGroup,
    handleAddMembers,
    handleRemoveMember,
    handleLeaveGroup,
    handleAssignAdminAndLeave,
    handlePromoteToAdmin,
    handleDemoteFromAdmin,
    handleEditGroup,
  };
};
