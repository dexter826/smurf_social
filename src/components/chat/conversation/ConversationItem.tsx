import React, { useState } from 'react';
import { Pin, VolumeX, Trash2, MoreVertical, Ban, Archive, MailCheck, Mail, Volume2 } from 'lucide-react';
import { Conversation, UserStatus } from '../../../types';
import { Dropdown, DropdownItem, ConfirmDialog, UserAvatar, IconButton, Avatar, BannedBadge } from '../../ui';
import { useConversationItem } from '../../../hooks/chat/useConversationItem';
import { MessageStatus } from '../message/MessageStatus';
import { CONFIRM_MESSAGES } from '../../../constants/confirmMessages';

const ConversationItemSkeleton: React.FC = () => (
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

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  currentUserFriendIds?: string[];
  showMessageRequestBadge?: boolean;
  onClick: () => void;
  onPin?: () => void;
  onMute?: () => void;
  onDelete?: () => void;
  onBlock?: () => void;
  onArchive?: () => void;
  onMarkUnread?: () => void;
}

const ConversationItemInner: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  currentUserId,
  currentUserFriendIds = [],
  showMessageRequestBadge = false,
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

  const {
    partner,
    isDataMissing,
    chatInfo,
    isMessageRequest,
    isUnread,
    unreadCount,
    lastMessagePreview,
    isLastMessageMine,
    typingText,
    readers,
    isLastMessageRead,
    isLastMessageDelivered,
    displayTime
  } = useConversationItem({
    conversation,
    currentUserId,
    isActive,
    currentUserFriendIds
  });

  if (isDataMissing) {
    return <ConversationItemSkeleton />;
  }

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
      <div className="relative flex-shrink-0">
        <UserAvatar 
          userId={conversation.isGroup ? '' : partner?.id} 
          src={chatInfo.avatar} 
          name={chatInfo.name} 
          size="md" 
          initialStatus={chatInfo.status}
          isGroup={conversation.isGroup}
          members={conversation.participants}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-sm truncate ${isUnread ? 'text-text-primary' : 'text-text-secondary'}`}>
              {chatInfo.name}
            </h3>
            {!conversation.isGroup && partner?.status === UserStatus.BANNED && <BannedBadge size="sm" />}
            {showMessageRequestBadge && isMessageRequest && (
              <span className="text-[10px] text-warning bg-warning-light px-1.5 py-0.5 rounded-full border border-warning/30 flex-shrink-0">
                Tin nhắn chờ
              </span>
            )}
            {conversation.pinned && (
              <Pin size={14} className="text-primary flex-shrink-0" />
            )}
            {conversation.muted && (
              <VolumeX size={14} className="text-text-tertiary flex-shrink-0" />
            )}
          </div>
          <span className={`text-xs flex-shrink-0 ${isMenuOpen ? 'md:hidden' : 'md:group-hover:hidden'} ${isUnread ? 'font-semibold text-primary' : 'text-text-secondary'}`}>
            {displayTime}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className={`text-sm truncate flex-1 ${isUnread ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>
            {typingText ? (
              <span className="text-primary italic text-[13px] truncate block">
                {typingText}
              </span>
            ) : (
              <span className={`truncate text-[13px] ${isUnread ? 'font-bold text-text-primary' : lastMessagePreview.match(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u) ? 'text-text-tertiary italic' : 'text-text-secondary'}`}>
                {isLastMessageMine ? 'Bạn: ' : ''}{lastMessagePreview}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <MessageStatus 
              isMine={isLastMessageMine && !isUnread && !typingText}
              isRead={isLastMessageRead}
              isDelivered={isLastMessageDelivered}
              readers={readers}
            />
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
        onConfirm={() => { onBlock?.(); setShowBlockConfirm(false); }}
        title={CONFIRM_MESSAGES.CHAT.BLOCK_USER.TITLE}
        message={CONFIRM_MESSAGES.CHAT.BLOCK_USER.MESSAGE}
        confirmLabel={CONFIRM_MESSAGES.CHAT.BLOCK_USER.CONFIRM}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => { onDelete?.(); setShowDeleteConfirm(false); }}
        title={CONFIRM_MESSAGES.CHAT.DELETE_CONVERSATION.TITLE}
        message={CONFIRM_MESSAGES.CHAT.DELETE_CONVERSATION.MESSAGE}
        confirmLabel={CONFIRM_MESSAGES.CHAT.DELETE_CONVERSATION.CONFIRM}
        variant="danger"
      />
    </div>
  );
};

export const ConversationItem = Object.assign(
  React.memo(ConversationItemInner),
  { Skeleton: ConversationItemSkeleton }
);
