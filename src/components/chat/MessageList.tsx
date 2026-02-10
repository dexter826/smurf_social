import React, { useMemo } from 'react';
import { Message, User, Conversation } from '../../types';
import { UserAvatar } from '../ui';
import { MessageBubble } from './message/MessageBubble';
import { ImageGroupBubble } from './message/ImageGroupBubble';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  usersMap: Record<string, User>;
  conversation: Conversation;
  lastReadByMap: Record<string, User[]>;
  onRecall?: (messageId: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  chatName: string;
  avatarSrc?: string;
  partner?: User;
  isBlocked?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  usersMap,
  conversation,
  lastReadByMap,
  onRecall,
  onDeleteForMe,
  onForward,
  onReply,
  onEdit,
  chatName,
  avatarSrc,
  partner,
  isBlocked = false
}) => {
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
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

    processedMessages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt).toLocaleDateString('vi-VN');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  }, [messages, currentUserId]);

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

  if (groupedMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="mb-4">
          <UserAvatar
            userId={conversation.isGroup ? '' : partner?.id ?? ''}
            src={avatarSrc}
            name={chatName}
            size="xl"
            isGroup={conversation.isGroup}
            members={conversation.participants}
            initialStatus={partner?.status}
            showStatus={false}
          />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">{chatName}</h3>
        <p className="text-sm text-text-secondary">Bắt đầu cuộc trò chuyện</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex}>
          <div className="flex items-center justify-center my-4">
            <div className="bg-secondary text-text-secondary text-xs px-3 py-1 rounded-full">
              {group.date}
            </div>
          </div>

          <div className="space-y-1">
            {(() => {
              const renderedMessages: React.ReactNode[] = [];
              let i = 0;
              const dayMessages = group.messages;

              while (i < dayMessages.length) {
                const msg = dayMessages[i];
                const isMe = msg.senderId === currentUserId;
                if (msg.type === 'image' && !msg.isRecalled && !msg.replyToId) {
                  const imageGroup = [msg];
                  let j = i + 1;

                  while (j < dayMessages.length) {
                    const nextMsg = dayMessages[j];
                    const prevMsgInGroup = imageGroup[imageGroup.length - 1];
                    const nextMsgTime = new Date(nextMsg.createdAt).getTime();
                    const prevMsgTime = new Date(prevMsgInGroup.createdAt).getTime();
                    const timeDiff = nextMsgTime - prevMsgTime;
                    const MAX_GROUP_TIME = 60 * 1000;

                    if (
                      nextMsg.type === 'image' &&
                      nextMsg.senderId === msg.senderId &&
                      !nextMsg.isRecalled &&
                      !nextMsg.replyToId &&
                      !nextMsg.deletedBy?.includes(currentUserId) &&
                      timeDiff < MAX_GROUP_TIME
                    ) {
                      imageGroup.push(nextMsg);
                      j++;
                    } else {
                      break;
                    }
                  }

                  if (imageGroup.length > 1) {
                    const lastMsgInGroup = imageGroup[imageGroup.length - 1];
                    const showAvatar = shouldShowAvatar(lastMsgInGroup, j - 1, dayMessages);
                    const showName = shouldShowName(imageGroup[0], i, dayMessages);
                    const isLastMessage = lastMsgInGroup.id === messages[messages.length - 1]?.id;

                    renderedMessages.push(
                      <ImageGroupBubble
                        key={`group-${msg.id}`}
                        messages={imageGroup}
                        isMe={isMe}
                        sender={usersMap[msg.senderId]}
                        showAvatar={showAvatar}
                        showName={showName}
                        onRecall={onRecall}
                        onDeleteForMe={onDeleteForMe}
                        onForward={onForward}
                        onReply={onReply}
                        usersMap={usersMap}
                        isGroup={conversation.isGroup}
                        isLastMessage={isLastMessage}
                        lastReadByUsers={lastReadByMap[lastMsgInGroup.id]}
                        isBlocked={isBlocked}
                      />
                    );
                    i = j;
                    continue;
                  }
                }

                const sender = usersMap[msg.senderId];
                const showAvatar = shouldShowAvatar(msg, i, dayMessages);
                const showName = shouldShowName(msg, i, dayMessages);
                const isLastMessage = msg.id === messages[messages.length - 1]?.id;

                renderedMessages.push(
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
                    isBlocked={isBlocked}
                  />
                );
                i++;
              }
              return renderedMessages;
            })()}
          </div>
        </div>
      ))}
    </div>
  );
};
