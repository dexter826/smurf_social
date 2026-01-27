import React from 'react';
import { User, Conversation } from '../../types';
import { UserAvatar, UserStatusText } from '../ui';
import { Crown, UserCircle } from 'lucide-react';

interface ChatDetailsMemberListProps {
  conversation: Conversation;
  currentUserId: string;
  onMemberClick?: (userId: string) => void;
}

export const ChatDetailsMemberList: React.FC<ChatDetailsMemberListProps> = ({
  conversation,
  currentUserId,
  onMemberClick
}) => {
  if (!conversation.isGroup) return null;

  const members = conversation.participants;

  return (
    <div className="py-4">
      <h3 className="px-4 text-sm font-semibold text-text-secondary mb-2">
        Thành viên ({members.length})
      </h3>
      
      <div className="space-y-1">
        {members.map((member) => {
          const isCurrentUser = member.id === currentUserId;
          
          return (
            <div
              key={member.id}
              onClick={() => !isCurrentUser && onMemberClick?.(member.id)}
              className={`
                flex items-center gap-3 px-4 py-2.5 transition-colors
                ${!isCurrentUser ? 'hover:bg-bg-hover cursor-pointer' : ''}
              `}
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
                </div>
                <UserStatusText
                  userId={member.id}
                  initialStatus={member.status}
                  className="text-xs text-text-tertiary"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
