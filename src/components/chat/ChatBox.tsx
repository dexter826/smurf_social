import React, { useMemo } from 'react';
import { Message, User, Conversation } from '../../types';
import { Loading } from '../ui';
import { ChatBoxSkeleton } from './ChatBoxSkeleton';
import { MessageRequestBanner } from './message/MessageRequestBanner';
import { useChatScroll } from '../../hooks/chat/useChatScroll';
import { ChatBoxHeader } from './ChatBoxHeader';
import { MessageList } from './MessageList';
import { TypingIndicator } from './TypingIndicator';

interface ChatBoxProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  currentUserFriendIds?: string[];
  friendRequestStatus?: 'none' | 'sent' | 'received';
  usersMap: Record<string, User>;
  typingUsers: string[];
  onBack?: () => void;
  onInfoClick?: () => void;
  onRecall?: (messageId: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onAddFriend?: (userId: string) => void;
  onAcceptFriend?: (userId: string) => void;
  onBlock?: (userId: string) => void;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
  onLoadMore?: () => void;
  isBlocked?: boolean;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  conversation,
  messages,
  currentUserId,
  currentUserFriendIds = [],
  friendRequestStatus = 'none',
  usersMap,
  typingUsers,
  onBack,
  onInfoClick,
  onRecall,
  onDeleteForMe,
  onForward,
  onReply,
  onEdit,
  onAddFriend,
  onAcceptFriend,
  onBlock,
  isLoading,
  isLoadingMore,
  hasMoreMessages,
  onLoadMore,
  isBlocked = false
}) => {
  const {
    messagesEndRef,
    messagesContainerRef,
    handleScroll
  } = useChatScroll({
    messages,
    conversationId: conversation.id,
    isLoading: !!isLoading,
    hasMoreMessages: !!hasMoreMessages,
    isLoadingMore: !!isLoadingMore,
    onLoadMore
  });

  const partner = useMemo(() => 
    conversation.isGroup ? null : conversation.participants.find(p => p.id !== currentUserId)
  , [conversation, currentUserId]);

  const chatName = conversation.isGroup ? conversation.groupName : partner?.name || 'Không rõ';
  const avatarSrc = conversation.isGroup ? conversation.groupAvatar : partner?.avatar;

  const isMessageRequest = useMemo(() => 
    !conversation.isGroup && partner && !currentUserFriendIds.includes(partner.id)
  , [conversation.isGroup, partner, currentUserFriendIds]);

  // Tính toán tin nhắn cuối cùng mỗi người đã đọc
  const lastReadByMap = useMemo(() => {
    const map: Record<string, User[]> = {};
    const reversed = [...messages].reverse();
    if (!conversation.isGroup && messages.length > 0) {
      const partnerId = conversation.participants.find(p => p.id !== currentUserId)?.id;
      const isFriend = partnerId && currentUserFriendIds.includes(partnerId);
      if (partnerId && isFriend) {
        const lastReadMsg = reversed.find(m => m.readBy?.includes(partnerId));
        if (lastReadMsg) {
          map[lastReadMsg.id] = [usersMap[partnerId]].filter(Boolean);
        }
      }
    } else if (conversation.isGroup) {
      conversation.participantIds.forEach(uid => {
        if (uid === currentUserId) return;
        const lastReadMsg = reversed.find(m => m.readBy?.includes(uid));
        if (lastReadMsg) {
          if (!map[lastReadMsg.id]) map[lastReadMsg.id] = [];
          if (usersMap[uid]) map[lastReadMsg.id].push(usersMap[uid]);
        }
      });

      Object.keys(map).forEach(msgId => {
        const msg = messages.find(m => m.id === msgId);
        if (msg?.readBy) {
          map[msgId].sort((a, b) => msg.readBy!.indexOf(a.id) - msg.readBy!.indexOf(b.id));
        }
      });
    }
    return map;
  }, [messages, conversation, usersMap, currentUserId, currentUserFriendIds]);

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-bg-secondary transition-theme">
      <ChatBoxHeader
        conversation={conversation}
        chatName={chatName}
        avatarSrc={avatarSrc}
        partner={partner || undefined}
        usersMap={usersMap}
        onBack={onBack}
        onInfoClick={onInfoClick}
      />

      {isMessageRequest && partner && onAddFriend && onBlock && (
        <MessageRequestBanner
          partnerName={partner.name || 'Người dùng'}
          friendRequestStatus={friendRequestStatus}
          onAddFriend={() => onAddFriend(partner.id)}
          onAcceptFriend={onAcceptFriend ? () => onAcceptFriend(partner.id) : undefined}
          onBlock={() => onBlock(partner.id)}
        />
      )}

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-0 bg-bg-secondary custom-scrollbar"
      >
        {isLoading ? (
          <ChatBoxSkeleton />
        ) : (
          <div className="space-y-4 px-4 py-4 min-h-full">
            {isLoadingMore && (
              <div className="flex justify-center py-2">
                <Loading size="sm" />
              </div>
            )}

            <MessageList
              messages={messages}
              currentUserId={currentUserId}
              usersMap={usersMap}
              conversation={conversation}
              lastReadByMap={lastReadByMap}
              onRecall={onRecall}
              onDeleteForMe={onDeleteForMe}
              onForward={onForward}
              onReply={onReply}
              onEdit={onEdit}
              chatName={chatName}
              avatarSrc={avatarSrc}
              partner={partner || undefined}
              isBlocked={isBlocked}
            />
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <TypingIndicator
        typingUsers={typingUsers}
        currentUserId={currentUserId}
        usersMap={usersMap}
      />
    </div>
  );
};
