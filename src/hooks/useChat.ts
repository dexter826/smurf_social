import { useState, useEffect, useCallback, useMemo } from 'react';
import { Message, User, Conversation } from '../types';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useUserCache } from '../store/userCacheStore';
import { useChatActions } from './chat/useChatActions';
import { useChatMessages } from './chat/useChatMessages';
import { useChatBlock } from './chat/useChatBlock';
import { useChatGroups } from './chat/useChatGroups';

export const useChat = () => {
  const { user: currentUser } = useAuthStore();
  const {
    conversations,
    selectedConversationId,
    messages,
    typingUsers,
    isLoading,
    isRevalidating,
    selectConversation,
    subscribeToMessages,
    markAsRead,
    markAsDelivered,
    setTyping,
    subscribeToTyping,
    searchConversations,
    isSearchFocused,
    searchResults,
    setSearchFocused,
    getOrCreateConversation,
    searchHistory,
    addToSearchHistory,
    removeFromSearchHistory,
    clearSearchHistory,
    setIsChatVisible,
    isLoadingMore: storeIsLoadingMore,
    hasMoreMessages: storeHasMoreMessages,
    loadMoreMessages,
  } = useChatStore();

  const { users: usersMap, fetchUsers } = useUserCache();
  const [viewMode, setViewMode] = useState<'normal' | 'archived'>('normal');
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find(c => c.id === selectedConversationId),
    [conversations, selectedConversationId]
  );

  const filteredConversations = useMemo(() =>
    conversations.filter(c => {
      const isArchivedMatch = viewMode === 'archived' ? c.archived : !c.archived;
      return isArchivedMatch && !c.deletedBy?.includes(currentUser?.id || '');
    }),
    [conversations, viewMode, currentUser?.id]
  );

  const archivedCount = useMemo(
    () => conversations.filter(c => c.archived).length,
    [conversations]
  );

  const currentMessages = selectedConversationId ? (messages[selectedConversationId] || []) : [];
  const currentTypingUsers = selectedConversationId ? (typingUsers[selectedConversationId] || []) : [];
  const isLoadingMore = selectedConversationId ? (storeIsLoadingMore[selectedConversationId] || false) : false;
  const hasMoreMessages = selectedConversationId ? (storeHasMoreMessages[selectedConversationId] || false) : false;

  const partnerId = selectedConversation && !selectedConversation.isGroup
    ? selectedConversation.participants.find(p => p.id !== currentUser?.id)?.id ?? null
    : null;

  const partner = partnerId ? (usersMap[partnerId] ?? null) : null;

  // Sub-hooks composition
  const actions = useChatActions({
    selectedConversationId,
    currentUserId: currentUser?.id ?? null,
    selectConversation,
  });

  const chatMessages = useChatMessages({
    selectedConversationId,
    currentUserId: currentUser?.id ?? null,
  });

  const block = useChatBlock({
    partnerId,
    currentUser: currentUser ?? null,
    partner,
    isGroup: selectedConversation?.isGroup ?? false,
    usersMap,
  });

  const groups = useChatGroups({
    selectedConversationId,
    currentUserId: currentUser?.id ?? null,
    conversations,
  });

  // Đồng bộ tin nhắn và typing
  useEffect(() => {
    if (!selectedConversationId || !currentUser) return;
    const unsubMessages = subscribeToMessages(selectedConversationId);
    const unsubTyping = subscribeToTyping(selectedConversationId);
    markAsDelivered(selectedConversationId, currentUser.id);
    return () => { unsubMessages(); unsubTyping(); };
  }, [selectedConversationId, currentUser, subscribeToMessages, subscribeToTyping, markAsDelivered]);

  // Tự động đánh dấu đã đọc
  useEffect(() => {
    if (!selectedConversationId || !currentUser) return;
    const msgs = messages[selectedConversationId] || [];
    const hasUnread = msgs.some(m =>
      m.senderId !== currentUser.id && (!m.readBy || !m.readBy.includes(currentUser.id))
    );
    if (hasUnread) markAsRead(selectedConversationId, currentUser.id);
  }, [messages, selectedConversationId, currentUser, markAsRead]);

  // Tải thông tin user
  useEffect(() => {
    if (!selectedConversationId || !currentUser) return;
    const msgs = messages[selectedConversationId] || [];
    if (msgs.length === 0) return;
    const userIds = [...new Set(msgs.map(m => m.senderId))];
    const conv = conversations.find(c => c.id === selectedConversationId);
    if (conv) conv.participants.forEach(p => userIds.push(p.id));
    fetchUsers(userIds);
  }, [messages, selectedConversationId, currentUser, conversations, fetchUsers]);

  const handleSelectConversation = useCallback((id: string) => selectConversation(id), [selectConversation]);

  const handleLoadMoreMessages = useCallback(async () => {
    if (selectedConversationId) await loadMoreMessages(selectedConversationId);
  }, [selectedConversationId, loadMoreMessages]);

  const handleForwardMessage = useCallback((message: Message) => setForwardingMessage(message), []);

  const handleTyping = useCallback(async (isTyping: boolean) => {
    if (!selectedConversationId || !currentUser) return;
    await setTyping(selectedConversationId, currentUser.id, isTyping);
  }, [selectedConversationId, currentUser, setTyping]);

  const handleSearch = useCallback(async (term: string) => {
    if (!currentUser) return;
    await searchConversations(currentUser.id, term);
  }, [currentUser, searchConversations]);

  const handleToggleBlock = useCallback(async () => {
    block.handleToggleBlock(selectConversation);
  }, [block.handleToggleBlock, selectConversation]);

  return {
    currentUser,
    conversations,
    filteredConversations,
    selectedConversation,
    selectedConversationId,
    currentMessages,
    currentTypingUsers,
    usersMap,
    archivedCount,
    isLoading,
    isRevalidating,
    isLoadingMore,
    hasMoreMessages,
    isSearchFocused,
    searchResults,
    searchHistory: currentUser?.id ? (searchHistory[currentUser.id] || []) : [],
    viewMode,
    setViewMode,
    forwardingMessage,
    setForwardingMessage,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    handleSelectConversation,
    handleLoadMoreMessages,
    handleForwardMessage,
    handleTyping,
    handleSearch,
    handleToggleBlock,
    setSearchFocused,
    addToSearchHistory: (item: Conversation | User) => {
      if (currentUser?.id) addToSearchHistory(item, currentUser.id);
    },
    removeFromSearchHistory: (id: string) => {
      if (currentUser?.id) removeFromSearchHistory(id, currentUser.id);
    },
    clearSearchHistory: () => {
      if (currentUser?.id) clearSearchHistory(currentUser.id);
    },
    getOrCreateConversation,
    setIsChatVisible,

    // Block
    isBlocked: block.isBlocked,
    isBlockedByMe: block.isBlockedByMe,
    partnerId,
    blockedMessage: block.blockedMessage,
    getBlockedMessage: block.getBlockedMessage,

    // Actions
    ...actions,

    // Messages
    ...chatMessages,

    // Groups
    ...groups,
  };
};
