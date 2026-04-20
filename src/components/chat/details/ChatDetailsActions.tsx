import React, { useState } from 'react';
import { RtdbConversation, RtdbUserChat, ReportType, User, UserStatus } from '../../../../shared/types';
import {
  Bell, BellOff, Pin, PinOff, Trash2, ChevronRight,
  Ban, LogOut, Edit3, User as UserIcon, Flag, Archive as ArchiveIcon,
  Crown, Shield, ToggleLeft, ToggleRight, ShieldCheck,
} from 'lucide-react';
import { ConfirmDialog } from '../../ui';
import { useReportStore } from '../../../store/reportStore';
import { CONFIRM_MESSAGES } from '../../../constants/confirmMessages';
import { useConversationMemberSettings } from '../../../hooks/chat/useConversationMemberSettings';

interface ChatDetailsActionsProps {
  conversation: { id: string; data: RtdbConversation; userChat: RtdbUserChat };
  currentUserId: string;
  partner?: User;
  isBlocked?: boolean;
  onToggleMute?: () => void;
  onTogglePin?: () => void;
  onToggleBlock?: () => void;
  onToggleArchive?: () => void;
  onDelete?: () => void;
  onLeaveGroup?: () => void;
  onEditGroup?: () => void;
  onViewProfile?: () => void;
  onTransferCreator?: () => void;
  onToggleApprovalMode?: (enabled: boolean) => Promise<void>;
}

type ActionVariant = 'default' | 'danger';

interface Action {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant: ActionVariant;
  isToggle?: boolean;
  isActive?: boolean;
}

export const ChatDetailsActions: React.FC<ChatDetailsActionsProps> = ({
  conversation, currentUserId, partner,
  onToggleMute, onTogglePin, onToggleBlock, onToggleArchive,
  onDelete, onLeaveGroup, onEditGroup, onViewProfile,
  onTransferCreator, onToggleApprovalMode,
}) => {
  const { openReportModal } = useReportStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showApprovalOffConfirm, setShowApprovalOffConfirm] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);

  const memberSettings = useConversationMemberSettings(conversation.id, currentUserId);
  const isGroup = conversation.data.isGroup;
  const isCreator = isGroup && conversation.data.creatorId === currentUserId;
  const isAdmin = isGroup && conversation.data.members[currentUserId] === 'admin';
  const isAdminOrCreator = isAdmin || isCreator;
  const isDisbandAction = isGroup && isCreator;
  const isMuted = memberSettings?.isMuted || false;
  const approvalMode = conversation.data.joinApprovalMode ?? false;

  const handleApprovalToggle = () => {
    if (approvalMode) {
      setShowApprovalOffConfirm(true);
    } else {
      onToggleApprovalMode?.(true);
    }
  };

  const actions: Action[] = [
    {
      icon: isMuted ? <Bell size={18} /> : <BellOff size={18} />,
      label: isMuted ? 'Bật thông báo' : 'Tắt thông báo',
      onClick: onToggleMute,
      variant: 'default',
    },
    {
      icon: memberSettings?.isPinned ? <PinOff size={18} /> : <Pin size={18} />,
      label: memberSettings?.isPinned ? 'Bỏ ghim' : 'Ghim cuộc trò chuyện',
      onClick: onTogglePin,
      variant: 'default',
    },
    ...(onToggleArchive ? [{
      icon: <ArchiveIcon size={18} />,
      label: memberSettings?.isArchived ? 'Bỏ lưu trữ' : 'Lưu trữ cuộc trò chuyện',
      onClick: onToggleArchive,
      variant: 'default' as ActionVariant,
    }] : []),
    ...(isGroup && onEditGroup ? [{
      icon: <Edit3 size={18} />,
      label: 'Chỉnh sửa nhóm',
      onClick: onEditGroup,
      variant: 'default' as ActionVariant,
    }] : []),
    // Chuyển quyền Creator — chỉ Creator
    ...(isGroup && isCreator && onTransferCreator ? [{
      icon: <Crown size={18} />,
      label: 'Chuyển quyền trưởng nhóm',
      onClick: () => setShowTransferConfirm(true),
      variant: 'default' as ActionVariant,
    }] : []),
    ...(!isGroup && onViewProfile ? [{
      icon: <UserIcon size={18} />,
      label: 'Xem trang cá nhân',
      onClick: onViewProfile,
      variant: 'default' as ActionVariant,
    }] : []),
    ...(!isGroup && partner?.status !== UserStatus.BANNED ? [
      {
        icon: <Ban size={18} />,
        label: 'Quản lý chặn',
        onClick: onToggleBlock,
        variant: 'danger' as ActionVariant,
      },
      ...(() => {
        const partnerId = Object.keys(conversation.data.members).find(id => id !== currentUserId);
        return partnerId ? [{
          icon: <Flag size={18} />,
          label: 'Báo cáo người dùng',
          onClick: () => openReportModal(ReportType.USER, partnerId, partnerId),
          variant: 'danger' as ActionVariant,
        }] : [];
      })(),
    ] : []),
    ...(isGroup && onLeaveGroup ? [{
      icon: <LogOut size={18} />,
      label: 'Rời khỏi nhóm',
      onClick: () => setShowLeaveConfirm(true),
      variant: 'danger' as ActionVariant,
    }] : []),
    ...(onDelete ? [{
      icon: <Trash2 size={18} />,
      label: isDisbandAction ? 'Giải tán nhóm' : 'Xóa cuộc trò chuyện',
      onClick: () => setShowDeleteConfirm(true),
      variant: 'danger' as ActionVariant,
    }] : []),
  ];

  return (
    <div className="py-3 border-t border-border-light">
      <p className="px-4 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wide">
        Tùy chọn
      </p>

      <div>
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`
              w-full flex items-center gap-3 px-4 py-3 transition-colors duration-200 text-left
              ${action.variant === 'danger'
                ? 'text-error hover:bg-error/5 active:bg-error/10'
                : 'text-text-primary hover:bg-bg-hover active:bg-bg-active'
              }
            `}
          >
            <span className={`flex-shrink-0 ${action.variant === 'danger' ? 'text-error' : action.isActive ? 'text-primary' : 'text-text-secondary'}`}>
              {action.icon}
            </span>
            <span className="flex-1 text-sm font-medium">{action.label}</span>
            {!action.isToggle && <ChevronRight size={14} className="text-text-tertiary flex-shrink-0" />}
          </button>
        ))}
      </div>

      {/* Cài đặt nhóm (Chỉ Admin/Creator) */}
      {isGroup && isAdminOrCreator && onToggleApprovalMode && (
        <div className="mt-2 border-t border-border-light pt-2">
          <p className="px-4 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wide">
            Cài đặt nhóm
          </p>
          <div
            className="flex items-center justify-between w-full px-4 py-3 hover:bg-bg-hover transition-colors cursor-pointer group"
            onClick={handleApprovalToggle}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors
                ${approvalMode ? 'bg-primary/10 text-primary' : 'bg-bg-secondary text-text-tertiary'}`}>
                <ShieldCheck size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text-primary">Phê duyệt thành viên</span>
                <span className="text-[10px] text-text-tertiary">Kiểm soát người mới vào nhóm</span>
              </div>
            </div>
            <div className={`w-9 h-5 rounded-full transition-all duration-300 relative
              ${approvalMode ? 'bg-primary' : 'bg-bg-secondary border border-border-light'}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300
                ${approvalMode ? 'left-5' : 'left-1'}`} />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDelete?.()}
        title={isDisbandAction
          ? CONFIRM_MESSAGES.CHAT.DISBAND_GROUP.TITLE
          : CONFIRM_MESSAGES.CHAT.DELETE_CONVERSATION.TITLE}
        message={isDisbandAction
          ? CONFIRM_MESSAGES.CHAT.DISBAND_GROUP.MESSAGE
          : CONFIRM_MESSAGES.CHAT.DELETE_CONVERSATION.MESSAGE}
        confirmLabel={isDisbandAction
          ? CONFIRM_MESSAGES.CHAT.DISBAND_GROUP.CONFIRM
          : CONFIRM_MESSAGES.CHAT.DELETE_CONVERSATION.CONFIRM}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={() => onLeaveGroup?.()}
        title={CONFIRM_MESSAGES.CHAT.LEAVE_GROUP.TITLE}
        message={CONFIRM_MESSAGES.CHAT.LEAVE_GROUP.MESSAGE}
        confirmLabel={CONFIRM_MESSAGES.CHAT.LEAVE_GROUP.CONFIRM}
        variant="danger"
      />


      <ConfirmDialog
        isOpen={showApprovalOffConfirm}
        onClose={() => setShowApprovalOffConfirm(false)}
        onConfirm={() => { onToggleApprovalMode?.(false); setShowApprovalOffConfirm(false); }}
        title={CONFIRM_MESSAGES.CHAT.TOGGLE_APPROVAL_OFF.TITLE}
        message={CONFIRM_MESSAGES.CHAT.TOGGLE_APPROVAL_OFF.MESSAGE}
        confirmLabel={CONFIRM_MESSAGES.CHAT.TOGGLE_APPROVAL_OFF.CONFIRM}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showTransferConfirm}
        onClose={() => setShowTransferConfirm(false)}
        onConfirm={() => { onTransferCreator?.(); setShowTransferConfirm(false); }}
        title={CONFIRM_MESSAGES.CHAT.TRANSFER_CREATOR.TITLE}
        message={CONFIRM_MESSAGES.CHAT.TRANSFER_CREATOR.MESSAGE}
        confirmLabel={CONFIRM_MESSAGES.CHAT.TRANSFER_CREATOR.CONFIRM}
        variant="danger"
      />
    </div>
  );
};
