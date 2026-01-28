import { useState, useEffect, useCallback } from 'react';
import { Message, User, Conversation } from '../types';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useUserCache } from '../store/userCacheStore';
import { userService } from '../services/userService';

interface UseChatReturn {
  // Data
  currentUser: User | null;
  conversations: Conversation[];
  filteredConversations: Conversation[];
  selectedConversationId: string | null;
  selectedConversation: Conversation | undefined;
  currentMessages: Message[];
  currentTypingUsers: string[];
  usersMap: Record<string, User>;
  archivedCount: number;
  isLoading: boolean;
  blockedMessage: string | undefined;
  
  // Search state
  isSearchFocused: boolean;
  searchResults: any;
  searchHistory: any[];
  
  // Message state
  forwardingMessage: Message | null;
  setForwardingMessage: (msg: Message | null) => void;
  replyingTo: Message | null;
  setReplyingTo: (msg: Message | null) => void;
  editingMessage: Message | null;
  setEditingMessage: (msg: Message | null) => void;
  
  // Block state
  isBlocked: boolean;
  isBlockedByMe: boolean;
  partnerId: string | null;
  
  // View state
  viewMode: 'normal' | 'archived';
  setViewMode: (mode: 'normal' | 'archived') => void;

  // Actions - Conversation
  handleSelectConversation: (id: string) => void;
  handleBackToList: () => void;
  handlePin: (id: string, pinned: boolean) => Promise<void>;
  handleMute: (id: string, muted: boolean) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleArchive: (id: string, archived: boolean) => Promise<void>;
  handleMarkUnread: (id: string, markedUnread: boolean) => Promise<void>;
  
  // Actions - Message
  handleSendText: (text: string, mentions?: string[], replyToId?: string) => Promise<void>;
  handleForwardMessage: (message: Message) => void;
  handleSendImage: (file: File) => Promise<void>;
  handleSendFile: (file: File) => Promise<void>;
  handleSendVideo: (file: File) => Promise<void>;
  handleSendVoice: (file: File) => Promise<void>;
  handleEditMessage: (messageId: string, text: string) => Promise<void>;
  handleRecallMessage: (messageId: string) => Promise<void>;
  handleDeleteForMe: (messageId: string) => Promise<void>;
  handleTyping: (isTyping: boolean) => Promise<void>;
  
  // Actions - Search
  handleSearch: (term: string) => Promise<void>;
  setSearchFocused: (focused: boolean) => void;
  addToSearchHistory: (item: any) => void;
  removeFromSearchHistory: (id: string) => void;
  clearSearchHistory: () => void;
  getOrCreateConversation: (userId1: string, userId2: string) => Promise<string>;
  
  // Actions - Block
  handleToggleBlock: () => Promise<void>;
  
  // Actions - Group
  handleCreateGroup: (memberIds: string[], groupName: string, groupAvatar?: string) => Promise<void>;
  handleAddMembers: (userIds: string[]) => Promise<void>;
  handleRemoveMember: (userId: string) => Promise<void>;
  handleLeaveGroup: () => Promise<{ needAssignAdmin: boolean }>;
  handleAssignAdminAndLeave: (newAdminId: string) => Promise<void>;
  handlePromoteToAdmin: (userId: string) => Promise<void>;
  handleDemoteFromAdmin: (userId: string) => Promise<void>;
  handleEditGroup: (updates: { groupName?: string; groupAvatar?: string }) => Promise<void>;
  
  // Forward/Reply
  forwardMessage: (conversationId: string, message: Message) => Promise<void>;
  replyToMessage: (text: string, replyToId: string) => Promise<void>;

  // Utils
  getBlockedMessage: () => string | undefined;
}

export const useChat = (): UseChatReturn => {
  const { user: currentUser } = useAuthStore();
  const {
    conversations,
    selectedConversationId,
    messages,
    typingUsers,
    isLoading,
    subscribeToConversations,
    selectConversation,
    subscribeToMessages,
    sendTextMessage,
    sendImageMessage,
    sendFileMessage,
    sendVideoMessage,
    sendVoiceMessage,
    markAsRead,
    markAsDelivered,
    setTyping,
    subscribeToTyping,
    togglePin,
    toggleMute,
    toggleArchive,
    toggleMarkUnread,
    deleteConversation,
    searchConversations,
    isSearchFocused,
    searchResults,
    setSearchFocused,
    getOrCreateConversation,
    searchHistory,
    addToSearchHistory,
    removeFromSearchHistory,
    clearSearchHistory,
    createGroup,
    updateGroupInfo,
    addMember,
    removeMember,
    leaveGroup,
    promoteToAdmin,
    demoteFromAdmin,
    recallMessage,
    deleteMessageForMe,
    forwardMessage: storeForwardMessage,
    replyToMessage: storeReplyToMessage,
    editMessage
  } = useChatStore();

  const { users: usersMap, fetchUsers } = useUserCache();
  const [viewMode, setViewMode] = useState<'normal' | 'archived'>('normal');
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Subscribe conversations
  const handleSubscribeToConversations = useCallback(() => {
    if (!currentUser) return () => {};
    return subscribeToConversations(currentUser.id);
  }, [currentUser, subscribeToConversations]);

  useEffect(() => {
    const unsubscribe = handleSubscribeToConversations();
    return () => unsubscribe();
  }, [handleSubscribeToConversations]);

  // Subscribe messages & typing
  useEffect(() => {
    if (!selectedConversationId || !currentUser) return;

    const unsubscribeMessages = subscribeToMessages(selectedConversationId);
    const unsubscribeTyping = subscribeToTyping(selectedConversationId);
    markAsDelivered(selectedConversationId, currentUser.id);

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [selectedConversationId, currentUser, subscribeToMessages, subscribeToTyping, markAsDelivered]);

  // Auto mark as read
  useEffect(() => {
    if (!selectedConversationId || !currentUser) return;

    const currentMessages = messages[selectedConversationId] || [];
    if (currentMessages.length === 0) return;

    const hasUnread = currentMessages.some(m => 
      m.senderId !== currentUser.id && (!m.readBy || !m.readBy.includes(currentUser.id))
    );

    if (hasUnread) {
      markAsRead(selectedConversationId, currentUser.id);
    }
  }, [messages, selectedConversationId, currentUser, markAsRead]);

  // Auto fetch users
  useEffect(() => {
    if (!selectedConversationId || !currentUser) return;

    const currentMsgs = messages[selectedConversationId] || [];
    if (currentMsgs.length === 0) return;

    const userIds = [...new Set(currentMsgs.map(m => m.senderId))];
    const conv = conversations.find(c => c.id === selectedConversationId);
    
    if (conv) {
      conv.participants.forEach(p => userIds.push(p.id));
    }

    fetchUsers(userIds);
  }, [messages, selectedConversationId, currentUser, conversations, fetchUsers]);

  // Computed values
  const filteredConversations = conversations.filter(c => 
    viewMode === 'archived' ? c.archived : !c.archived
  );
  const archivedCount = conversations.filter(c => c.archived).length;
  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const currentMessages = selectedConversationId ? (messages[selectedConversationId] || []) : [];
  const currentTypingUsers = selectedConversationId ? (typingUsers[selectedConversationId] || []) : [];

  // Block state
  const partner = selectedConversation && !selectedConversation.isGroup
    ? selectedConversation.participants.find(p => p.id !== currentUser?.id)
    : null;
  const partnerId = partner?.id || null;
  const isBlockedByMe = partnerId ? currentUser?.blockedUserIds?.includes(partnerId) ?? false : false;
  const isBlockedByPartner = partner?.blockedUserIds?.includes(currentUser?.id || '') ?? false;
  const isBlocked = isBlockedByMe || isBlockedByPartner;

  const getBlockedMessage = (): string | undefined => {
    if (!selectedConversation?.isGroup && partnerId) {
      if (isBlockedByMe) return 'Bạn đã chặn người này. Bỏ chặn để gửi tin nhắn.';
      if (isBlockedByPartner) return 'Bạn không thể gửi tin nhắn cho người này.';
    }
    return undefined;
  };

  // Actions
  const handleSelectConversation = useCallback((id: string) => {
    selectConversation(id);
  }, [selectConversation]);

  const handleBackToList = useCallback(() => {
    selectConversation(null);
  }, [selectConversation]);

  const handleSendText = useCallback(async (text: string, mentions?: string[], replyToId?: string) => {
    if (!selectedConversationId || !currentUser) return;
    
    if (replyToId) {
      await storeReplyToMessage(selectedConversationId, currentUser.id, text, replyToId);
    } else {
      await sendTextMessage(selectedConversationId, currentUser.id, text, mentions);
    }
  }, [selectedConversationId, currentUser, sendTextMessage, storeReplyToMessage]);

  const handleEditMessage = useCallback(async (messageId: string, text: string) => {
    await editMessage(messageId, text);
  }, [editMessage]);

  const handleRecallMessage = useCallback(async (messageId: string) => {
    if (!selectedConversationId) return;
    await recallMessage(messageId, selectedConversationId);
  }, [selectedConversationId, recallMessage]);

  const handleDeleteForMe = useCallback(async (messageId: string) => {
    if (!currentUser) return;
    await deleteMessageForMe(messageId, currentUser.id);
  }, [currentUser, deleteMessageForMe]);

  const handleForwardMessage = useCallback((message: Message) => {
    setForwardingMessage(message);
  }, []);

  const handleSendImage = useCallback(async (file: File) => {
    if (!selectedConversationId || !currentUser) return;
    await sendImageMessage(selectedConversationId, currentUser.id, file);
  }, [selectedConversationId, currentUser, sendImageMessage]);

  const handleSendFile = useCallback(async (file: File) => {
    if (!selectedConversationId || !currentUser) return;
    await sendFileMessage(selectedConversationId, currentUser.id, file);
  }, [selectedConversationId, currentUser, sendFileMessage]);

  const handleSendVideo = useCallback(async (file: File) => {
    if (!selectedConversationId || !currentUser) return;
    await sendVideoMessage(selectedConversationId, currentUser.id, file);
  }, [selectedConversationId, currentUser, sendVideoMessage]);

  const handleSendVoice = useCallback(async (file: File) => {
    if (!selectedConversationId || !currentUser) return;
    await sendVoiceMessage(selectedConversationId, currentUser.id, file);
  }, [selectedConversationId, currentUser, sendVoiceMessage]);

  const handleTyping = useCallback(async (isTyping: boolean) => {
    if (!selectedConversationId || !currentUser) return;
    await setTyping(selectedConversationId, currentUser.id, isTyping);
  }, [selectedConversationId, currentUser, setTyping]);

  const handleSearch = useCallback(async (term: string) => {
    if (!currentUser) return;
    await searchConversations(currentUser.id, term);
  }, [currentUser, searchConversations]);

  const handlePin = useCallback(async (id: string, pinned: boolean) => {
    await togglePin(id, pinned);
  }, [togglePin]);

  const handleMute = useCallback(async (id: string, muted: boolean) => {
    await toggleMute(id, muted);
  }, [toggleMute]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteConversation(id);
  }, [deleteConversation]);

  const handleArchive = useCallback(async (id: string, archived: boolean) => {
    await toggleArchive(id, archived);
    if (archived && selectedConversationId === id) {
      selectConversation(null);
    }
  }, [toggleArchive, selectedConversationId, selectConversation]);

  const handleMarkUnread = useCallback(async (id: string, markedUnread: boolean) => {
    await toggleMarkUnread(id, markedUnread);
  }, [toggleMarkUnread]);

  const handleToggleBlock = useCallback(async () => {
    if (!partnerId || !currentUser) return;
    
    if (isBlockedByMe) {
      await userService.unblockUser(currentUser.id, partnerId);
    } else {
      await userService.blockUser(currentUser.id, partnerId);
      selectConversation(null);
    }
  }, [partnerId, currentUser, isBlockedByMe, selectConversation]);

  // Group actions
  const handleCreateGroup = useCallback(async (memberIds: string[], groupName: string, groupAvatar?: string) => {
    if (!currentUser) return;
    await createGroup(currentUser.id, memberIds, groupName, groupAvatar);
  }, [currentUser, createGroup]);

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
    if (!selectedConversationId || !currentUser) return { needAssignAdmin: false };
    
    const conv = conversations.find(c => c.id === selectedConversationId);
    
    // Trưởng nhóm rời đi -> yêu cầu chọn người mới
    if (conv?.isGroup && conv.creatorId === currentUser.id && conv.participantIds.length > 1) {
      return { needAssignAdmin: true };
    }

    await leaveGroup(selectedConversationId, currentUser.id);
    return { needAssignAdmin: false };
  }, [selectedConversationId, currentUser, conversations, leaveGroup]);

  const handleAssignAdminAndLeave = useCallback(async (newAdminId: string) => {
    if (!selectedConversationId || !currentUser) return;
    
    await promoteToAdmin(selectedConversationId, newAdminId);
    await leaveGroup(selectedConversationId, currentUser.id);
  }, [selectedConversationId, currentUser, promoteToAdmin, leaveGroup]);

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

  const forwardMessage = useCallback(async (conversationId: string, message: Message) => {
    if (!currentUser) return;
    await storeForwardMessage(conversationId, currentUser.id, message);
  }, [currentUser, storeForwardMessage]);

  const replyToMessage = useCallback(async (text: string, replyToId: string) => {
    if (!selectedConversationId || !currentUser) return;
    await storeReplyToMessage(selectedConversationId, currentUser.id, text, replyToId);
  }, [selectedConversationId, currentUser, storeReplyToMessage]);

  return {
    currentUser,
    conversations,
    filteredConversations,
    selectedConversation,
    currentMessages,
    currentTypingUsers,
    usersMap,
    archivedCount,
    isLoading,
    isSearchFocused,
    searchResults,
    searchHistory,
    isBlocked,
    isBlockedByMe,
    partnerId,
    viewMode,
    setViewMode,
    selectedConversationId,
    handleSelectConversation,
    handleBackToList,
    handlePin,
    handleMute,
    handleDelete,
    handleArchive,
    handleMarkUnread,
    handleSendText,
    handleSendImage,
    handleSendFile,
    handleSendVideo,
    handleSendVoice,
    handleEditMessage,
    handleRecallMessage,
    handleDeleteForMe,
    handleForwardMessage,
    handleTyping,
    handleSearch,
    setSearchFocused,
    addToSearchHistory,
    removeFromSearchHistory,
    clearSearchHistory,
    getOrCreateConversation,
    handleToggleBlock,
    handleCreateGroup,
    handleAddMembers,
    handleRemoveMember,
    handleLeaveGroup,
    handleAssignAdminAndLeave,
    handlePromoteToAdmin,
    handleDemoteFromAdmin,
    handleEditGroup,
    forwardMessage,
    replyToMessage,
    getBlockedMessage,
    blockedMessage: getBlockedMessage(),
    forwardingMessage,
    setForwardingMessage,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
  };
};
