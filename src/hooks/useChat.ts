import { useState, useEffect, useCallback, useMemo } from 'react';
import { Message, User, Conversation, FriendStatus, FriendRequest } from '../types';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useContactStore } from '../store/contactStore';
import { useUserCache } from '../store/userCacheStore';
import { useLoadingStore } from '../store/loadingStore';
import { friendService } from '../services/friendService';
import { useChatActions } from './chat/useChatActions';
import { useChatMessages } from './chat/useChatMessages';
import { useChatBlock } from './chat/useChatBlock';
import { useChatGroups } from './chat/useChatGroups';

const EMPTY_MESSAGES: Message[] = [];
const EMPTY_TYPING: string[] = [];
const EMPTY_SEARCH_HISTORY: (Conversation | User)[] = [];

export const useChat = () => {
  const { user: currentUser } = useAuthStore();
  const {
    conversations,
    selectedConversationId,
    messages,
    typingUsers,
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
    loadMoreMessages,
  } = useChatStore();

  const { users: usersMap, fetchUsers } = useUserCache();
  const chatIsLoading = useLoadingStore(state => state.loadingStates['chat'] ?? false);
  const [viewMode, setViewMode] = useState<'normal' | 'archived'>('normal');
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);

  const selectedConversation = useMemo(
    () => conversations.find(c => c.id === selectedConversationId),
    [conversations, selectedConversationId]
  );

  const filteredConversations = useMemo(() =>
    conversations.filter(c => {
      const isArchived = c.archivedBy?.includes(currentUser?.id || '') || false;
      const isArchivedMatch = viewMode === 'archived' ? isArchived : !isArchived;
      return isArchivedMatch && !c.deletedBy?.includes(currentUser?.id || '');
    }),
    [conversations, viewMode, currentUser?.id]
  );

  const archivedCount = useMemo(
    () => conversations.filter(c => c.archivedBy?.includes(currentUser?.id || '')).length,
    [conversations]
  );

  const currentMessages = selectedConversationId ? (messages[selectedConversationId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES;
  const currentTypingUsers = selectedConversationId ? (typingUsers[selectedConversationId] ?? EMPTY_TYPING) : EMPTY_TYPING;

  const { isLoadingMore: storeIsLoadingMore, hasMoreMessages: storeHasMoreMessages } = useChatStore();
  const isLoadingMore = selectedConversationId ? (storeIsLoadingMore[selectedConversationId] || false) : false;
  const hasMoreMessages = selectedConversationId ? (storeHasMoreMessages[selectedConversationId] || false) : false;

  const partnerId = selectedConversation && !selectedConversation.isGroup
    ? selectedConversation.participants.find(p => p.id !== currentUser?.id)?.id ?? null
    : null;

  const partner = partnerId ? (usersMap[partnerId] ?? null) : null;

  // Subscribe friend requests để lấy pendingRequestId
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubSent = friendService.subscribeToSentRequests(currentUser.id, setSentRequests);
    const unsubReceived = friendService.subscribeToReceivedRequests(currentUser.id, setReceivedRequests);
    return () => { unsubSent(); unsubReceived(); };
  }, [currentUser?.id]);

  // Tính trạng thái bạn bè với partner từ contactStore
  const friendIds = useContactStore(state => state.friends.map(f => f.id));
  const partnerFriendStatus = useMemo(() => {
    if (!partnerId) return undefined;
    return friendIds.includes(partnerId) ? FriendStatus.FRIEND : undefined;
  }, [partnerId, friendIds]);

  // Tìm pending request ID giữa currentUser và partner
  const partnerPendingRequestId = useMemo(() => {
    if (!partnerId) return undefined;
    const sent = sentRequests.find(r => r.receiverId === partnerId);
    if (sent) return sent.id;
    const received = receivedRequests.find(r => r.senderId === partnerId);
    return received?.id;
  }, [partnerId, sentRequests, receivedRequests]);

  // Trạng thái lời mời kết bạn với partner (cho UI ChatBox)
  const friendRequestStatus = useMemo(() => {
    if (!partnerId) return 'none' as const;
    if (sentRequests.some(r => r.receiverId === partnerId)) return 'sent' as const;
    if (receivedRequests.some(r => r.senderId === partnerId)) return 'received' as const;
    return 'none' as const;
  }, [partnerId, sentRequests, receivedRequests]);

  // Lời mời kết bạn đang nhận từ partner
  const currentReceivedRequest = useMemo(() =>
    partnerId ? receivedRequests.find(r => r.senderId === partnerId) ?? null : null,
    [partnerId, receivedRequests]
  );

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
    friendStatus: partnerFriendStatus,
    pendingRequestId: partnerPendingRequestId,
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
    isLoading: chatIsLoading,
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

    // Friend requests
    friendRequestStatus,
    currentReceivedRequest,
    sentRequests,
    receivedRequests,

    // Actions
    ...actions,

    // Messages
    ...chatMessages,

    // Groups
    ...groups,
  };
};
