import React, { useState } from 'react';
import { Conversation } from '../../types';
import { Bell, BellOff, Pin, PinOff, Trash2, ChevronRight, Ban, UserCheck } from 'lucide-react';
import { ConfirmDialog } from '../ui';

interface ChatDetailsActionsProps {
  conversation: Conversation;
  isBlocked?: boolean;
  onToggleMute?: () => void;
  onTogglePin?: () => void;
  onToggleBlock?: () => void;
  onDelete?: () => void;
}

export const ChatDetailsActions: React.FC<ChatDetailsActionsProps> = ({
  conversation,
  isBlocked,
  onToggleMute,
  onTogglePin,
  onToggleBlock,
  onDelete
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const actions = [
    {
      icon: conversation.muted ? <Bell size={20} /> : <BellOff size={20} />,
      label: conversation.muted ? 'Bật thông báo' : 'Tắt thông báo',
      onClick: onToggleMute,
      variant: 'default' as const,
    },
    {
      icon: conversation.pinned ? <PinOff size={20} /> : <Pin size={20} />,
      label: conversation.pinned ? 'Bỏ ghim' : 'Ghim cuộc trò chuyện',
      onClick: onTogglePin,
      variant: 'default' as const,
    },
    {
      icon: isBlocked ? <UserCheck size={20} /> : <Ban size={20} />,
      label: isBlocked ? 'Bỏ chặn người dùng' : 'Chặn người dùng',
      onClick: () => setShowBlockConfirm(true),
      variant: 'danger' as const,
    },
    {
      icon: <Trash2 size={20} />,
      label: 'Xóa cuộc trò chuyện',
      onClick: () => setShowDeleteConfirm(true),
      variant: 'danger' as const,
    },
  ];

  return (
    <div className="py-4 border-t border-border-light">
      <h3 className="px-4 text-sm font-semibold text-text-secondary mb-2">
        Tùy chọn
      </h3>

      <div className="space-y-1">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`
              w-full flex items-center gap-3 px-4 py-3 transition-colors
              ${action.variant === 'danger' 
                ? 'text-error hover:bg-error/10' 
                : 'text-text-primary hover:bg-bg-hover'
              }
            `}
          >
            <span className={action.variant === 'danger' ? 'text-error' : 'text-text-secondary'}>
              {action.icon}
            </span>
            <span className="flex-1 text-left text-sm font-medium">
              {action.label}
            </span>
            <ChevronRight size={16} className="text-text-tertiary" />
          </button>
        ))}
      </div>

      <ConfirmDialog
        isOpen={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        onConfirm={() => onToggleBlock?.()}
        title={isBlocked ? 'Bỏ chặn người dùng' : 'Chặn người dùng'}
        message={isBlocked 
          ? 'Bạn có chắc chắn muốn bỏ chặn người này? Họ sẽ có thể gửi tin nhắn cho bạn.'
          : 'Bạn có chắc chắn muốn chặn người này? Bạn sẽ không nhận được tin nhắn từ họ.'
        }
        confirmLabel={isBlocked ? 'Bỏ chặn' : 'Chặn ngay'}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDelete?.()}
        title="Xóa cuộc trò chuyện"
        message="Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Tất cả tin nhắn sẽ bị xóa vĩnh viễn."
        confirmLabel="Xóa ngay"
        variant="danger"
      />
    </div>
  );
};
