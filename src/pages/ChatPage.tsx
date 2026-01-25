import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services/userService';
import { User } from '../types';
import { ConversationList, ChatBox, ChatInput } from '../components/chat';
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
    markAsRead,
    setTyping,
    subscribeToTyping,
    togglePin,
    toggleMute,
    deleteConversation,
    searchConversations,
    deleteMessage
  } = useChatStore();

  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe conversations
    const unsubscribe = subscribeToConversations(currentUser.id);

    return () => {
      unsubscribe();
    };
  }, [currentUser, subscribeToConversations]);

  useEffect(() => {
    if (!selectedConversationId) return;

    // Subscribe messages
    const unsubscribeMessages = subscribeToMessages(selectedConversationId);
    
    // Subscribe typing
    const unsubscribeTyping = subscribeToTyping(selectedConversationId);

    // Mark as read
    if (currentUser) {
      markAsRead(selectedConversationId, currentUser.id);
    }

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [selectedConversationId, currentUser, subscribeToMessages, subscribeToTyping, markAsRead]);

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

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const currentMessages = selectedConversationId ? (messages[selectedConversationId] || []) : [];
  const currentTypingUsers = selectedConversationId ? (typingUsers[selectedConversationId] || []) : [];

  return (
    <div className="flex h-full w-full bg-white">
      {/* Conversation List - Sidebar */}
      <div className={`
        ${selectedConversationId ? 'hidden md:flex' : 'flex'}
        md:w-[360px] flex-shrink-0
      `}>
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversationId}
          currentUserId={currentUser.id}
          isLoading={isLoading}
          onSelectConversation={handleSelectConversation}
          onSearch={handleSearch}
          onPin={handlePin}
          onMute={handleMute}
          onDelete={handleDelete}
        />
      </div>

      {/* Chat Area - Main */}
      <div className={`
        flex-1 flex flex-col
        ${selectedConversationId ? 'flex' : 'hidden md:flex'}
      `}>
        {selectedConversation ? (
          <>
            <ChatBox
              conversation={selectedConversation}
              messages={currentMessages}
              currentUserId={currentUser.id}
              usersMap={usersMap}
              typingUsers={currentTypingUsers}
              onBack={handleBackToList}
            />
            <ChatInput
              onSendText={handleSendText}
              onSendImage={handleSendImage}
              onSendFile={handleSendFile}
              onTyping={handleTyping}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
            <div className="w-32 h-32 bg-primary-100 rounded-full flex items-center justify-center mb-6">
              <MessageSquare size={64} className="text-primary-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Tin nhắn của bạn
            </h2>
            <p className="text-gray-600 text-center max-w-sm">
              Chọn một cuộc trò chuyện để bắt đầu nhắn tin với bạn bè
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;