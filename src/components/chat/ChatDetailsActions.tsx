import React, { useState } from 'react';
import { Conversation } from '../../types';
import { Bell, BellOff, Pin, PinOff, Trash2, ChevronRight, Ban, UserCheck, LogOut, Edit3 } from 'lucide-react';
import { ConfirmDialog, Button } from '../ui';

interface ChatDetailsActionsProps {
  conversation: Conversation;
  currentUserId: string;
  isBlocked?: boolean;
  onToggleMute?: () => void;
  onTogglePin?: () => void;
  onToggleBlock?: () => void;
  onDelete?: () => void;
  onLeaveGroup?: () => void;
  onEditGroup?: () => void;
}

export const ChatDetailsActions: React.FC<ChatDetailsActionsProps> = ({
  conversation,
  currentUserId,
  isBlocked,
  onToggleMute,
  onTogglePin,
  onToggleBlock,
  onDelete,
  onLeaveGroup,
  onEditGroup
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const isGroup = conversation.isGroup;
  const isAdmin = isGroup && (conversation.adminIds || []).includes(currentUserId);
  const isCreator = isGroup && conversation.creatorId === currentUserId;

  // Xác định các actions dựa trên loại conversation
  const actions = [];

  // Mute/Unmute - cho cả group và 1-1
  actions.push({
    icon: conversation.muted ? <Bell size={20} /> : <BellOff size={20} />,
    label: conversation.muted ? 'Bật thông báo' : 'Tắt thông báo',
    onClick: onToggleMute,
    variant: 'default' as const,
  });

  // Pin/Unpin - cho cả group và 1-1
  actions.push({
    icon: conversation.pinned ? <PinOff size={20} /> : <Pin size={20} />,
    label: conversation.pinned ? 'Bỏ ghim' : 'Ghim cuộc trò chuyện',
    onClick: onTogglePin,
    variant: 'default' as const,
  });

  // Edit group - chỉ cho admin
  if (isGroup && isAdmin && onEditGroup) {
    actions.push({
      icon: <Edit3 size={20} />,
      label: 'Chỉnh sửa nhóm',
      onClick: onEditGroup,
      variant: 'default' as const,
    });
  }

  // Block - chỉ cho chat 1-1
  if (!isGroup) {
    actions.push({
      icon: isBlocked ? <UserCheck size={20} /> : <Ban size={20} />,
      label: isBlocked ? 'Bỏ chặn người dùng' : 'Chặn người dùng',
      onClick: () => setShowBlockConfirm(true),
      variant: 'danger' as const,
    });
  }

  // Leave group - cho group (không phải creator)
  if (isGroup && onLeaveGroup) {
    actions.push({
      icon: <LogOut size={20} />,
      label: 'Rời khỏi nhóm',
      onClick: () => setShowLeaveConfirm(true),
      variant: 'danger' as const,
    });
  }

  // Delete - creator có thể xóa group, hoặc xóa chat 1-1
  if ((!isGroup || isCreator) && onDelete) {
    actions.push({
      icon: <Trash2 size={20} />,
      label: isGroup ? 'Xóa nhóm' : 'Xóa cuộc trò chuyện',
      onClick: () => setShowDeleteConfirm(true),
      variant: 'danger' as const,
    });
  }

  return (
    <div className="py-4 border-t border-border-light">
      <h3 className="px-4 text-sm font-semibold text-text-secondary mb-2">
        Tùy chọn
      </h3>

      <div className="space-y-1">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="ghost"
            rounded="none"
            onClick={action.onClick}
            className={`
              w-full flex items-center gap-3 px-4 py-3 transition-colors h-auto
              ${action.variant === 'danger' 
                ? 'text-error hover:bg-error/10' 
                : 'text-text-primary hover:bg-bg-hover'
              }
            `}
            icon={<span className={action.variant === 'danger' ? 'text-error' : 'text-text-secondary'}>
              {action.icon}
            </span>}
          >
            <span className="flex-1 text-left text-sm font-medium">
              {action.label}
            </span>
            <ChevronRight size={16} className="text-text-tertiary" />
          </Button>
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
        title={isGroup ? 'Xóa nhóm' : 'Xóa cuộc trò chuyện'}
        message={isGroup 
          ? 'Bạn có chắc chắn muốn xóa nhóm này? Tất cả tin nhắn và thành viên sẽ bị xóa vĩnh viễn.'
          : 'Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Tất cả tin nhắn sẽ bị xóa vĩnh viễn.'
        }
        confirmLabel="Xóa ngay"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={() => onLeaveGroup?.()}
        title="Rời khỏi nhóm"
        message="Bạn có chắc chắn muốn rời khỏi nhóm này? Bạn sẽ không thể xem tin nhắn mới nữa."
        confirmLabel="Rời nhóm"
        variant="danger"
      />
    </div>
  );
};
