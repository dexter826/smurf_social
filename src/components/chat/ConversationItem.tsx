import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { formatChatTime } from '../../utils/dateUtils';
import { Pin, Volume2, VolumeX, Trash2, MoreVertical, CheckCheck, Check, Ban, Archive, MailCheck, Mail } from 'lucide-react';
import { Conversation, User, UserStatus } from '../../types';
import { Dropdown, DropdownItem, ConfirmDialog, UserAvatar, Button, IconButton, Avatar } from '../ui';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  onClick: () => void;
  onPin?: () => void;
  onMute?: () => void;
  onDelete?: () => void;
  onBlock?: () => void;
  onArchive?: () => void;
  onMarkUnread?: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  currentUserId,
  onClick,
  onPin,
  onMute,
  onDelete,
  onBlock,
  onArchive,
  onMarkUnread
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  
  const partner = conversation.isGroup 
    ? null 
    : conversation.participants.find(p => p.id !== currentUserId);

  const isDataMissing = !conversation.isGroup && (!partner || !partner.name);

  if (isDataMissing) {
    return <ConversationItem.Skeleton />;
  }

  const chatName = conversation.isGroup 
    ? conversation.groupName || 'Nhóm chưa đặt tên' 
    : partner.name;

  const avatar = conversation.isGroup 
    ? conversation.groupAvatar 
    : partner?.avatar;

  const unreadCount = conversation.unreadCount?.[currentUserId] || 0;
  const isUnread = (unreadCount > 0 || conversation.markedUnread) && !isActive;
  
  const joinedAt = conversation.memberJoinedAt?.[currentUserId];
  const lastMessage = conversation.isGroup && joinedAt && conversation.lastMessage
    ? (new Date(conversation.lastMessage.timestamp) >= new Date(joinedAt) ? conversation.lastMessage : undefined)
    : conversation.lastMessage;

  const lastMessagePreview = lastMessage
    ? lastMessage.type === 'text'
      ? lastMessage.content.replace(/@\[([^\]]+)\]/g, '@$1')
      : lastMessage.content
    : 'Chưa có tin nhắn';

  const isLastMessageMine = lastMessage?.senderId === currentUserId;
  
  // Lấy danh sách những người đã xem tin nhắn cuối cùng (không bao gồm chính mình)
  const readers = (lastMessage?.readBy || [])
    .filter(uid => uid !== currentUserId)
    .map(uid => conversation.participants.find(p => p.id === uid))
    .filter((u): u is User => !!u);

  const isLastMessageRead = readers.length > 0;
  const isLastMessageDelivered = !!lastMessage?.deliveredAt;

  const displayTime = (!lastMessage && conversation.isGroup && joinedAt) 
    ? joinedAt 
    : conversation.updatedAt;

  const timeAgo = displayTime ? formatChatTime(displayTime) : '';

  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-center gap-3 p-3.5 mx-2.5 my-1.5 cursor-pointer transition-all duration-200 rounded-xl group
        hover:bg-bg-hover
        ${isActive ? 'bg-primary-light dark:bg-primary/20' : ''}
        ${conversation.pinned && !isActive ? 'bg-bg-secondary' : ''}
      `}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <UserAvatar 
          userId={conversation.isGroup ? '' : partner?.id} 
          src={avatar} 
          name={chatName} 
          size="md" 
          initialStatus={partner?.status}
          isGroup={conversation.isGroup}
          members={conversation.participants}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-sm truncate ${isUnread ? 'text-text-primary' : 'text-text-secondary'}`}>
              {chatName}
            </h3>
            {conversation.pinned && (
              <Pin size={14} className="text-primary flex-shrink-0" />
            )}
            {conversation.muted && (
              <VolumeX size={14} className="text-text-tertiary flex-shrink-0" />
            )}
          </div>
          <span className={`text-xs flex-shrink-0 ${isMenuOpen ? 'md:hidden' : 'md:group-hover:hidden'} ${isUnread ? 'font-semibold text-primary' : 'text-text-secondary'}`}>
            {timeAgo}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate flex-1 ${isUnread ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>
            {(() => {
              const typingUserIds = (conversation.typingUsers || []).filter(id => id !== currentUserId);
              
              if (typingUserIds.length > 0) {
                // Helper lấy tên
                const getLastName = (fullName?: string) => {
                  if (!fullName) return '';
                  const parts = fullName.trim().split(' ');
                  return parts[parts.length - 1];
                };

                let typingText = '';
                const typingUsers = typingUserIds.map(uid => conversation.participants.find(p => p.id === uid)).filter(Boolean);

                if (typingUsers.length === 1) {
                  const name = getLastName(typingUsers[0]?.name) || 'Ai đó';
                  typingText = `${name} đang soạn tin...`;
                } else if (typingUsers.length === 2) {
                  const name1 = getLastName(typingUsers[0]?.name) || 'Người dùng';
                  const name2 = getLastName(typingUsers[1]?.name) || 'người dùng';
                  typingText = `${name1} và ${name2} đang soạn tin...`;
                } else {
                   const name1 = getLastName(typingUsers[0]?.name) || 'Người dùng';
                   const others = typingUsers.length - 1;
                   typingText = `${name1} và ${others} người khác đang soạn tin...`;
                }

                return (
                  <span className="text-primary italic text-[13px] truncate block">
                    {typingText}
                  </span>
                );
              }

              return (
                <span className={`truncate text-[13px] ${isUnread ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>
                  {isLastMessageMine ? 'Bạn: ' : ''}{lastMessagePreview}
                </span>
              );
            })()}
          </p>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isLastMessageMine && !isUnread && (conversation.typingUsers || []).filter(id => id !== currentUserId).length === 0 && (
              <div className="flex items-center">
                {isLastMessageRead ? (
                  <div className="flex items-center gap-1">
                    <div className="flex -space-x-1">
                      {readers.slice(0, 3).map(user => (
                        <Avatar 
                          key={user.id}
                          src={user.avatar} 
                          name={user.name} 
                          size="2xs" 
                          className="ring-1 ring-bg-primary"
                        />
                      ))}
                    </div>
                    {readers.length > 3 && (
                      <span className="text-[9px] text-text-tertiary font-bold">
                        +{readers.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className={isLastMessageDelivered ? "text-primary" : "text-text-tertiary"}>
                    {isLastMessageDelivered ? <CheckCheck size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
                  </div>
                )}
              </div>
            )}
            
            {isUnread && unreadCount > 0 ? (
              <span className="flex-shrink-0 bg-red-500 text-white text-[10px] font-bold rounded-md min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                {unreadCount}
              </span>
            ) : isUnread && conversation.markedUnread ? (
              <span className="flex-shrink-0 bg-red-500 w-2.5 h-2.5 rounded-full" />
            ) : null}
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className={`md:absolute md:top-2 md:right-2 transition-opacity flex-shrink-0 ${isMenuOpen ? 'opacity-100 md:z-10' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
        <Dropdown
          isOpen={isMenuOpen}
          onOpenChange={setIsMenuOpen}
          disableTriggerScale
          trigger={
            <IconButton
              className={`opacity-100 md:opacity-0 md:group-hover:opacity-100 ${isMenuOpen ? 'opacity-100' : ''}`}
              icon={<MoreVertical size={16} />}
              size="sm"
            />
          }
        >
          {onPin && (
            <DropdownItem
              icon={<Pin size={16} />}
              label={conversation.pinned ? 'Bỏ ghim' : 'Ghim'}
              onClick={onPin}
            />
          )}
          {onMute && (
            <DropdownItem
              icon={conversation.muted ? <Volume2 size={16} /> : <VolumeX size={16} />}
              label={conversation.muted ? 'Bật thông báo' : 'Tắt thông báo'}
              onClick={onMute}
            />
          )}
          {onArchive && (
            <DropdownItem
              icon={<Archive size={16} />}
              label={conversation.archived ? 'Bỏ lưu trữ' : 'Lưu trữ'}
              onClick={onArchive}
            />
          )}
          {onMarkUnread && (
            <DropdownItem
              icon={conversation.markedUnread ? <MailCheck size={16} /> : <Mail size={16} />}
              label={conversation.markedUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
              onClick={onMarkUnread}
            />
          )}
          {onBlock && !conversation.isGroup && (
            <DropdownItem
              icon={<Ban size={16} />}
              label="Chặn"
              variant="danger"
              onClick={() => setShowBlockConfirm(true)}
            />
          )}
          {onDelete && (
            <DropdownItem
              icon={<Trash2 size={16} />}
              label="Xóa"
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
            />
          )}
        </Dropdown>
      </div>

      <ConfirmDialog
        isOpen={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        onConfirm={() => onBlock?.()}
        title="Chặn người dùng"
        message="Bạn có chắc chắn muốn chặn người này? Cả hai bên sẽ không thể nhắn tin cho nhau."
        confirmLabel="Chặn ngay"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDelete?.()}
        title="Xóa cuộc trò chuyện"
        message="Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa ngay"
        variant="danger"
      />
    </div>
  );
};

ConversationItem.Skeleton = () => (
  <div className="flex items-center gap-3 p-3.5 mx-2.5 my-1.5 rounded-xl animate-pulse">
    <div className="w-12 h-12 rounded-full bg-bg-tertiary flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="flex justify-between mb-2">
        <div className="h-4 bg-bg-tertiary rounded w-24" />
        <div className="h-3 bg-bg-tertiary rounded w-10" />
      </div>
      <div className="h-3 bg-bg-tertiary rounded w-40" />
    </div>
  </div>
);
