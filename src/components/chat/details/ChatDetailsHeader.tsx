import React from 'react';
import { Lock } from 'lucide-react';
import { User, Conversation, UserStatus } from '../../../types';
import { UserAvatar, Avatar, UserStatusText } from '../../ui';

interface ChatDetailsHeaderProps {
  conversation: Conversation;
  currentUserId: string;
  partner?: User;
}

export const ChatDetailsHeader: React.FC<ChatDetailsHeaderProps> = ({
  conversation,
  currentUserId,
  partner
}) => {
  const isGroup = conversation.isGroup;
  const displayName = isGroup ? conversation.groupName : partner?.name || 'Unknown';
  const avatarSrc = isGroup ? conversation.groupAvatar : partner?.avatar;

  return (
    <div className="flex flex-col items-center py-6 px-4 border-b border-border-light">
      {isGroup ? (
        <Avatar src={avatarSrc} name={displayName} size="xl" isGroup members={conversation.participants} />
      ) : (
        <UserAvatar 
          userId={partner?.id!} 
          src={avatarSrc} 
          name={displayName} 
          size="xl" 
          initialStatus={partner?.status}
          showStatus={false}
        />
      )}
      
      <h2 className="mt-4 text-lg font-bold text-text-primary text-center flex items-center gap-2">
        {displayName}
        {!isGroup && partner?.status === UserStatus.BANNED && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-error/10 text-error">
            <Lock size={12} />
            Đã khóa
          </span>
        )}
      </h2>
      
      {!isGroup && partner && (
        <UserStatusText 
          userId={partner.id} 
          initialStatus={partner.status}
          className="text-sm text-text-secondary mt-1"
        />
      )}

      {isGroup && (
        <p className="text-sm text-text-secondary mt-1">
          {conversation.participants.length} thành viên
        </p>
      )}

      {partner?.bio && (
        <p className="text-sm text-text-tertiary mt-2 text-center max-w-[250px] line-clamp-2">
          {partner.bio}
        </p>
      )}
    </div>
  );
};
