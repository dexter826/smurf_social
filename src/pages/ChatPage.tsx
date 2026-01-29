import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useChat, useProfile } from '../hooks';
import { 
  ConversationList, ChatBox, ChatInput, ChatDetailsPanel, 
  CreateGroupModal, AddMemberModal, EditGroupModal, 
  TransferAdminModal, ForwardModal, MessengerSkeleton 
} from '../components/chat';

const ChatPage: React.FC = () => {
  const {
    currentUser,
    conversations,
    selectedConversationId,
    selectedConversation,
    currentMessages,
    currentTypingUsers,
    isLoading,
    isRevalidating,
    viewMode,
    setViewMode,
    isSearchFocused,
    setSearchFocused,
    searchResults,
    searchHistory,
    archivedCount,
    usersMap,
    isBlocked,
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
    handleToggleBlock,
    handleCreateGroup,
    handleAddMembers,
    handleRemoveMember,
    handleLeaveGroup,
    handleAssignAdminAndLeave,
    handlePromoteToAdmin,
    handleDemoteFromAdmin,
    handleEditGroup,
    addToSearchHistory,
    removeFromSearchHistory,
    clearSearchHistory,
    getOrCreateConversation,
    setIsChatVisible,
    isLoadingMore,
    hasMoreMessages,
    handleLoadMoreMessages
  } = useChat();

  React.useEffect(() => {
    setIsChatVisible(true);
    return () => setIsChatVisible(false);
  }, [setIsChatVisible]);

  const [showDetails, setShowDetails] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showAssignAdmin, setShowAssignAdmin] = useState(false);

  // Skeleton khi chưa tải xong user
  if (!currentUser) {
    return <MessengerSkeleton />;
  }

  const filteredConversations = conversations.filter(c => 
    viewMode === 'archived' ? c.archived : !c.archived
  );

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
          blockedUserIds={currentUser.blockedUserIds || []}
          isLoading={isLoading}
          isRevalidating={isRevalidating}
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
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              hasMoreMessages={hasMoreMessages}
              onLoadMore={handleLoadMoreMessages}
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
          onDelete={() => handleDelete(selectedConversation.id)}
          onLeaveGroup={() => {
            const result = handleLeaveGroup();
            if (result && 'then' in result) {
               result.then((res: any) => {
                 if (res?.needsAssignAdmin) setShowAssignAdmin(true);
               });
            } else if ((result as any)?.needsAssignAdmin) {
               setShowAssignAdmin(true);
            }
          }}
          onEditGroup={() => setShowEditGroup(true)}
          onAddMember={() => setShowAddMember(true)}
          onRemoveMember={handleRemoveMember}
          onPromoteToAdmin={handlePromoteToAdmin}
          onDemoteFromAdmin={handleDemoteFromAdmin}
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
