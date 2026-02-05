import React from 'react';
import { Search, X, Clock, Lock } from 'lucide-react';
import { Button, Skeleton, Avatar, UserAvatar } from '../ui';
import { Conversation, User, UserStatus } from '../../types';

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
        <div className="flex items-center justify-between px-2 py-2 mb-1">
          <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider">
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
            if ('participants' in item) {
              return !item.participants.some(p => p.status === UserStatus.BANNED);
            }
            return true;
          }).map((item) => {
            const isConversation = 'participantIds' in item;
            
            // Đồng bộ dữ liệu mới nhất cho hội thoại
            let displayItem = item;
            if (isConversation) {
              const latestConv = conversations.find(c => c.id === item.id);
              if (latestConv) displayItem = latestConv;
            }

            const itemAsConv = displayItem as Conversation;
            const itemAsUser = displayItem as User;

            const displayName = isConversation 
              ? (itemAsConv.isGroup ? itemAsConv.groupName : itemAsConv.participants.find(p => p.id !== currentUserId)?.name)
              : itemAsUser.name;
            const avatar = isConversation
              ? (itemAsConv.isGroup ? itemAsConv.groupAvatar : itemAsConv.participants.find(p => p.id !== currentUserId)?.avatar)
              : itemAsUser.avatar;

            return (
              <div
                key={item.id}
                className="group flex items-center gap-3 px-3 py-2 hover:bg-bg-secondary cursor-pointer transition-all rounded-xl relative"
                onClick={() => isConversation ? onSelectConversation(item.id) : onSelectUser(item as User)}
              >
                {isConversation ? (
                  <Avatar 
                    src={avatar} 
                    name={displayName || ''} 
                    size="md" 
                    isGroup={itemAsConv.isGroup} 
                    members={itemAsConv.participants}
                  />
                ) : (
                  <UserAvatar 
                    userId={displayItem.id} 
                    src={avatar} 
                    name={displayName || ''} 
                    size="md" 
                    initialStatus={itemAsUser.status}
                  />
                )}
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
                    onRemoveFromHistory(item.id);
                  }}
                  className="text-text-tertiary hover:opacity-100 opacity-0 group-hover:opacity-100 hover:bg-bg-tertiary rounded-full"
                  icon={<X size={14} />}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (results.users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 mt-10">
        <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mb-4">
          <Search size={24} className="text-text-tertiary" />
        </div>
        <p className="text-sm text-text-secondary">
          {searchTerm ? 'Không tìm thấy bạn bè phù hợp' : 'Nhập tên hoặc email bạn bè'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-4">
      <div className="mt-2">
        {results.users.map((user) => (
          <div
            key={user.id}
            onClick={() => onSelectUser(user)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary cursor-pointer transition-all active:bg-bg-tertiary rounded-lg mx-2"
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
