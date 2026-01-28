import React, { useState } from 'react';
import { Search, Users, ArrowLeft, Archive, X, UserPlus } from 'lucide-react';
import { Conversation, User } from '../../types';
import { Input, Spinner, Dropdown, DropdownItem, Button, IconButton } from '../ui';
import { ConversationItem } from './ConversationItem';
import { SearchResults } from './SearchResults';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  currentUserId: string;
  blockedUserIds?: string[];
  isLoading: boolean;
  onSelectConversation: (id: string) => void;
  onSearch: (term: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onMute: (id: string, muted: boolean) => void;
  onDelete: (id: string) => void;
  onBlock?: (partnerId: string) => void;
  onArchive?: (id: string, archived: boolean) => void;
  onMarkUnread?: (id: string, markedUnread: boolean) => void;
  onNewChat?: () => void;
  onNewGroup?: () => void;
  viewMode?: 'normal' | 'archived';
  archivedCount?: number;
  onViewModeChange?: (mode: 'normal' | 'archived') => void;
  isSearchFocused?: boolean;
  onSearchFocus?: (focused: boolean) => void;
  onSelectUser?: (user: User) => void;
  searchResults?: {
    conversations: Conversation[];
    users: User[];
  };
  searchHistory?: (Conversation | User)[];
  onRemoveFromHistory?: (id: string) => void;
  onClearHistory?: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  currentUserId,
  blockedUserIds = [],
  isLoading,
  onSelectConversation,
  onSearch,
  onPin,
  onMute,
  onDelete,
  onBlock,
  onArchive,
  onMarkUnread,
  onNewChat,
  onNewGroup,
  viewMode = 'normal',
  archivedCount = 0,
  onViewModeChange,
  isSearchFocused = false,
  onSearchFocus,
  onSelectUser,
  searchResults = { conversations: [], users: [] },
  searchHistory = [],
  onRemoveFromHistory,
  onClearHistory
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  const handleBack = () => {
    setSearchTerm('');
    onSearch('');
    onSearchFocus?.(false);
  };

  // Sắp xếp và lọc người dùng bị chặn
  const sortedConversations = [...conversations]
    .filter(conv => {
      if (conv.isGroup) return true;
      const partnerId = conv.participantIds.find(id => id !== currentUserId);
      return !partnerId || !blockedUserIds.includes(partnerId);
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div className="flex flex-col h-full w-full bg-bg-primary border-r border-border-light transition-theme">
      {/* Header */}
      <div className="flex-shrink-0 px-4 h-[72px] flex items-center border-b border-border-light">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 flex items-center">
            <Input
              icon={<Search size={16} />}
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => onSearchFocus?.(true)}
              className="bg-bg-secondary text-sm pr-10 h-10"
              containerClassName="flex-1"
            />
            {searchTerm && (
              <IconButton
                onClick={() => {
                  setSearchTerm('');
                  onSearch('');
                }}
                className="absolute right-3"
                icon={<X size={16} />}
                size="sm"
              />
            )}
          </div>
          {!isSearchFocused && onNewGroup && (
            <Button
              onClick={onNewGroup}
              variant="primary"
              size="md"
              icon={<Users size={20} />}
              title="Tạo nhóm mới"
              className="flex-shrink-0"
            />
          )}
          {isSearchFocused && (
            <Button
              onClick={handleBack}
              variant="ghost"
              size="md"
              className="text-primary flex-shrink-0"
            >
              Hủy
            </Button>
          )}
          {!isSearchFocused && onNewChat && (
            <Button
              onClick={onNewChat}
              variant="ghost"
              size="md"
              icon={<UserPlus size={20} />}
              title="Tạo cuộc trò chuyện mới"
              className="text-primary hover:bg-primary-light flex-shrink-0"
            />
          )}
        </div>
      </div>

      {/* Navigation Tabs - Hidden when searching or has search term */}
      {!isSearchFocused && !searchTerm && (
        <div className="flex-shrink-0 flex items-center px-4 h-12 border-b border-border-light bg-bg-primary">
          <Button
            variant="ghost"
            onClick={() => onViewModeChange?.('normal')}
            className={`flex-1 h-full relative hover:!bg-transparent hover:!text-current ${
              viewMode === 'normal' ? 'text-primary' : 'text-text-tertiary'
            }`}
          >
            Tất cả
            {viewMode === 'normal' && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-t-full" />
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onViewModeChange?.('archived')}
            className={`flex-1 h-full relative hover:!bg-transparent hover:!text-current ${
              viewMode === 'archived' ? 'text-primary' : 'text-text-tertiary'
            }`}
          >
            Lưu trữ
            {viewMode === 'archived' && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-t-full" />
            )}
          </Button>
        </div>
      )}

      {/* Conversations List / Search Results */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="p-2">
            {[...Array(5)].map((_, i) => (
              <ConversationItem.Skeleton key={i} />
            ))}
          </div>
        ) : isSearchFocused ? (
          <SearchResults
            searchTerm={searchTerm}
            results={searchResults}
            currentUserId={currentUserId}
            selectedId={selectedId}
            history={searchHistory}
            onSelectConversation={(id) => {
              onSelectConversation(id);
              onSearchFocus?.(false);
            }}
            onSelectUser={(user) => {
              onSelectUser?.(user);
              onSearchFocus?.(false);
            }}
            onRemoveFromHistory={onRemoveFromHistory || (() => {})}
            onClearHistory={onClearHistory || (() => {})}
            isLoading={isLoading && searchTerm !== ''}
          />
        ) : sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
              <Users size={32} className="text-text-tertiary" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {searchTerm ? 'Không tìm thấy' : 'Chưa có cuộc trò chuyện'}
            </h3>
            <p className="text-sm text-text-secondary">
              {searchTerm 
                ? 'Thử tìm kiếm với từ khóa khác' 
                : 'Bắt đầu trò chuyện với bạn bè của bạn'}
            </p>
          </div>
        ) : (
          <div>
            {sortedConversations.map((conversation) => {
              const partnerId = conversation.isGroup 
                ? null 
                : conversation.participantIds.find(id => id !== currentUserId);
              
              return (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === selectedId}
                  currentUserId={currentUserId}
                  onClick={() => onSelectConversation(conversation.id)}
                  onPin={() => onPin(conversation.id, !conversation.pinned)}
                  onMute={() => onMute(conversation.id, !conversation.muted)}
                  onDelete={() => onDelete(conversation.id)}
                  onBlock={partnerId && onBlock ? () => onBlock(partnerId) : undefined}
                  onArchive={onArchive ? () => onArchive(conversation.id, !conversation.archived) : undefined}
                  onMarkUnread={onMarkUnread ? () => onMarkUnread(conversation.id, !conversation.markedUnread) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
