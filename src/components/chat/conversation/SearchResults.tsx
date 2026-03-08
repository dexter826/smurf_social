import React from 'react';
import { Search, X, Clock } from 'lucide-react';
import { Button, Skeleton, Avatar, UserAvatar } from '../../ui';
import { Conversation, User, UserStatus } from '../../../types';
import { useConversationParticipants } from '../../../hooks/chat/useConversationParticipants';

interface SearchResultsProps {
  searchTerm: string;
  results: {
    conversations: Conversation[];
    users: User[];
  };
  conversations: Conversation[];
  currentUserId: string;
  selectedId: string | null;
  history: (Conversation | User)[];
  onSelectConversation: (id: string) => void;
  onSelectUser: (user: User) => void;
  onRemoveFromHistory: (id: string) => void;
  onClearHistory: () => void;
  isLoading?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> & { Skeleton: React.FC } = ({
  searchTerm,
  results,
  currentUserId,
  selectedId,
  history,
  onSelectConversation,
  onSelectUser,
  onRemoveFromHistory,
  onClearHistory,
  isLoading,
  conversations
}) => {
  const isHistoryEmpty = history.length === 0;

  if (isLoading) {
    return <SearchResults.Skeleton />;
  }

  if (!searchTerm) {
    if (isHistoryEmpty) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 mt-10">
          <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mb-4">
            <Search size={24} className="text-text-tertiary" />
          </div>
          <p className="text-sm text-text-secondary">
            Tìm kiếm cuộc trò chuyện hoặc bạn bè
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col p-2">
        <div className="flex items-center justify-between px-3 py-2.5 mb-1">
          <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-1.5">
            <Clock size={12} />
            Tìm kiếm gần đây
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearHistory}
            className="text-xs font-medium text-primary hover:underline h-auto p-0"
          >
            Xóa lịch sử
          </Button>
        </div>
        <div className="space-y-1">
          {history.filter(item => {
            if ('status' in item) {
              return item.status !== UserStatus.BANNED;
            }
            if ('participantIds' in item) {
              // Không filter ở đây, để component con xử lý
              return true;
            }
            return true;
          }).map((item) => {
            const isConversation = 'participantIds' in item;

            if (isConversation) {
              // Đồng bộ dữ liệu mới nhất cho hội thoại
              const latestConv = conversations.find(c => c.id === item.id) || item as Conversation;
              return (
                <HistoryConversationItem
                  key={item.id}
                  conversation={latestConv}
                  currentUserId={currentUserId}
                  onSelect={() => onSelectConversation(item.id)}
                  onRemove={() => onRemoveFromHistory(item.id)}
                />
              );
            } else {
              const user = item as User;
              return (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 px-3 py-2 hover:bg-bg-hover active:bg-bg-active cursor-pointer transition-all duration-base rounded-xl relative"
                  onClick={() => onSelectUser(user)}
                >
                  <UserAvatar
                    userId={user.id}
                    src={user.avatar}
                    name={user.name || ''}
                    size="md"
                    initialStatus={user.status}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary truncate">
                      {user.name}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromHistory(item.id);
                    }}
                    className="text-text-tertiary opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-bg-tertiary active:bg-bg-active rounded-full transition-all duration-base"
                    icon={<X size={14} />}
                  />
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  }

  // Kết quả tìm kiếm thực tế
  if (searchTerm && results.users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-8">
        <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mb-4">
          <Search size={24} className="text-text-tertiary" />
        </div>
        <p className="text-sm text-text-secondary">
          Không tìm thấy bạn bè phù hợp
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-4">
      <div className="flex items-center px-4 py-2.5 mb-1">
        <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-1.5">
          <Search size={12} />
          Kết quả tìm kiếm
        </span>
      </div>
      <div className="space-y-0.5">
        {results.users.map((user) => (
          <div
            key={user.id}
            onClick={() => onSelectUser(user)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-bg-hover active:bg-bg-active cursor-pointer transition-all duration-base rounded-lg mx-2"
          >
            <UserAvatar
              userId={user.id}
              src={user.avatar}
              name={user.name}
              size="md"
              initialStatus={user.status}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-text-primary truncate flex items-center gap-1.5">
                {user.name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface HistoryConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  onSelect: () => void;
  onRemove: () => void;
}

const HistoryConversationItem: React.FC<HistoryConversationItemProps> = ({
  conversation,
  currentUserId,
  onSelect,
  onRemove
}) => {
  const participants = useConversationParticipants(conversation.participantIds);
  const partner = participants.find(p => p.id !== currentUserId);
  const displayName = conversation.isGroup ? conversation.groupName : partner?.name;
  const avatar = conversation.isGroup ? conversation.groupAvatar : partner?.avatar;

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2 hover:bg-bg-hover active:bg-bg-active cursor-pointer transition-all duration-base rounded-xl relative"
      onClick={onSelect}
    >
      <Avatar
        src={avatar}
        name={displayName || ''}
        size="md"
        isGroup={conversation.isGroup}
        members={participants}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-text-primary truncate">
          {displayName}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="text-text-tertiary opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-bg-tertiary active:bg-bg-active rounded-full transition-all duration-base"
        icon={<X size={14} />}
      />
    </div>
  );
};

SearchResults.Skeleton = () => (
  <div className="flex flex-col p-2 space-y-2">
    <div className="px-2 py-2">
      <Skeleton width={100} height={12} />
    </div>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-3 py-2">
        <Skeleton variant="circle" width={40} height={40} />
        <Skeleton width="60%" height={16} />
      </div>
    ))}
  </div>
);
