import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Pin, Volume2, VolumeX, Trash2, MoreVertical, CheckCheck } from 'lucide-react';
import { Conversation, User } from '../../types';
import { Avatar, Dropdown, DropdownItem, ConfirmDialog } from '../ui';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  onClick: () => void;
  onPin?: () => void;
  onMute?: () => void;
  onDelete?: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  currentUserId,
  onClick,
  onPin,
  onMute,
  onDelete
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const partner = conversation.isGroup 
    ? null 
    : conversation.participants.find(p => p.id !== currentUserId);

  const chatName = conversation.isGroup 
    ? conversation.groupName 
    : partner?.name || 'Unknown';

  const avatar = conversation.isGroup 
    ? conversation.groupAvatar 
    : partner?.avatar;

  const unreadCount = conversation.unreadCount?.[currentUserId] || 0;
  const lastMessagePreview = conversation.lastMessage
    ? conversation.lastMessage.type === 'text'
      ? conversation.lastMessage.content
      : conversation.lastMessage.content
    : 'Chưa có tin nhắn';

  const isLastMessageMine = conversation.lastMessage?.senderId === currentUserId;

  const timeAgo = conversation.updatedAt 
    ? formatDistanceToNow(new Date(conversation.updatedAt), { 
        addSuffix: true, 
        locale: vi 
      })
    : '';

  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-center gap-3 p-3 mx-2 my-1 cursor-pointer transition-all duration-200 rounded-xl group
        hover:bg-bg-hover
        ${isActive ? 'bg-primary-light' : ''}
        ${conversation.pinned && !isActive ? 'bg-bg-secondary' : ''}
      `}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar src={avatar} size="md" />
        {partner?.status === 'online' && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-status-online border-2 border-bg-primary rounded-full" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-sm truncate ${unreadCount > 0 ? 'text-text-primary' : 'text-text-secondary'}`}>
              {chatName}
            </h3>
            {conversation.pinned && (
              <Pin size={14} className="text-primary flex-shrink-0" />
            )}
            {conversation.muted && (
              <VolumeX size={14} className="text-text-tertiary flex-shrink-0" />
            )}
          </div>
          <span className="text-xs text-text-tertiary flex-shrink-0 group-hover:hidden">{timeAgo}</span>
        </div>

        <div className="flex items-center justify-between">
          <p className={`text-sm truncate ${unreadCount > 0 ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
            {isLastMessageMine && (
              <span className="mr-1">
                <CheckCheck size={14} className="inline text-primary" />
              </span>
            )}
            {lastMessagePreview}
          </p>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 ml-2 bg-badge-bg text-badge-text text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Menu */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Dropdown
          trigger={
            <button className="p-1 hover:bg-bg-hover rounded-full transition-all">
              <MoreVertical size={16} />
            </button>
          }
        >
          {onPin && (
            <DropdownItem
              icon={<Pin size={14} />}
              label={conversation.pinned ? 'Bỏ ghim' : 'Ghim'}
              onClick={onPin}
            />
          )}
          {onMute && (
            <DropdownItem
              icon={conversation.muted ? <Volume2 size={14} /> : <VolumeX size={14} />}
              label={conversation.muted ? 'Bật thông báo' : 'Tắt thông báo'}
              onClick={onMute}
            />
          )}
          {onDelete && (
            <DropdownItem
              icon={<Trash2 size={14} />}
              label="Xóa"
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
            />
          )}
        </Dropdown>
      </div>

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
