import React, { useState } from 'react';
import { RtdbConversation, RtdbUserChat, ReportType, User, UserStatus } from '../../../../shared/types';
import {
  Bell, BellOff, Pin, PinOff, Trash2, ChevronRight,
  Ban, LogOut, Edit3, User as UserIcon, Flag, Archive as ArchiveIcon,
  Crown, Shield, ToggleLeft, ToggleRight, ShieldCheck, Search,
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
  onSetTab?: (tabId: 'info' | 'members' | 'media' | 'search') => void;
}

const QuickActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
}> = ({ icon, label, onClick, active, danger }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 group outline-none"
  >
    <div className={`
      w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200
      ${danger
        ? 'bg-error/10 text-error hover:bg-error hover:text-white'
        : active
          ? 'bg-primary/10 text-primary'
          : 'bg-bg-secondary text-text-secondary hover:bg-bg-active hover:text-text-primary border border-transparent'
      }
    `}>
      {icon}
    </div>
    <span className={`text-[10px] font-semibold transition-colors ${danger ? 'text-error' : active ? 'text-primary' : 'text-text-tertiary group-hover:text-text-primary'}`}>
      {label}
    </span>
  </button>
);

/** Hành động và cài đặt hội thoại. */
export const ChatDetailsActions: React.FC<ChatDetailsActionsProps> = ({
  conversation, currentUserId, partner,
  onToggleMute, onTogglePin, onToggleBlock, onToggleArchive,
  onDelete, onLeaveGroup, onEditGroup, onViewProfile,
  onTransferCreator, onToggleApprovalMode, onSetTab,
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
  const isPinned = memberSettings?.isPinned || false;
  const isArchived = memberSettings?.isArchived || false;
  const approvalMode = conversation.data.joinApprovalMode ?? false;

  const handleApprovalToggle = () => {
    if (approvalMode) {
      setShowApprovalOffConfirm(true);
    } else {
      onToggleApprovalMode?.(true);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Quick Actions Row */}
      <div className="flex items-center justify-around px-4 py-5 bg-bg-primary">
        <QuickActionButton
          icon={isMuted ? <Bell size={18} /> : <BellOff size={18} />}
          label={isMuted ? 'Bật âm' : 'Tắt âm'}
          onClick={onToggleMute}
          active={isMuted}
        />
        <QuickActionButton
          icon={isPinned ? <PinOff size={18} /> : <Pin size={18} />}
          label={isPinned ? 'Bỏ ghim' : 'Ghim'}
          onClick={onTogglePin}
          active={isPinned}
        />
        <QuickActionButton
          icon={<ArchiveIcon size={18} />}
          label={isArchived ? 'Bỏ lưu trữ' : 'Lưu trữ'}
          onClick={onToggleArchive}
          active={isArchived}
        />
        {!isGroup && partner && (
          <QuickActionButton
            icon={<UserIcon size={18} />}
            label="Trang cá nhân"
            onClick={onViewProfile}
          />
        )}
        {isGroup && (
          <QuickActionButton
            icon={<Edit3 size={18} />}
            label="Sửa nhóm"
            onClick={onEditGroup}
          />
        )}
      </div>

      <div className="h-px bg-border-light" />
      {/* Main Settings Sections */}
      <div className="pt-2 pb-6">
        {/* Section: Group Special Settings */}
        {isGroup && isAdminOrCreator && onToggleApprovalMode && (
          <div
            className="flex items-center justify-between w-full px-5 py-3 hover:bg-bg-hover transition-colors cursor-pointer group"
            onClick={handleApprovalToggle}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                ${approvalMode ? 'bg-primary/10 text-primary' : 'bg-bg-secondary text-text-tertiary'}`}>
                <ShieldCheck size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text-primary leading-tight">Phê duyệt thành viên</span>
                <span className="text-[10px] text-text-tertiary">Kiểm soát người mới</span>
              </div>
            </div>
            <div className={`w-9 h-5 rounded-full transition-all duration-300 relative
              ${approvalMode ? 'bg-primary' : 'bg-bg-tertiary border border-border-light'}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300
                ${approvalMode ? 'left-5' : 'left-1'}`} />
            </div>
          </div>
        )}

        {/* Section: General & Actions */}
        <div className="flex flex-col">
          {isGroup && isCreator && onTransferCreator && (
            <button
              onClick={() => setShowTransferConfirm(true)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-bg-hover transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center text-warning transition-colors">
                  <Crown size={16} />
                </div>
                <span className="text-sm font-medium text-warning">Chuyển quyền trưởng nhóm</span>
              </div>
              <ChevronRight size={14} className="text-text-tertiary" />
            </button>
          )}

          {!isGroup && partner?.status !== UserStatus.BANNED && (
            <>
              <button
                onClick={onToggleBlock}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-error/5 transition-colors text-left text-error group"
              >
                <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center text-error transition-colors">
                  <Ban size={16} />
                </div>
                <span className="text-sm font-medium">Quản lý chặn</span>
              </button>
              <button
                onClick={() => {
                  const partnerId = Object.keys(conversation.data.members).find(id => id !== currentUserId);
                  if (partnerId) openReportModal(ReportType.USER, partnerId, partnerId);
                }}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-error/5 transition-colors text-left text-error group"
              >
                <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center text-error transition-colors">
                  <Flag size={16} />
                </div>
                <span className="text-sm font-medium">Báo cáo người dùng</span>
              </button>
            </>
          )}

          {isGroup && onLeaveGroup && (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-error/5 transition-colors text-left text-error group"
            >
              <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center text-error transition-colors">
                <LogOut size={16} />
              </div>
              <span className="text-sm font-medium">Rời khỏi nhóm</span>
            </button>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-error/5 transition-colors text-left text-error group"
          >
            <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center text-error transition-colors">
              <Trash2 size={16} />
            </div>
            <span className="text-sm font-medium">{isDisbandAction ? 'Giải tán nhóm' : 'Xóa cuộc trò chuyện'}</span>
          </button>
        </div>
      </div>

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
