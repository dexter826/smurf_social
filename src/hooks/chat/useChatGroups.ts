import { useCallback } from 'react';
import { MediaObject } from '../../../shared/types';
import { useRtdbChatStore } from '../../store';
import { systemMessages } from '../../constants/systemMessages';
import { toast } from '../../store/toastStore';

interface UseChatGroupsProps {
  selectedConversationId: string | null;
  currentUserId: string | null;
  conversations: Array<{ id: string; data: any }>;
  usersMap: Record<string, any>;
  currentUserName?: string;
}

/** Quản lý các hành động liên quan đến nhóm chat */
export const useChatGroups = ({
  selectedConversationId,
  currentUserId,
  conversations,
  usersMap,
}: UseChatGroupsProps) => {
  const {
    createGroup,
    updateGroupInfo,
    addMember,
    inviteMember,
    approveMembers,
    rejectMembers,
    toggleApprovalMode,
    removeMember,
    leaveGroup,
    updateMemberRole,
    transferCreator,
    disbandGroup,
    sendGroupSystemMessage,
  } = useRtdbChatStore();

  const getName = (uid: string) => usersMap[uid]?.fullName || 'Người dùng';
  const getActorName = () => (currentUserId ? getName(currentUserId) : 'Người dùng');

  const handleCreateGroup = useCallback(async (
    memberIds: string[],
    groupName: string,
    groupAvatar?: File | MediaObject,
  ) => {
    if (!currentUserId) return;
    const conversationId = await createGroup(currentUserId, memberIds, groupName, groupAvatar);
    await sendGroupSystemMessage(
      conversationId,
      currentUserId,
      systemMessages.CREATE_GROUP(getActorName())
    );
  }, [currentUserId, createGroup, sendGroupSystemMessage, getActorName]);

  /** Thêm thành viên trực tiếp (Admin/Creator) */
  const handleAddMembers = useCallback(async (userIds: string[]) => {
    if (!selectedConversationId) return;
    try {
      await addMember(selectedConversationId, userIds);
      if (currentUserId) {
        for (const id of userIds) {
          await sendGroupSystemMessage(
            selectedConversationId,
            currentUserId,
            systemMessages.ADD_MEMBERS(getActorName(), getName(id))
          );
        }
      }
    } catch (error) {
      console.error('[useChatGroups] Lỗi thêm thành viên:', error);
    }
  }, [selectedConversationId, addMember, sendGroupSystemMessage, currentUserId, getActorName, getName]);

  /** Mời thành viên — phân nhánh direct/pending theo approval mode */
  const handleInviteMembers = useCallback(async (userIds: string[]) => {
    if (!selectedConversationId || !currentUserId) return;
    try {
      for (const uid of userIds) {
        const result = await inviteMember(selectedConversationId, uid);
        const msgContent = result === 'pending'
          ? systemMessages.INVITE_PENDING(getActorName(), getName(uid))
          : systemMessages.ADD_MEMBERS(getActorName(), getName(uid));
        await sendGroupSystemMessage(selectedConversationId, currentUserId, msgContent);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Không thể mời thành viên');
    }
  }, [selectedConversationId, currentUserId, inviteMember, sendGroupSystemMessage, getActorName, getName]);

  const handleApproveMembers = useCallback(async (uids: string[]) => {
    if (!selectedConversationId || !currentUserId) return;
    await approveMembers(selectedConversationId, uids);
    for (const uid of uids) {
      await sendGroupSystemMessage(
        selectedConversationId,
        currentUserId,
        systemMessages.APPROVE_MEMBER(getActorName(), getName(uid))
      );
    }
  }, [selectedConversationId, currentUserId, approveMembers, sendGroupSystemMessage, getActorName, getName]);

  const handleRejectMembers = useCallback(async (uids: string[]) => {
    if (!selectedConversationId || !currentUserId) return;
    await rejectMembers(selectedConversationId, uids);
    for (const uid of uids) {
      await sendGroupSystemMessage(
        selectedConversationId,
        currentUserId,
        systemMessages.REJECT_MEMBER(getActorName(), getName(uid))
      );
    }
  }, [selectedConversationId, currentUserId, rejectMembers, sendGroupSystemMessage, getActorName, getName]);

  const handleToggleApprovalMode = useCallback(async (enabled: boolean) => {
    if (!selectedConversationId || !currentUserId) return;
    const autoApprovedUids = await toggleApprovalMode(selectedConversationId, enabled);
    const msg = enabled
      ? systemMessages.TOGGLE_APPROVAL_ON(getActorName())
      : systemMessages.TOGGLE_APPROVAL_OFF(getActorName());
    await sendGroupSystemMessage(selectedConversationId, currentUserId, msg);
    // Gửi system message cho từng người được auto-approve khi tắt mode
    for (const uid of autoApprovedUids) {
      await sendGroupSystemMessage(
        selectedConversationId,
        currentUserId,
        systemMessages.APPROVE_MEMBER(getActorName(), getName(uid))
      );
    }
  }, [selectedConversationId, currentUserId, toggleApprovalMode, sendGroupSystemMessage, getActorName, getName]);

  const handleRemoveMember = useCallback(async (userId: string) => {
    if (!selectedConversationId) return;
    try {
      await removeMember(selectedConversationId, userId);
      if (currentUserId) {
        await sendGroupSystemMessage(
          selectedConversationId,
          currentUserId,
          systemMessages.REMOVE_MEMBER(getActorName(), getName(userId))
        );
      }
    } catch (error: any) {
      toast.error(error?.message || 'Không thể xóa thành viên');
    }
  }, [selectedConversationId, removeMember, sendGroupSystemMessage, currentUserId, getActorName, getName]);

  const handleLeaveGroup = useCallback(async (conversationId?: string): Promise<{ needAssignAdmin: boolean }> => {
    const id = conversationId || selectedConversationId;
    if (!id || !currentUserId) return { needAssignAdmin: false };

    const conv = conversations.find(c => c.id === id);

    if (conv?.data?.isGroup && conv.data.creatorId === currentUserId) {
      const memberCount = Object.keys(conv.data.members || {}).length;
      if (memberCount > 1) {
        return { needAssignAdmin: true };
      }
    }

    try {
      await sendGroupSystemMessage(id, currentUserId, systemMessages.LEAVE_GROUP(getActorName()));
    } catch {
    }
    await leaveGroup(id, currentUserId);
    return { needAssignAdmin: false };
  }, [selectedConversationId, currentUserId, conversations, leaveGroup, sendGroupSystemMessage, getActorName]);

  const handleAssignAdminAndLeave = useCallback(async (newAdminId: string) => {
    if (!selectedConversationId || !currentUserId) return;
    await updateMemberRole(selectedConversationId, newAdminId, 'admin');
    await sendGroupSystemMessage(
      selectedConversationId,
      currentUserId,
      systemMessages.CHANGE_ADMIN_ROLE(getActorName(), getName(newAdminId))
    );
    await sendGroupSystemMessage(selectedConversationId, currentUserId, systemMessages.LEAVE_GROUP(getActorName()));
    await leaveGroup(selectedConversationId, currentUserId);
  }, [selectedConversationId, currentUserId, updateMemberRole, leaveGroup, sendGroupSystemMessage, getActorName, getName]);

  /** Chuyển quyền Trưởng nhóm mà không rời nhóm */
  const handleTransferCreator = useCallback(async (newCreatorId: string) => {
    if (!selectedConversationId || !currentUserId) return;
    await transferCreator(selectedConversationId, newCreatorId);
    await sendGroupSystemMessage(
      selectedConversationId,
      currentUserId,
      systemMessages.TRANSFER_CREATOR(getActorName(), getName(newCreatorId))
    );
  }, [selectedConversationId, currentUserId, transferCreator, sendGroupSystemMessage, getActorName, getName]);

  const handlePromoteToAdmin = useCallback(async (userId: string) => {
    if (!selectedConversationId) return;
    await updateMemberRole(selectedConversationId, userId, 'admin');
    if (currentUserId) {
      await sendGroupSystemMessage(
        selectedConversationId,
        currentUserId,
        systemMessages.PROMOTE_TO_ADMIN(getActorName(), getName(userId))
      );
    }
  }, [selectedConversationId, updateMemberRole, sendGroupSystemMessage, currentUserId, getActorName, getName]);

  const handleDemoteFromAdmin = useCallback(async (userId: string) => {
    if (!selectedConversationId) return;
    await updateMemberRole(selectedConversationId, userId, 'member');
    if (currentUserId) {
      await sendGroupSystemMessage(
        selectedConversationId,
        currentUserId,
        systemMessages.DEMOTE_FROM_ADMIN(getActorName(), getName(userId))
      );
    }
  }, [selectedConversationId, updateMemberRole, sendGroupSystemMessage, currentUserId, getActorName, getName]);

  const handleEditGroup = useCallback(async (updates: { name?: string; avatar?: MediaObject }) => {
    if (!selectedConversationId) return;
    await updateGroupInfo(selectedConversationId, updates);
    if (currentUserId) {
      const conv = conversations.find(c => c.id === selectedConversationId);
      const nameChanged = updates.name && updates.name !== conv?.data?.name;
      const avatarChanged = !!updates.avatar;

      let content = '';
      if (nameChanged && avatarChanged) {
        content = systemMessages.UPDATE_GROUP_BOTH(getActorName(), updates.name!);
      } else if (nameChanged) {
        content = systemMessages.UPDATE_GROUP_NAME(getActorName(), updates.name!);
      } else if (avatarChanged) {
        content = systemMessages.UPDATE_GROUP_AVATAR(getActorName());
      }

      if (content) {
        await sendGroupSystemMessage(selectedConversationId, currentUserId, content);
      }
    }
  }, [selectedConversationId, updateGroupInfo, currentUserId, conversations, sendGroupSystemMessage, getActorName]);

  const handleDisbandGroup = useCallback(async (conversationId?: string) => {
    const id = conversationId || selectedConversationId;
    if (!id) return;
    await disbandGroup(id);
  }, [selectedConversationId, disbandGroup]);

  return {
    handleCreateGroup,
    handleAddMembers,
    handleInviteMembers,
    handleApproveMembers,
    handleRejectMembers,
    handleToggleApprovalMode,
    handleRemoveMember,
    handleLeaveGroup,
    handleAssignAdminAndLeave,
    handleTransferCreator,
    handlePromoteToAdmin,
    handleDemoteFromAdmin,
    handleEditGroup,
    handleDisbandGroup,
  };
};
