import React, { useRef, useEffect } from 'react';
import { Phone, Video, Info, MoreVertical } from 'lucide-react';
import { Message, User, Conversation } from '../../types';
import { Avatar } from '../ui';
import { MessageBubble } from './MessageBubble';

interface ChatBoxProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  usersMap: Record<string, User>;
  typingUsers: string[];
  onBack?: () => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  conversation,
  messages,
  currentUserId,
  usersMap,
  typingUsers,
  onBack
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto scroll xuống khi có tin nhắn mới
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const partner = conversation.isGroup
    ? null
    : conversation.participants.find(p => p.id !== currentUserId);

  const chatName = conversation.isGroup
    ? conversation.groupName
    : partner?.name || 'Unknown';

  const avatar = conversation.isGroup
    ? conversation.groupAvatar
    : partner?.avatar;

  const isOnline = partner?.status === 'online';

  // Group messages theo ngày
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = '';

  messages.forEach((msg) => {
    const msgDate = new Date(msg.timestamp).toLocaleDateString('vi-VN');
    
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  // Kiểm tra xem có nên hiển thị avatar và tên
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

  const typingUsersNames = typingUsers
    .filter(uid => uid !== currentUserId)
    .map(uid => usersMap[uid]?.name || 'Ai đó')
    .join(', ');

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              ←
            </button>
          )}
          
          <div className="relative">
            <Avatar src={avatar} size="md" />
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{chatName}</h3>
            <p className="text-xs text-gray-500">
              {isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-full transition-colors">
            <Phone size={20} />
          </button>
          <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-full transition-colors">
            <Video size={20} />
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <Info size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50"
      >
        {groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <Avatar src={avatar} size="lg" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{chatName}</h3>
            <p className="text-sm text-gray-500">Bắt đầu cuộc trò chuyện</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date Separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {group.date}
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-1">
                  {group.messages.map((msg, msgIndex) => {
                    const sender = usersMap[msg.senderId];
                    const isMe = msg.senderId === currentUserId;
                    const showAvatar = shouldShowAvatar(msg, msgIndex, group.messages);
                    const showName = shouldShowName(msg, msgIndex, group.messages);

                    return (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        isMe={isMe}
                        sender={sender}
                        showAvatar={showAvatar}
                        showName={showName}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {typingUsersNames && (
              <div className="flex items-center gap-2 text-sm text-gray-500 ml-12">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>{typingUsersNames} đang nhập...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};
