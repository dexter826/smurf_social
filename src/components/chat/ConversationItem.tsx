import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Pin, Volume2, VolumeX, Trash2, MoreVertical, CheckCheck } from 'lucide-react';
import { Conversation, User } from '../../types';
import { Avatar } from '../ui';

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
  const [showMenu, setShowMenu] = React.useState(false);

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
        relative flex items-center gap-3 p-3 cursor-pointer transition-colors
        hover:bg-bg-hover
        ${isActive ? 'bg-primary-light border-l-4 border-primary' : ''}
        ${conversation.pinned ? 'bg-primary-light' : ''}
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
          <span className="text-xs text-text-tertiary flex-shrink-0">{timeAgo}</span>
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
      <div className="absolute top-2 right-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-bg-hover rounded-full transition-opacity"
        >
          <MoreVertical size={16} />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-8 z-20 bg-bg-primary border border-border-light rounded-lg shadow-dropdown py-1 w-40">
              {onPin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPin();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2 text-text-primary transition-colors"
                >
                  <Pin size={14} />
                  {conversation.pinned ? 'Bỏ ghim' : 'Ghim'}
                </button>
              )}
              {onMute && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMute();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2 text-text-primary transition-colors"
                >
                  {conversation.muted ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  {conversation.muted ? 'Bật thông báo' : 'Tắt thông báo'}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Bạn có chắc muốn xóa cuộc trò chuyện này?')) {
                      onDelete();
                    }
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover text-error flex items-center gap-2 transition-colors"
                >
                  <Trash2 size={14} />
                  Xóa
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
