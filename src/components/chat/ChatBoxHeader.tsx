import React from 'react';
import { Phone, Video, Info, ChevronLeft } from 'lucide-react';
import { Conversation, User, UserStatus } from '../../types';
import { Avatar, UserAvatar, UserStatusText, IconButton, Button, BannedBadge } from '../ui';

interface ChatBoxHeaderProps {
  conversation: Conversation;
  chatName: string;
  avatarSrc?: string;
  partner?: User;
  usersMap: Record<string, User>;
  onBack?: () => void;
  onInfoClick?: () => void;
}

const ChatBoxHeaderInner: React.FC<ChatBoxHeaderProps> = ({
  conversation,
  chatName,
  avatarSrc,
  partner,
  usersMap,
  onBack,
  onInfoClick
}) => {
  return (
    <div className="flex-shrink-0 flex items-center justify-between px-3 md:px-4 h-16 border-b border-border-light bg-bg-primary transition-theme">
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="md:hidden -ml-2 text-text-secondary hover:text-text-primary h-10 w-10 p-0 rounded-full"
          >
            <ChevronLeft size={24} />
          </Button>
        )}

        <div className="flex-shrink-0">
          {conversation.isGroup ? (
            <Avatar
              src={avatarSrc}
              name={chatName}
              size="md"
              isGroup
              members={conversation.participants}
            />
          ) : (
            <UserAvatar 
              userId={partner?.id ?? ''} 
              src={avatarSrc} 
              name={chatName} 
              size="md" 
              initialStatus={partner?.status} 
              showStatus={false} 
            />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-text-primary truncate leading-tight">{chatName}</h2>
            {!conversation.isGroup && partner && usersMap[partner.id]?.status === UserStatus.BANNED && <BannedBadge />}
          </div>
          {!conversation.isGroup && partner && (
            <UserStatusText 
              userId={partner.id} 
              className="text-xs text-text-tertiary truncate leading-tight" 
              initialStatus={partner.status} 
            />
          )}
          {conversation.isGroup && (
            <span className="text-xs text-text-tertiary truncate leading-tight">
              {conversation.participants.length} thành viên
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 md:gap-1">
        <IconButton 
          onClick={() => { }} 
          title="Cuộc gọi âm thanh" 
          variant="ghost" 
          className="text-primary hover:bg-primary-light" 
          icon={<Phone size={20} />} 
          size="md" 
        />
        <IconButton 
          onClick={() => { }} 
          title="Cuộc gọi video" 
          variant="ghost" 
          className="text-primary hover:bg-primary-light" 
          icon={<Video size={20} />} 
          size="md" 
        />
        <IconButton 
          onClick={onInfoClick} 
          title="Thông tin hội thoại" 
          variant="ghost" 
          className="text-text-secondary hover:text-primary" 
          icon={<Info size={20} />} 
          size="md" 
        />
      </div>
    </div>
  );
};

export const ChatBoxHeader = React.memo(ChatBoxHeaderInner);