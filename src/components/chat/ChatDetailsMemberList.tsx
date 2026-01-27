import React, { useState } from 'react';
import { User, Conversation } from '../../types';
import { UserAvatar, UserStatusText, Dropdown, DropdownItem, ConfirmDialog, Button } from '../ui';
import { Crown, Shield, UserPlus, MoreVertical, UserMinus, ShieldPlus, ShieldMinus, LogOut } from 'lucide-react';

interface ChatDetailsMemberListProps {
  conversation: Conversation;
  currentUserId: string;
  onMemberClick?: (userId: string) => void;
  onAddMember?: () => void;
  onRemoveMember?: (userId: string) => void;
  onPromoteToAdmin?: (userId: string) => void;
  onDemoteFromAdmin?: (userId: string) => void;
}

export const ChatDetailsMemberList: React.FC<ChatDetailsMemberListProps> = ({
  conversation,
  currentUserId,
  onMemberClick,
  onAddMember,
  onRemoveMember,
  onPromoteToAdmin,
  onDemoteFromAdmin
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  if (!conversation.isGroup) return null;

  const members = conversation.participants;
  const creatorId = conversation.creatorId;
  const adminIds = conversation.adminIds || [];
  const isCurrentUserAdmin = adminIds.includes(currentUserId);
  const isCurrentUserCreator = creatorId === currentUserId;

  const getMemberRole = (memberId: string) => {
    if (memberId === creatorId) return 'creator';
    if (adminIds.includes(memberId)) return 'admin';
    return 'member';
  };

  const canManageMember = (memberId: string) => {
    if (memberId === currentUserId) return false;
    if (memberId === creatorId) return false;
    if (!isCurrentUserAdmin) return false;
    if (adminIds.includes(memberId) && !isCurrentUserCreator) return false;
    return true;
  };

  return (
    <div className="py-4">
      {/* Header với nút thêm thành viên */}
      <div className="flex items-center justify-between px-4 mb-2">
        <h3 className="text-sm font-semibold text-text-secondary">
          Thành viên ({members.length})
        </h3>
        {isCurrentUserAdmin && onAddMember && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddMember}
            className="text-primary hover:bg-primary-light"
            icon={<UserPlus size={16} />}
          >
            Thêm
          </Button>
        )}
      </div>
      
      <div className="space-y-1">
        {members.map((member) => {
          const isCurrentUser = member.id === currentUserId;
          const role = getMemberRole(member.id);
          const canManage = canManageMember(member.id);
          
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg-hover group"
            >
              <div 
                onClick={() => !isCurrentUser && onMemberClick?.(member.id)}
                className={`flex items-center gap-3 flex-1 min-w-0 ${!isCurrentUser ? 'cursor-pointer' : ''}`}
              >
                <UserAvatar
                  userId={member.id}
                  src={member.avatar}
                  name={member.name}
                  size="sm"
                  initialStatus={member.status}
                  showStatus
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {member.name}
                      {isCurrentUser && <span className="text-text-tertiary"> (Bạn)</span>}
                    </span>
                    
                    {/* Role badges - chỉ icon */}
                    {role === 'creator' && (
                      <span className="text-yellow-500" title="Trưởng nhóm">
                        <Crown size={14} />
                      </span>
                    )}
                    {role === 'admin' && (
                      <span className="text-blue-500" title="Admin">
                        <Shield size={14} />
                      </span>
                    )}
                  </div>
                  <UserStatusText
                    userId={member.id}
                    initialStatus={member.status}
                    className="text-xs text-text-tertiary"
                  />
                </div>
              </div>

              {/* Menu quản lý */}
              {canManage && (
                <Dropdown
                  isOpen={menuOpenId === member.id}
                  onOpenChange={(open) => setMenuOpenId(open ? member.id : null)}
                  disableTriggerScale
                  trigger={
                    <button className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-bg-tertiary transition-all">
                      <MoreVertical size={16} className="text-text-tertiary" />
                    </button>
                  }
                >
                  {role === 'member' && onPromoteToAdmin && (
                    <DropdownItem
                      icon={<ShieldPlus size={16} />}
                      label="Thăng làm Admin"
                      onClick={() => {
                        onPromoteToAdmin(member.id);
                        setMenuOpenId(null);
                      }}
                    />
                  )}
                  {role === 'admin' && isCurrentUserCreator && onDemoteFromAdmin && (
                    <DropdownItem
                      icon={<ShieldMinus size={16} />}
                      label="Hạ quyền Admin"
                      onClick={() => {
                        onDemoteFromAdmin(member.id);
                        setMenuOpenId(null);
                      }}
                    />
                  )}
                  {onRemoveMember && (
                    <DropdownItem
                      icon={<UserMinus size={16} />}
                      label="Xóa khỏi nhóm"
                      variant="danger"
                      onClick={() => {
                        setConfirmRemove(member.id);
                        setMenuOpenId(null);
                      }}
                    />
                  )}
                </Dropdown>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm dialog xóa thành viên */}
      <ConfirmDialog
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (confirmRemove && onRemoveMember) {
            onRemoveMember(confirmRemove);
          }
          setConfirmRemove(null);
        }}
        title="Xóa thành viên"
        message="Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm?"
        confirmLabel="Xóa ngay"
        variant="danger"
      />
    </div>
  );
};
