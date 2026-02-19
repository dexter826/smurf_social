import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useChat } from '../hooks';
import { useLoadingStore } from '../store/loadingStore';
import { friendService } from '../services/friendService';
import {
  ConversationList, ChatBox, ChatInput, ChatDetailsPanel,
  CreateGroupModal, AddMemberModal, EditGroupModal,
  TransferAdminModal, ForwardModal, MessengerSkeleton
} from '../components/chat';
import { scrollToMessage } from '../utils';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    conversations,
    filteredConversations,
    selectedConversationId,
    selectedConversation,
    currentMessages,
    currentTypingUsers,
    isLoading,
    viewMode,
    setViewMode,
    isSearchFocused,
    setSearchFocused,
    searchResults,
    searchHistory,
    archivedCount,
    usersMap,
    isBlocked,
    isBlockedByMe,
    blockedMessage,
    forwardingMessage,
    setForwardingMessage,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,

    handleSelectConversation,
    handleSendText,
    handleEditMessage,
    handleRecallMessage,
    handleDeleteForMe,
    handleForwardMessage,
    handleSendImage,
    handleSendFile,
    handleSendVideo,
    handleSendVoice,
    handleTyping,
    handleSearch,
    handlePin,
    handleMute,
    handleArchive,
    handleMarkUnread,
    handleDelete,
    handleMarkAllRead,
    handleToggleBlock,
    handleCreateGroup,
    handleAddMembers,
    handleRemoveMember,
    handleLeaveGroup,
    handleAssignAdminAndLeave,
    handlePromoteToAdmin,
    handleDemoteFromAdmin,
    handleEditGroup,
    handleDisbandGroup,
    addToSearchHistory,
    removeFromSearchHistory,
    clearSearchHistory,
    getOrCreateConversation,
    setIsChatVisible,
    isLoadingMore,
    hasMoreMessages,
    handleLoadMoreMessages,
    friendRequestStatus,
    currentReceivedRequest,
    receivedRequests,
  } = useChat();
  const isSearching = useLoadingStore(state => state.loadingStates['contacts.search']);

  React.useEffect(() => {
    setIsChatVisible(true);
    return () => setIsChatVisible(false);
  }, [setIsChatVisible]);

  const [showDetails, setShowDetails] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showAssignAdmin, setShowAssignAdmin] = useState(false);

  if (!currentUser) {
    return <MessengerSkeleton />;
  }

  const handleSendFriendRequest = async (userId: string) => {
    try {
      await friendService.sendFriendRequest(currentUser.id, userId);
    } catch (error) {
      console.error('Lỗi gửi lời mời kết bạn:', error);
    }
  };

  const handleAcceptFriendRequest = async (userId: string) => {
    const request = receivedRequests.find(r => r.senderId === userId);
    if (request) {
      try {
        await friendService.acceptFriendRequest(request.id, currentUser.id, userId);
      } catch (error) {
        console.error('Lỗi chấp nhận kết bạn:', error);
      }
    }
  };

  const handleBackToList = () => {
    handleSelectConversation(null);
  };

  return (
    <div className="flex h-full w-full">
      {/* Sidebar danh sách hội thoại */}
      <div className={`${selectedConversationId ? 'hidden md:flex' : 'flex'} md:w-[320px] flex-shrink-0 w-full`}>
        <ConversationList
          conversations={filteredConversations}
          selectedId={selectedConversationId}
          currentUserId={currentUser.id}
          currentUserFriendIds={currentUser.friendIds || []}
          blockedUserIds={currentUser.blockedUserIds || []}
          isLoading={isLoading}
          isSearching={isSearching}
          viewMode={viewMode}
          archivedCount={archivedCount}
          onViewModeChange={setViewMode}
          onBlock={handleToggleBlock}
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
          onMarkAllRead={handleMarkAllRead}
          onNewGroup={() => setShowCreateGroup(true)}
        />
      </div>

      {/* Nội dung khung chat */}
      <div className={`flex-1 flex flex-col ${selectedConversationId ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            <ChatBox
              conversation={selectedConversation}
              messages={currentMessages}
              currentUserId={currentUser.id}
              currentUserFriendIds={currentUser.friendIds || []}
              friendRequestStatus={friendRequestStatus}
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
              onAddFriend={handleSendFriendRequest}
              onAcceptFriend={handleAcceptFriendRequest}
              onBlock={handleToggleBlock}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              hasMoreMessages={hasMoreMessages}
              onLoadMore={handleLoadMoreMessages}
              isBlocked={isBlocked}
              isBlockedByMe={isBlockedByMe}
              onUnblock={handleToggleBlock}
            />
            <ChatInput
              key={selectedConversationId}
              onSendText={handleSendText}
              onSendImage={handleSendImage}
              onSendFile={handleSendFile}
              onSendVideo={handleSendVideo}
              onSendVoice={handleSendVoice}
              onTyping={handleTyping}
              blockedMessage={blockedMessage}
              replyingTo={replyingTo}
              editingMessage={editingMessage}
              currentUserId={currentUser.id}
              usersMap={usersMap}
              participants={selectedConversation.participants}
              isGroup={selectedConversation.isGroup}
              onCancelAction={() => {
                setReplyingTo(null);
                setEditingMessage(null);
              }}
              onEditMessage={editingMessage ? (text) => handleEditMessage(editingMessage.id, text) : undefined}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-bg-secondary p-4 text-center">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-primary/10 rounded-full flex items-center justify-center animate-fade-in">
              <MessageSquare className="w-12 h-12 md:w-16 md:h-16 text-primary" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-2">
              Tin nhắn của bạn
            </h2>
            <p className="text-text-secondary text-center max-w-sm text-sm md:text-base leading-relaxed">
              Chọn một cuộc trò chuyện để bắt đầu nhắn tin với bạn bè ngay bây giờ!
            </p>
          </div>
        )}
      </div>

      {/* Thông tin chi tiết hội thoại */}
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
          onDelete={() => {
            if (selectedConversation.isGroup && selectedConversation.creatorId === currentUser.id) {
              handleDisbandGroup();
            } else {
              handleDelete(selectedConversation.id);
            }
          }}
          onLeaveGroup={() => {
            const result = handleLeaveGroup();
            if (result && 'then' in result) {
              (result as Promise<{ needAssignAdmin: boolean }>).then((res) => {
                if (res?.needAssignAdmin) setShowAssignAdmin(true);
              });
            }
          }}
          onEditGroup={() => setShowEditGroup(true)}
          onAddMember={() => setShowAddMember(true)}
          onRemoveMember={handleRemoveMember}
          onPromoteToAdmin={handlePromoteToAdmin}
          onDemoteFromAdmin={handleDemoteFromAdmin}
          onMemberClick={(userId) => navigate(`/profile/${userId}`)}
          onMessageClick={(messageId) => scrollToMessage(messageId)}
        />
      )}

      {/* Quản lý nhóm và chuyển tiếp tin nhắn */}
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
          currentUserId={currentUser.id}
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
