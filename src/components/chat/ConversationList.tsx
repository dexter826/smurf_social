import React, { useState } from 'react';
import { Search, Users, ArrowLeft, Archive } from 'lucide-react';
import { Conversation } from '../../types';
import { Input, Spinner } from '../ui';
import { ConversationItem } from './ConversationItem';

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
  viewMode?: 'normal' | 'archived';
  archivedCount?: number;
  onViewModeChange?: (mode: 'normal' | 'archived') => void;
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
  viewMode = 'normal',
  archivedCount = 0,
  onViewModeChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  // Filter bỏ cuộc trò chuyện với người bị chặn, sau đó sắp xếp
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
          <Input
            icon={<Search size={16} />}
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="bg-bg-secondary border-none h-10 text-sm"
            containerClassName="flex-1"
          />
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="p-2 text-primary hover:bg-primary-light rounded-xl transition-all"
              title="Tạo cuộc trò chuyện mới"
            >
              <Users size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex-shrink-0 flex items-center px-4 h-12 border-b border-border-light bg-bg-primary">
        <button
          onClick={() => onViewModeChange?.('normal')}
          className={`flex-1 flex items-center justify-center h-full text-sm font-medium transition-all relative ${
            viewMode === 'normal' ? 'text-primary' : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          Tất cả
          {viewMode === 'normal' && (
            <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => onViewModeChange?.('archived')}
          className={`flex-1 flex items-center justify-center h-full text-sm font-medium transition-all relative ${
            viewMode === 'archived' ? 'text-primary' : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          Lưu trữ
          {viewMode === 'archived' && (
            <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Spinner size="md" />
          </div>
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
