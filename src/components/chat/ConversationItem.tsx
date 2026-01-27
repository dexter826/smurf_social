import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Pin, Volume2, VolumeX, Trash2, MoreVertical, CheckCheck, Check } from 'lucide-react';
import { Conversation, User, UserStatus } from '../../types';
import { Dropdown, DropdownItem, ConfirmDialog, UserAvatar } from '../ui';

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
  const lastMessage = conversation.lastMessage;
  const lastMessagePreview = lastMessage
    ? lastMessage.type === 'text'
      ? lastMessage.content
      : lastMessage.content
    : 'Chưa có tin nhắn';

  const isLastMessageMine = lastMessage?.senderId === currentUserId;
  const isLastMessageRead = lastMessage?.readBy && lastMessage.readBy.length > 1;
  const isLastMessageDelivered = !!lastMessage?.deliveredAt;

  const timeAgo = conversation.updatedAt 
    ? (() => {
        const diff = Math.floor((Date.now() - new Date(conversation.updatedAt).getTime()) / 1000);
        if (diff < 60) return 'dưới 1 phút';
        return formatDistanceToNow(new Date(conversation.updatedAt), { 
          locale: vi 
        }).replace('khoảng ', '');
      })()
    : '';

  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-center gap-3 p-3.5 mx-2.5 my-1.5 cursor-pointer transition-all duration-200 rounded-xl group
        hover:bg-bg-hover
        ${isActive ? 'bg-primary-light' : ''}
        ${conversation.pinned && !isActive ? 'bg-bg-secondary' : ''}
      `}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <UserAvatar userId={partner?.id} src={partner?.avatar} name={partner?.name} size="md" initialStatus={partner?.status} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
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
          <span className={`text-xs flex-shrink-0 group-hover:hidden ${unreadCount > 0 ? 'font-semibold text-primary' : 'text-text-tertiary'}`}>
            {timeAgo.replace('khoảng ', '').replace('dưới ', '').replace('hơn ', '')}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate flex-1 ${unreadCount > 0 ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>
            <span className={`truncate text-[13px] ${unreadCount > 0 ? 'font-bold text-text-primary' : 'text-text-tertiary'}`}>
              {isLastMessageMine ? 'Bạn: ' : ''}{lastMessagePreview}
            </span>
          </p>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isLastMessageMine && (
              <span className="text-[11px] font-medium text-text-tertiary whitespace-nowrap">
                {isLastMessageRead 
                  ? 'Đã xem'
                  : isLastMessageDelivered
                    ? 'Đã nhận'
                    : 'Đã gửi'
                }
              </span>
            )}

            {unreadCount > 0 && (
              <span className="flex-shrink-0 bg-red-500 text-white text-[10px] font-bold rounded-md min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Dropdown
          trigger={
            <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-all">
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
