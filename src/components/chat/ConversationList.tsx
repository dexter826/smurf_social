import React, { useState, useMemo } from 'react';
import { Search, Users, X, UserPlus, ChevronDown, MessageCircle } from 'lucide-react';
import { Conversation, User } from '../../types';
import { Input, Button, IconButton } from '../ui';
import { ConversationItem } from './ConversationItem';
import { SearchResults } from './SearchResults';
import { Dropdown } from '../ui/Dropdown';
import { MoreVertical, Archive, CheckCircle2 } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  currentUserId: string;
  currentUserFriendIds?: string[];
  blockedUserIds?: string[];
  isLoading: boolean;
  isRevalidating?: boolean;
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
  onMarkAllRead?: () => void;
}

type FilterType = 'all' | 'group';

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  currentUserId,
  currentUserFriendIds = [],
  blockedUserIds = [],
  isLoading,
  isRevalidating = false,
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
  onClearHistory,
  onMarkAllRead
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [requestsExpanded, setRequestsExpanded] = useState(true);

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

  // Phân loại conversations: bạn bè vs người lạ
  const { friendConversations, requestConversations, sortedConversations } = useMemo(() => {
    const filtered = conversations.filter(conv => {
      if (conv.isGroup) return true;
      const partnerId = conv.participantIds.find(id => id !== currentUserId);
      return !partnerId || !blockedUserIds.includes(partnerId);
    });

    const friends: Conversation[] = [];
    const requests: Conversation[] = [];

    filtered.forEach(conv => {
      if (conv.isGroup) {
        friends.push(conv);
      } else {
        const partnerId = conv.participantIds.find(id => id !== currentUserId);
        if (partnerId && currentUserFriendIds.includes(partnerId)) {
          friends.push(conv);
        } else {
          requests.push(conv);
        }
      }
    });

    const sortFn = (a: Conversation, b: Conversation) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    };

    return {
      friendConversations: friends.sort(sortFn),
      requestConversations: requests.sort(sortFn),
      sortedConversations: filtered.sort(sortFn)
    };
  }, [conversations, currentUserId, currentUserFriendIds, blockedUserIds]);

  // Lấy danh sách hiển thị theo viewMode và Filter
  const displayConversations = useMemo(() => {
    let list = viewMode === 'archived' ? conversations.filter(c => c.archived) : sortedConversations;
    
    // Nếu đang xem danh sách chính, áp dụng thêm Filter Nhóm
    if (viewMode === 'normal' && activeFilter === 'group') {
      list = list.filter(c => c.isGroup);
    }
    
    return list;
  }, [viewMode, sortedConversations, conversations, activeFilter, currentUserId]);

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'group', label: 'Nhóm' },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-bg-primary border-r border-border-light transition-theme">
      {/* Header danh sách */}
      <div className="flex-shrink-0 px-3 h-[72px] flex items-center border-b border-border-light gap-1.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="relative flex-1 flex items-center">
            <Input
              icon={<Search size={16} />}
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => onSearchFocus?.(true)}
              className="bg-bg-secondary text-sm pr-10"
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
          </div>

        <div className="flex items-center">
          {!isSearchFocused && !searchTerm && (
            <>
              {onNewGroup && (
                <IconButton
                  onClick={onNewGroup}
                  variant="ghost"
                  size="md"
                  icon={<Users size={20} />}
                  title="Tạo nhóm mới"
                  className="text-primary hover:bg-primary-light"
                />
              )}
              {onNewChat && (
                <IconButton
                  onClick={onNewChat}
                  variant="ghost"
                  size="md"
                  icon={<UserPlus size={20} />}
                  title="Tạo cuộc trò chuyện mới"
                  className="text-primary hover:bg-primary-light"
                />
              )}
            </>
          )}

        {/* Menu ba chấm cho các hành động bổ sung */}
        <Dropdown
          align="right"
          trigger={
            <IconButton 
              icon={<MoreVertical size={20} />} 
              variant="ghost" 
              className="text-text-secondary hover:bg-bg-secondary"
            />
          }
        >
          <div className="py-1">
            <button
              onClick={() => onViewModeChange?.(viewMode === 'archived' ? 'normal' : 'archived')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <Archive size={18} className="text-text-tertiary" />
              {viewMode === 'archived' ? 'Quay lại tin nhắn' : 'Tin nhắn đã lưu trữ'}
              {archivedCount > 0 && (
                <span className="ml-auto text-xs bg-bg-tertiary px-1.5 py-0.5 rounded text-text-secondary">
                  {archivedCount}
                </span>
              )}
            </button>
            {onMarkAllRead && (
              <button
                onClick={onMarkAllRead}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
              >
                <CheckCircle2 size={18} className="text-text-tertiary" />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
        </Dropdown>
      </div>
    </div>

      {/* Tabs điều hướng theo Filter */}
      {!isSearchFocused && !searchTerm && viewMode === 'normal' && (
        <div className="flex-shrink-0 flex items-center px-4 h-12 border-b border-border-light bg-bg-primary">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant="ghost"
              onClick={() => setActiveFilter(filter.id)}
              className={`flex-1 h-full relative hover:!bg-transparent hover:!text-current transition-colors ${
                activeFilter === filter.id ? 'text-primary' : 'text-text-tertiary'
              }`}
            >
              {filter.label}
              {activeFilter === filter.id && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-t-full" />
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Header cho chế độ xem Lưu trữ */}
      {viewMode === 'archived' && (
        <div className="flex-shrink-0 flex items-center px-4 h-12 bg-bg-secondary border-b border-border-light">
          <span className="text-sm font-bold text-text-secondary flex items-center gap-2">
            <Archive size={16} />
            Hội thoại đã lưu trữ
          </span>
        </div>
      )}


      {/* Danh sách hội thoại / Kết quả tìm kiếm */}
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
            conversations={conversations}
          />
        ) : (friendConversations.length === 0 && requestConversations.length === 0) ? (
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
            {/* Section Tin nhắn chờ (chỉ hiện khi viewMode = normal và đang ở filter Tất cả) */}
            {viewMode === 'normal' && activeFilter === 'all' && requestConversations.length > 0 && (
              <>
                <button
                  onClick={() => setRequestsExpanded(!requestsExpanded)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-bg-tertiary border-b border-border-light hover:bg-bg-hover transition-theme"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <MessageCircle size={16} className="text-primary" />
                    Tin nhắn chờ
                    <span className="text-[10px] bg-primary text-text-on-primary px-1.5 py-0.5 rounded-full min-w-[18px]">
                      {requestConversations.length}
                    </span>
                  </span>
                  <ChevronDown 
                    size={16} 
                    className={`text-text-secondary transition-transform duration-200 ${requestsExpanded ? 'rotate-180' : ''}`} 
                  />
                </button>
                
                {requestsExpanded && (
                  <div>
                    {requestConversations.map((conversation) => {
                      const partnerId = conversation.participantIds.find(id => id !== currentUserId);
                      return (
                        <ConversationItem
                          key={conversation.id}
                          conversation={conversation}
                          isActive={conversation.id === selectedId}
                          currentUserId={currentUserId}
                          currentUserFriendIds={currentUserFriendIds}
                          showMessageRequestBadge={false}
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
              </>
            )}

            {/* Danh sách conversations chính */}
            {displayConversations.map((conversation) => {
              // Nếu đang ở filter Tất cả và viewMode normal, bỏ qua các tin nhắn chờ đã hiện ở trên
              if (viewMode === 'normal' && activeFilter === 'all') {
                const partnerId = conversation.participantIds.find(id => id !== currentUserId);
                const isRequest = !conversation.isGroup && partnerId && !currentUserFriendIds.includes(partnerId);
                if (isRequest) return null;
              }

              const partnerId = conversation.isGroup 
                ? null 
                : conversation.participantIds.find(id => id !== currentUserId);
              
              return (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === selectedId}
                  currentUserId={currentUserId}
                  currentUserFriendIds={currentUserFriendIds}
                  showMessageRequestBadge={false}
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
