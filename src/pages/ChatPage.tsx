import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useUserCache } from '../store/userCacheStore';
import { userService } from '../services/userService';
import { Conversation, User, Message } from '../types';
import { ConversationList, ChatBox, ChatInput, ChatDetailsPanel, CreateGroupModal, AddMemberModal, EditGroupModal, TransferAdminModal, ForwardModal } from '../components/chat';
import { Spinner } from '../components/ui';
import { toast } from '../store/toastStore';

const ChatPage: React.FC = () => {
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
    forwardMessage,
    replyToMessage,
    editMessage
  } = useChatStore();

  const [showDetails, setShowDetails] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [viewMode, setViewMode] = useState<'normal' | 'archived'>('normal');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showAssignAdmin, setShowAssignAdmin] = useState(false);
  const { users: usersMap, fetchUsers } = useUserCache();

  // Stable callbacks
  const handleSubscribeToConversations = useCallback(() => {
    if (!currentUser) return () => {};
    return subscribeToConversations(currentUser.id);
  }, [currentUser, subscribeToConversations]);

  // Subscribe to conversations
  useEffect(() => {
    const unsubscribe = handleSubscribeToConversations();
    return () => unsubscribe();
  }, [handleSubscribeToConversations]);

  // Subscribe messages & typing is handled here
  useEffect(() => {
    if (!selectedConversationId || !currentUser) return;

    // Subscribe messages
    const unsubscribeMessages = subscribeToMessages(selectedConversationId);
    
    // Subscribe typing
    const unsubscribeTyping = subscribeToTyping(selectedConversationId);

    // Đánh dấu đã nhận (delivered) khi vào cuộc trò chuyện
    markAsDelivered(selectedConversationId, currentUser.id);

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [selectedConversationId, currentUser, subscribeToMessages, subscribeToTyping, markAsDelivered]);

  // Tự động đánh dấu đã đọc khi có tin nhắn mới
  useEffect(() => {
    if (!selectedConversationId || !currentUser) return;

    const currentMessages = messages[selectedConversationId] || [];
    if (currentMessages.length === 0) return;

    // Kiểm tra có tin nhắn chưa đọc từ người khác không
    const hasUnread = currentMessages.some(m => 
      m.senderId !== currentUser.id && (!m.readBy || !m.readBy.includes(currentUser.id))
    );

    if (hasUnread) {
      markAsRead(selectedConversationId, currentUser.id);
    }
  }, [messages, selectedConversationId, currentUser, markAsRead]);

  // Tự động load users cho messages
  useEffect(() => {
    if (!selectedConversationId || !currentUser) return;

    const currentMessages = messages[selectedConversationId] || [];
    if (currentMessages.length === 0) return;

    const userIds = [...new Set(currentMessages.map(m => m.senderId))];
    const conv = conversations.find(c => c.id === selectedConversationId);
    
    if (conv) {
      conv.participants.forEach(p => userIds.push(p.id));
    }

    fetchUsers(userIds);
  }, [messages, selectedConversationId, currentUser, conversations, fetchUsers]);

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
  };

  const handleSendText = async (text: string) => {
    if (!selectedConversationId || !currentUser) return;
    
    if (replyingTo) {
      await replyToMessage(selectedConversationId, currentUser.id, text, replyingTo.id);
      setReplyingTo(null);
    } else {
      await sendTextMessage(selectedConversationId, currentUser.id, text);
    }
  };

  const handleEditMessage = async (text: string) => {
    if (!editingMessage) return;
    await editMessage(editingMessage.id, text);
    setEditingMessage(null);
  };

  const handleRecallMessage = async (messageId: string) => {
    if (!selectedConversationId) return;
    await recallMessage(messageId, selectedConversationId);
  };

  const handleDeleteForMe = async (messageId: string) => {
    if (!currentUser) return;
    await deleteMessageForMe(messageId, currentUser.id);
  };

  const handleForwardMessage = async (message: Message) => {
    setForwardingMessage(message);
  };

  const handleSendImage = async (file: File) => {
    if (!selectedConversationId || !currentUser) return;
    await sendImageMessage(selectedConversationId, currentUser.id, file);
  };

  const handleSendFile = async (file: File) => {
    if (!selectedConversationId || !currentUser) return;
    await sendFileMessage(selectedConversationId, currentUser.id, file);
  };

  const handleSendVideo = async (file: File) => {
    if (!selectedConversationId || !currentUser) return;
    await sendVideoMessage(selectedConversationId, currentUser.id, file);
  };

  const handleSendVoice = async (file: File) => {
    if (!selectedConversationId || !currentUser) return;
    await sendVoiceMessage(selectedConversationId, currentUser.id, file);
  };

  const handleTyping = async (isTyping: boolean) => {
    if (!selectedConversationId || !currentUser) return;
    await setTyping(selectedConversationId, currentUser.id, isTyping);
  };

  const handleSearch = async (term: string) => {
    if (!currentUser) return;
    await searchConversations(currentUser.id, term);
  };

  const handlePin = async (id: string, pinned: boolean) => {
    await togglePin(id, pinned);
  };

  const handleMute = async (id: string, muted: boolean) => {
    await toggleMute(id, muted);
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
  };

  const handleArchive = async (id: string, archived: boolean) => {
    await toggleArchive(id, archived);
    if (archived && selectedConversationId === id) {
      selectConversation(null);
    }
  };

  const handleMarkUnread = async (id: string, markedUnread: boolean) => {
    await toggleMarkUnread(id, markedUnread);
  };



  const handleBackToList = () => {
    selectConversation(null);
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  const filteredConversations = conversations.filter(c => 
    viewMode === 'archived' ? c.archived : !c.archived
  );
  const archivedCount = conversations.filter(c => c.archived).length;
  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const currentMessages = selectedConversationId ? (messages[selectedConversationId] || []) : [];
  const currentTypingUsers = selectedConversationId ? (typingUsers[selectedConversationId] || []) : [];

  // Tính toán trạng thái chặn dựa trên partner
  const partner = selectedConversation && !selectedConversation.isGroup
    ? selectedConversation.participants.find(p => p.id !== currentUser.id)
    : null;
  const partnerId = partner?.id || null;
  
  // Kiểm tra chặn 2 chiều
  const isBlockedByMe = partnerId ? currentUser.blockedUserIds?.includes(partnerId) : false;
  const isBlockedByPartner = partner?.blockedUserIds?.includes(currentUser.id) ?? false;
  const isBlocked = isBlockedByMe || isBlockedByPartner;
  
  // Tính toán thông báo chặn
  const getBlockedMessage = (): string | undefined => {
    if (!selectedConversation?.isGroup && partnerId) {
      if (isBlockedByMe) return 'Bạn đã chặn người này. Bỏ chặn để gửi tin nhắn.';
      if (isBlockedByPartner) return 'Bạn không thể gửi tin nhắn cho người này.';
    }
    return undefined;
  };

  const handleToggleBlock = async () => {
    if (!partnerId) return;
    
    if (isBlockedByMe) {
      await userService.unblockUser(currentUser.id, partnerId);
    } else {
      await userService.blockUser(currentUser.id, partnerId);
      setShowDetails(false);
      selectConversation(null);
    }
  };

  // ========== GROUP MANAGEMENT HANDLERS ==========
  const handleCreateGroup = async (memberIds: string[], groupName: string, groupAvatar?: string) => {
    if (!currentUser) return;
    await createGroup(currentUser.id, memberIds, groupName, groupAvatar);
    setShowCreateGroup(false);
  };

  const handleAddMembers = async (userIds: string[]) => {
    if (!selectedConversationId) return;
    for (const userId of userIds) {
      await addMember(selectedConversationId, userId);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedConversationId) return;
    await removeMember(selectedConversationId, userId);
  };

  const handleLeaveGroup = async () => {
    if (!selectedConversationId || !currentUser) return;
    const conv = conversations.find(c => c.id === selectedConversationId);
    
    // Nếu là trưởng nhóm và còn thành viên khác -> yêu cầu chọn người kế nhiệm
    if (conv?.isGroup && conv.creatorId === currentUser.id && conv.participantIds.length > 1) {
      setShowAssignAdmin(true);
      return;
    }

    await leaveGroup(selectedConversationId, currentUser.id);
    setShowDetails(false);
  };

  const handleAssignAdminAndLeave = async (newAdminId: string) => {
    if (!selectedConversationId || !currentUser) return;
    
    // 1. Thăng admin mới
    await promoteToAdmin(selectedConversationId, newAdminId);
    
    // 2. Chuyển quyền creator (Hàm leaveGroup trong service đã có logic chuyển creatorId 
    // nếu currentUser.id === creatorId dựa trên adminIds[0])
    // Tuy nhiên để chắc chắn, ta thực hiện thăng admin trước
    
    // 3. Rời nhóm
    await leaveGroup(selectedConversationId, currentUser.id);
    setShowAssignAdmin(false);
    setShowDetails(false);
  };

  const handlePromoteToAdmin = async (userId: string) => {
    if (!selectedConversationId) return;
    await promoteToAdmin(selectedConversationId, userId);
  };

  const handleDemoteFromAdmin = async (userId: string) => {
    if (!selectedConversationId) return;
    await demoteFromAdmin(selectedConversationId, userId);
  };

  const handleEditGroup = async (updates: { groupName?: string; groupAvatar?: string }) => {
    if (!selectedConversationId) return;
    await updateGroupInfo(selectedConversationId, updates);
  };

  return (
    <div className="flex h-full w-full">
      {/* Conversation List - Sidebar */}
      <div className={`${selectedConversationId ? 'hidden md:flex' : 'flex'} md:w-[320px] flex-shrink-0 w-full`}>
        <ConversationList
          conversations={filteredConversations}
          selectedId={selectedConversationId}
          currentUserId={currentUser.id}
          blockedUserIds={currentUser.blockedUserIds || []}
          isLoading={isLoading}
          viewMode={viewMode}
          archivedCount={archivedCount}
          onViewModeChange={setViewMode}
          onBlock={async (partnerId) => {
            await userService.blockUser(currentUser.id, partnerId);
          }}
          isSearchFocused={isSearchFocused}
          onSearchFocus={setSearchFocused}
          searchResults={searchResults}
          searchHistory={searchHistory}
          onRemoveFromHistory={removeFromSearchHistory}
          onClearHistory={clearSearchHistory}
          onSelectUser={async (user) => {
            addToSearchHistory(user);
            const convId = await getOrCreateConversation(currentUser.id, user.id);
            handleSelectConversation(convId);
            setSearchFocused(false);
          }}
          onSelectConversation={(id) => {
            const conv = conversations.find(c => c.id === id);
            if (conv) addToSearchHistory(conv);
            handleSelectConversation(id);
            setSearchFocused(false);
          }}
          onSearch={handleSearch}
          onPin={handlePin}
          onMute={handleMute}
          onArchive={handleArchive}
          onMarkUnread={handleMarkUnread}
          onDelete={handleDelete}
          onNewGroup={() => setShowCreateGroup(true)}
        />
      </div>

      {/* Chat Area - Main */}
      <div className={`flex-1 flex flex-col ${selectedConversationId ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            <ChatBox
              conversation={selectedConversation}
              messages={currentMessages}
              currentUserId={currentUser.id}
              usersMap={usersMap}
              typingUsers={currentTypingUsers}
              onBack={handleBackToList}
              onInfoClick={() => setShowDetails(true)}
              onRecall={handleRecallMessage}
              onDeleteForMe={handleDeleteForMe}
              onForward={handleForwardMessage}
              onReply={(msg) => {
                setReplyingTo(msg);
                setEditingMessage(null);
              }}
              onEdit={(msg) => {
                setEditingMessage(msg);
                setReplyingTo(null);
              }}

            />
            <ChatInput
              key={`${selectedConversationId}-${editingMessage?.id || 'new'}`}
              onSendText={handleSendText}
              onSendImage={handleSendImage}
              onSendFile={handleSendFile}
              onSendVideo={handleSendVideo}
              onSendVoice={handleSendVoice}
              onTyping={handleTyping}
              blockedMessage={getBlockedMessage()}
              replyingTo={replyingTo}
              editingMessage={editingMessage}
              currentUserId={currentUser.id}
              usersMap={usersMap}
              onCancelAction={() => {
                setReplyingTo(null);
                setEditingMessage(null);
              }}
              onEditMessage={handleEditMessage}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-secondary">
            <div className="w-32 h-32 bg-primary-100 rounded-full flex items-center justify-center mb-6">
              <MessageSquare size={64} className="text-primary-500" />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-2">
              Tin nhắn của bạn
            </h2>
            <p className="text-secondary text-center max-w-sm">
              Chọn một cuộc trò chuyện để bắt đầu nhắn tin với bạn bè
            </p>
          </div>
        )}
      </div>

      {/* Chat Details Panel */}
      {selectedConversation && (
        <ChatDetailsPanel
          conversation={selectedConversation}
          messages={currentMessages}
          currentUserId={currentUser.id}
          usersMap={usersMap}
          isOpen={showDetails}
          isBlocked={isBlocked}
          onClose={() => setShowDetails(false)}
          onToggleMute={() => handleMute(selectedConversation.id, !selectedConversation.muted)}
          onTogglePin={() => handlePin(selectedConversation.id, !selectedConversation.pinned)}
          onToggleBlock={handleToggleBlock}
          onDelete={() => handleDelete(selectedConversation.id)}
          onLeaveGroup={handleLeaveGroup}
          onEditGroup={() => setShowEditGroup(true)}
          onAddMember={() => setShowAddMember(true)}
          onRemoveMember={handleRemoveMember}
          onPromoteToAdmin={handlePromoteToAdmin}
          onDemoteFromAdmin={handleDemoteFromAdmin}
        />
      )}

      {/* Modals */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        currentUserId={currentUser.id}
        onClose={() => setShowCreateGroup(false)}
        onCreateGroup={handleCreateGroup}
      />

      {selectedConversation && (
        <AddMemberModal
          isOpen={showAddMember}
          conversation={selectedConversation}
          currentUserId={currentUser.id}
          onClose={() => setShowAddMember(false)}
          onAddMembers={handleAddMembers}
        />
      )}

      {selectedConversation && selectedConversation.isGroup && (
        <EditGroupModal
          isOpen={showEditGroup}
          conversation={selectedConversation}
          onClose={() => setShowEditGroup(false)}
          onSave={handleEditGroup}
        />
      )}

      {selectedConversation && selectedConversation.isGroup && (
        <TransferAdminModal
          isOpen={showAssignAdmin}
          conversation={selectedConversation}
          currentUserId={currentUser.id}
          onClose={() => setShowAssignAdmin(false)}
          onConfirm={handleAssignAdminAndLeave}
        />
      )}

      <ForwardModal
        isOpen={!!forwardingMessage}
        onClose={() => setForwardingMessage(null)}
        message={forwardingMessage}
        currentUserId={currentUser.id}
        conversations={conversations}
        usersMap={usersMap}
      />
    </div>
  );
};

export default ChatPage;