import React, { useRef, useEffect } from 'react';
import { Phone, Video, Info } from 'lucide-react';
import { Message, User, Conversation } from '../../types';
import { Avatar, UserAvatar, UserStatusText, IconButton, Skeleton, Button, Spinner } from '../ui';
import { ChatBoxSkeleton } from './ChatBoxSkeleton';
import { MessageBubble } from './MessageBubble';
import { UI_MESSAGES } from '../../constants/uiMessages';

interface ChatBoxProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  usersMap: Record<string, User>;
  typingUsers: string[];
  onBack?: () => void;
  onInfoClick?: () => void;
  onRecall?: (messageId: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
  onLoadMore?: () => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  conversation,
  messages,
  currentUserId,
  usersMap,
  typingUsers,
  onBack,
  onInfoClick,
  onRecall,
  onDeleteForMe,
  onForward,
  onReply,
  onEdit,
  isLoading,
  isLoadingMore,
  hasMoreMessages,
  onLoadMore
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);
  const prevMessagesLength = useRef(messages.length);
  const scrollHeightBeforeLoad = useRef(0);

  // Cuộn xuống cuối khi có tin nhắn mới (nếu đang ở gần cuối)
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
        // Nếu số lượng tin nhắn tăng lên và không phải do tải thêm (load more)
        const isNewMessage = messages[messages.length - 1]?.timestamp > messages[prevMessagesLength.current - 1]?.timestamp;
        
        if (isNewMessage && shouldAutoScroll) {
            messagesEndRef.current?.scrollIntoView();
        } else if (!isNewMessage) {
            if (messagesContainerRef.current) {
                const currentScrollHeight = messagesContainerRef.current.scrollHeight;
                messagesContainerRef.current.scrollTop = currentScrollHeight - scrollHeightBeforeLoad.current;
            }
        }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, shouldAutoScroll]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    
    // Kiểm tra xem có nên tự động cuộn không
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isAtBottom);

    // Trigger tải thêm khi cuộn lên gần đỉnh
    if (scrollTop < 50 && hasMoreMessages && !isLoadingMore && onLoadMore) {
      scrollHeightBeforeLoad.current = scrollHeight;
      onLoadMore();
    }
  };

  const partner = conversation.isGroup
    ? null
    : conversation.participants.find(p => p.id !== currentUserId);

  const chatName = conversation.isGroup
    ? conversation.groupName
    : partner?.name || UI_MESSAGES.COMMON.UNKNOWN;

  const avatarSrc = conversation.isGroup
    ? conversation.groupAvatar
    : partner?.avatar;

  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = '';

  const processedMessages = messages
    .filter(msg => !msg.deletedBy?.includes(currentUserId))
    .map(msg => {
      if (msg.replyToId) {
        const replyToMessage = messages.find(m => m.id === msg.replyToId);
        return { ...msg, replyToMessage };
      }
      return msg;
    });

  // Nhóm tin nhắn theo ngày
  processedMessages.forEach((msg) => {
    const msgDate = new Date(msg.timestamp).toLocaleDateString('vi-VN');
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  const shouldShowAvatar = (msg: Message, index: number, dayMessages: Message[]): boolean => {
    if (msg.senderId === currentUserId) return false;
    if (index === dayMessages.length - 1) return true;
    const nextMsg = dayMessages[index + 1];
    return nextMsg.senderId !== msg.senderId;
  };

  const shouldShowName = (msg: Message, index: number, dayMessages: Message[]): boolean => {
    if (!conversation.isGroup) return false;
    if (msg.senderId === currentUserId) return false;
    if (index === 0) return true;
    const prevMsg = dayMessages[index - 1];
    return prevMsg.senderId !== msg.senderId;
  };

  // Tính toán tin nhắn cuối cùng mỗi người đã đọc
  const lastReadByMap = React.useMemo(() => {
    const map: Record<string, User[]> = {};
    if (!conversation.isGroup && messages.length > 0) {
        // Chat đơn: chỉ quan tâm người kia đã xem tin cuối cùng chưa
        const partnerId = conversation.participants.find(p => p.id !== currentUserId)?.id;
        if (partnerId) {
            const lastReadMsg = [...messages].reverse().find(m => m.readBy?.includes(partnerId));
            if (lastReadMsg) {
                map[lastReadMsg.id] = [usersMap[partnerId]].filter(Boolean);
            }
        }
    } else if (conversation.isGroup) {
        // Group chat: tìm tin nhắn cuối cùng mỗi thành viên đã đọc
        conversation.participantIds.forEach(uid => {
            if (uid === currentUserId) return;
            const lastReadMsg = [...messages].reverse().find(m => m.readBy?.includes(uid));
            if (lastReadMsg) {
                if (!map[lastReadMsg.id]) map[lastReadMsg.id] = [];
                if (usersMap[uid]) {
                    // Để đảm bảo thứ tự "sớm nhất", chúng ta sẽ dựa vào vị trí của uid trong mảng readBy của tin nhắn đó
                    map[lastReadMsg.id].push(usersMap[uid]);
                }
            }
        });

        // Sắp xếp lại User trong mỗi tin nhắn theo thứ tự họ xuất hiện trong readBy (người xem sớm nhất đứng trước)
        Object.keys(map).forEach(msgId => {
            const msg = messages.find(m => m.id === msgId);
            if (msg?.readBy) {
                map[msgId].sort((a, b) => {
                    const idxA = msg.readBy!.indexOf(a.id);
                    const idxB = msg.readBy!.indexOf(b.id);
                    return idxA - idxB;
                });
            }
        });
    }
    return map;
  }, [messages, conversation, usersMap, currentUserId]);

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-bg-secondary transition-theme">
      {/* Header chat */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 h-[72px] border-b border-border-light bg-bg-primary">
        <div className="flex items-center gap-3 flex-1">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="md:hidden"
            >
                ←
            </Button>
          )}
          
          {conversation.isGroup ? (
            <Avatar 
              src={avatarSrc} 
              name={chatName} 
              size="md" 
              isGroup 
              members={conversation.participants} 
            />
          ) : (
            <UserAvatar userId={partner?.id!} src={avatarSrc} name={chatName} size="md" initialStatus={partner?.status} showStatus={false} />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-text-primary truncate">{chatName}</h2>
            {!conversation.isGroup && (
              <UserStatusText userId={partner?.id!} className="text-xs text-text-tertiary" initialStatus={partner?.status} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <IconButton onClick={() => {}} title={UI_MESSAGES.CHAT.AUDIO_CALL} variant="primary" icon={<Phone size={20} />} size="lg" />
          <IconButton onClick={() => {}} title={UI_MESSAGES.CHAT.VIDEO_CALL} variant="primary" icon={<Video size={20} />} size="lg" />
          <IconButton onClick={onInfoClick} title={UI_MESSAGES.CHAT.CONVERSATION_INFO} icon={<Info size={20} />} size="lg" />
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-0 bg-bg-secondary"
      >
        {isLoading ? (
          <ChatBoxSkeleton />
        ) : (
          <div className="space-y-4 px-4 py-4 min-h-full">
            {isLoadingMore && (
              <div className="flex justify-center py-2">
                <Spinner size="sm" />
              </div>
            )}
            
            {groupedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
                  <Avatar 
                    src={avatarSrc} 
                    size="lg" 
                    isGroup={conversation.isGroup} 
                    members={conversation.participants} 
                  />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{chatName}</h3>
                <p className="text-sm text-text-secondary">{UI_MESSAGES.CHAT.START_CONVERSATION}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedMessages.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-secondary text-text-secondary text-xs px-3 py-1 rounded-full">
                        {group.date}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {group.messages.map((msg, msgIndex) => {
                        const sender = usersMap[msg.senderId];
                        const isMe = msg.senderId === currentUserId;
                        const showAvatar = shouldShowAvatar(msg, msgIndex, group.messages);
                        const showName = shouldShowName(msg, msgIndex, group.messages);
                        const isLastMessage = msg.id === messages[messages.length - 1]?.id;

                        return (
                          <MessageBubble
                            key={msg.id}
                            message={msg}
                            isMe={isMe}
                            sender={sender}
                            showAvatar={showAvatar}
                            showName={showName}
                            isLastMessage={isLastMessage}
                            lastReadByUsers={lastReadByMap[msg.id]}
                            onRecall={onRecall}
                            onDeleteForMe={onDeleteForMe}
                            onForward={onForward}
                            onReply={onReply}
                            onEdit={onEdit}
                            currentUserId={currentUserId}
                            usersMap={usersMap}
                            isGroup={conversation.isGroup}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        )}
      </div>

      {typingUsers.filter(uid => uid !== currentUserId).length > 0 && (
        <div className="absolute bottom-2 left-4 z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="text-xs text-text-tertiary italic">{UI_MESSAGES.COMMON.TYPING}</span>
        </div>
      )}
    </div>
  );
};
