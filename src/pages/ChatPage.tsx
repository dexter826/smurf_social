import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services/userService';
import { User } from '../types';
import { ConversationList, ChatBox, ChatInput, ChatDetailsPanel } from '../components/chat';
import { Spinner } from '../components/ui';

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
    deleteMessage
  } = useChatStore();

  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'normal' | 'archived'>('normal');

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

  useEffect(() => {
    // Load user info cho messages
    loadUsersForMessages();
  }, [messages, selectedConversationId]);

  const loadUsersForMessages = async () => {
    if (!selectedConversationId || !currentUser) return;

    const currentMessages = messages[selectedConversationId] || [];
    if (currentMessages.length === 0) return;

    setLoadingUsers(true);
    try {
      const userIds = [...new Set(currentMessages.map(m => m.senderId))];
      const users: Record<string, User> = { ...usersMap };

      for (const userId of userIds) {
        if (!users[userId]) {
          const user = await userService.getUserById(userId);
          if (user) users[userId] = user;
        }
      }

      // Load participants
      const conv = conversations.find(c => c.id === selectedConversationId);
      if (conv) {
        conv.participants.forEach(p => {
          users[p.id] = p;
        });
      }

      setUsersMap(users);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
  };

  const handleSendText = async (text: string) => {
    if (!selectedConversationId || !currentUser) return;
    await sendTextMessage(selectedConversationId, currentUser.id, text);
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

  const handleDeleteMessage = async (messageId: string, fileUrl?: string) => {
    await deleteMessage(messageId, fileUrl);
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
          onSelectConversation={handleSelectConversation}
          onSearch={handleSearch}
          onPin={handlePin}
          onMute={handleMute}
          onArchive={handleArchive}
          onMarkUnread={handleMarkUnread}
          onDelete={handleDelete}
          onBlock={async (partnerId) => {
            await userService.blockUser(currentUser.id, partnerId);
          }}
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
            />
            <ChatInput
              key={selectedConversationId}
              onSendText={handleSendText}
              onSendImage={handleSendImage}
              onSendFile={handleSendFile}
              onSendVideo={handleSendVideo}
              onSendVoice={handleSendVoice}
              onTyping={handleTyping}
              blockedMessage={getBlockedMessage()}
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
        />
      )}
    </div>
  );
};

export default ChatPage;