import React from 'react';
import { Check } from 'lucide-react';
import { UserAvatar } from '../../ui';
import { User, UserStatus } from '../../../../shared/types';
import { useConversationParticipants } from '../../../hooks/chat/useConversationParticipants';
import { ShareableEntry } from '../../../hooks/chat/useShareTargets';

interface ShareTargetItemProps {
  entry: ShareableEntry;
  currentUserId: string;
  usersMap: Record<string, User>;
  selected: boolean;
  onToggle: () => void;
}

export const ShareTargetItem: React.FC<ShareTargetItemProps> = ({
  entry,
  currentUserId,
  usersMap,
  selected,
  onToggle,
}) => {
  const isGroup = entry.type === 'conversation' && entry.item.data.isGroup;
  
  let partner: User | undefined;
  let title = '';
  let avatarUrl = '';

  if (entry.type === 'conversation') {
    const conv = entry.item.data;
    const partnerId = Object.keys(conv.members).find(uid => uid !== currentUserId) || '';
    partner = usersMap[partnerId];
    title = (isGroup ? conv.name : partner?.fullName) || (isGroup ? 'Nhóm chưa đặt tên' : 'Người dùng');
    avatarUrl = (isGroup ? conv.avatar?.url : partner?.avatar?.url) || '';
  } else {
    partner = entry.item;
    title = partner.fullName || 'Người dùng';
    avatarUrl = partner.avatar?.url || '';
  }

  const participantIds = isGroup && entry.type === 'conversation' ? Object.keys(entry.item.data.members) : [];
  const groupParticipants = useConversationParticipants(participantIds);

  if (entry.type === 'conversation' && !isGroup && partner?.status === UserStatus.BANNED) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 group ${
        selected
          ? 'border-primary/40 bg-primary/5 shadow-sm'
          : 'border-transparent'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
        <UserAvatar
          userId={isGroup ? '' : partner?.id || ''}
          src={avatarUrl}
          name={title}
          size="sm"
          isGroup={isGroup}
          members={groupParticipants}
          className="transition-transform duration-200"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-text-primary truncate transition-colors">
            {title}
          </span>
          {isGroup && entry.type === 'conversation' && (
            <span className="text-[11px] text-text-tertiary truncate">
              Nhóm • {Object.keys(entry.item.data.members).length} thành viên
            </span>
          )}
          {entry.type === 'friend' && (
            <span className="text-[11px] text-text-tertiary truncate">Bạn bè</span>
          )}
        </div>
      </div>
      
      <div className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-all duration-200 ${
        selected 
          ? 'border-primary bg-primary text-white' 
          : 'border-border-light bg-bg-primary'
      }`}>
        {selected && <Check size={13} strokeWidth={3} className="animate-in zoom-in-50 duration-200" />}
      </div>
    </button>
  );
};
